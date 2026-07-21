import { createWorker } from "tesseract.js";

/**
 * Runs OCR entirely in the browser (WASM, via tesseract.js) — the image
 * never leaves the device and there's no API key or per-request cost.
 */
export async function recognizeText(file: File, onProgress?: (fraction: number) => void): Promise<string> {
  const worker = await createWorker("eng", 1, {
    workerPath: "/tesseract/worker.min.js",
    corePath: "/tesseract/tesseract-core-simd-lstm.wasm.js",
    langPath: "/tessdata",
    logger: (m) => {
      if (m.status === "recognizing text" && onProgress) onProgress(m.progress);
    }
  });
  try {
    const { data } = await worker.recognize(file);
    return data.text;
  } finally {
    await worker.terminate();
  }
}
