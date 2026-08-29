import { GenerationError } from "../shared/errors.js";

const KNOWN_RATIOS: Record<string, { width: number; height: number }> = {
  "1:1": { width: 1024, height: 1024 },
  "16:9": { width: 1024, height: 576 },
  "9:16": { width: 576, height: 1024 },
  "4:3": { width: 1024, height: 768 },
  "3:4": { width: 768, height: 1024 },
};

function roundTo64(value: number): number {
  return Math.round(value / 64) * 64;
}

export function aspectRatioToDimensions(
  aspectRatio: string,
  baseSize = 1024
): { width: number; height: number } {
  const known = KNOWN_RATIOS[aspectRatio];
  if (known && baseSize === 1024) return known;
  const [wStr, hStr] = aspectRatio.split(":");
  const w = Number(wStr);
  const h = Number(hStr);
  if (!w || !h) return { width: baseSize, height: baseSize };
  const ratio = w / h;
  if (ratio >= 1) {
    return { width: roundTo64(baseSize), height: roundTo64(baseSize / ratio) };
  }
  return { width: roundTo64(baseSize * ratio), height: roundTo64(baseSize) };
}

export async function fetchAsBase64(
  providerName: string,
  url: string
): Promise<{ data: string; mimeType: string }> {
  if (url.startsWith("data:")) {
    const match = url.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) {
      throw new GenerationError(
        providerName,
        "input_fetch_error",
        `Invalid data URI format: ${url.slice(0, 80)}`
      );
    }
    return { mimeType: match[1]!, data: match[2]! };
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new GenerationError(
        providerName,
        "input_fetch_error",
        `Failed to fetch input (HTTP ${response.status}): ${url}`
      );
    }
    const buffer = await response.arrayBuffer();
    const data = btoa(
      new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
    );
    const mimeType = response.headers.get("content-type") ?? "application/octet-stream";
    return { data, mimeType };
  } catch (err) {
    if (err instanceof GenerationError) throw err;
    throw new GenerationError(
      providerName,
      "input_fetch_error",
      `Failed to fetch input: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}
