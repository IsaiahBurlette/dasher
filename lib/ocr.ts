import { createWorker } from "tesseract.js";

/**
 * Runs OCR entirely in the browser (WASM, via tesseract.js) — the image
 * never leaves the device and there's no API key or per-request cost.
 *
 * langPath serves the raw (non-gzipped) traineddata file with gzip:false.
 * Android's APK packaging silently gunzips and strips the ".gz" suffix from
 * any asset named "*.gz", which 404s the gzip-named request tesseract.js
 * would otherwise make — and a tesseract.js bug means that failure hangs
 * createWorker() forever instead of rejecting it, so this must stay in sync
 * with whatever file actually ships in public/tessdata.
 */
export async function recognizeText(file: File, onProgress?: (fraction: number) => void): Promise<string> {
  const worker = await withTimeout(
    createWorker("eng", 1, {
      workerPath: "/tesseract/worker.min.js",
      corePath: "/tesseract/tesseract-core-simd-lstm.wasm.js",
      langPath: "/tessdata",
      gzip: false,
      logger: (m) => {
        if (m.status === "recognizing text" && onProgress) onProgress(m.progress);
      }
    }),
    45000,
    "Timed out starting the on-device text reader."
  );
  try {
    const { data } = await withTimeout(worker.recognize(file), 45000, "Timed out reading that screenshot.");
    return data.text;
  } finally {
    await worker.terminate();
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}
