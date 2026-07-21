import { NextRequest, NextResponse } from "next/server";
import type { ExtractedDashData } from "@/lib/types";

export const runtime = "nodejs";

const DEFAULT_MODEL = "claude-sonnet-5";
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

const EXTRACTION_PROMPT = `You are reading a screenshot from the DoorDash Dasher app showing a summary of a completed "dash" (a work session).

Extract the following fields and respond with ONLY a single JSON object, no markdown fences, no commentary:

{
  "startTime": "HH:MM in 24-hour time the dash started, or null if not visible",
  "endTime": "HH:MM in 24-hour time the dash ended, or null if not visible",
  "dashTimeMinutes": total on-dash/scheduled time in minutes as a number, or null,
  "activeTimeMinutes": total active (in-delivery) time in minutes as a number, or null,
  "earnings": total dollar earnings for the dash as a plain number (no $ sign), or null,
  "deliveries": number of deliveries/orders completed, or null if not shown
}

Notes:
- Times like "3:45 PM" should become "15:45". Times like "8:12 PM" should become "20:12".
- Durations may be shown like "4h 23m", "4:23:00", or "263 min" — convert all to total minutes.
- Earnings may be labeled "Total Pay", "Earnings", "You made", etc. Use the grand total for the dash.
- If a field truly cannot be determined from the image, use null for it rather than guessing.
- Respond with raw JSON only.`;

interface AnthropicContentBlock {
  type: string;
  text?: string;
}

interface AnthropicResponse {
  content: AnthropicContentBlock[];
  error?: { message: string };
}

function extractJSON(text: string): unknown {
  const trimmed = text.trim();
  const fencedMatch = /```(?:json)?\s*([\s\S]*?)```/i.exec(trimmed);
  const candidate = fencedMatch ? fencedMatch[1] : trimmed;
  const firstBrace = candidate.indexOf("{");
  const lastBrace = candidate.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1) throw new Error("No JSON object found in model response");
  return JSON.parse(candidate.slice(firstBrace, lastBrace + 1));
}

function toNumberOrNull(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "" && !Number.isNaN(Number(value))) return Number(value);
  return null;
}

function toStringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Server is missing ANTHROPIC_API_KEY. Set it in your environment to enable screenshot extraction." },
      { status: 500 }
    );
  }

  const formData = await req.formData();
  const file = formData.get("image");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No image file was uploaded." }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "Image is too large (max 10MB)." }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Uploaded file is not an image." }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");
  const mediaType = file.type || "image/png";

  let response: Response;
  try {
    response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || DEFAULT_MODEL,
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
              { type: "text", text: EXTRACTION_PROMPT }
            ]
          }
        ]
      })
    });
  } catch {
    return NextResponse.json({ error: "Failed to reach the Anthropic API." }, { status: 502 });
  }

  if (!response.ok) {
    const body = await response.text();
    return NextResponse.json(
      { error: `Anthropic API error (${response.status}): ${body.slice(0, 500)}` },
      { status: 502 }
    );
  }

  const data = (await response.json()) as AnthropicResponse;
  const text = data.content?.find((block) => block.type === "text")?.text ?? "";

  let parsed: Record<string, unknown>;
  try {
    parsed = extractJSON(text) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { error: "Could not parse a response from the model. Try a clearer screenshot." },
      { status: 502 }
    );
  }

  const result: ExtractedDashData = {
    startTime: toStringOrNull(parsed.startTime),
    endTime: toStringOrNull(parsed.endTime),
    dashTimeMinutes: toNumberOrNull(parsed.dashTimeMinutes),
    activeTimeMinutes: toNumberOrNull(parsed.activeTimeMinutes),
    earnings: toNumberOrNull(parsed.earnings),
    deliveries: toNumberOrNull(parsed.deliveries)
  };

  const missing = Object.entries(result)
    .filter(([key, value]) => key !== "deliveries" && value === null)
    .map(([key]) => key);
  if (missing.length > 0) {
    result.warning = `Could not read: ${missing.join(", ")}. Please fill these in manually.`;
  }

  return NextResponse.json(result);
}
