import type { GeneratedImage, ImageGenerateParams } from "../types.js";
import { getImageProvider, resolveImageProviderName } from "./registry.js";

export async function generateImage(params: ImageGenerateParams): Promise<GeneratedImage> {
  const providerName = resolveImageProviderName(params.model);
  const provider = getImageProvider(providerName);
  return provider.generate(params);
}
