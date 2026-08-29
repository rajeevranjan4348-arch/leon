import type { GeneratedVideo, VideoGenerateParams } from "../types.js";
import { getVideoProvider, resolveVideoProviderName } from "./registry.js";

export async function generateVideo(params: VideoGenerateParams): Promise<GeneratedVideo> {
  const providerName = resolveVideoProviderName(params.model);
  const provider = getVideoProvider(providerName);
  return provider.generate(params);
}
