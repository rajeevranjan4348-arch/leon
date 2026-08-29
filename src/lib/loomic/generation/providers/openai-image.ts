import OpenAI from "openai";
import type { GeneratedImage, ImageGenerateParams, ImageProvider, ModelInfo } from "../../types.js";
import { aspectRatioToDimensions } from "../utils.js";
import { GenerationError } from "../../shared/errors.js";

const OPENAI_IMAGE_MODELS: readonly ModelInfo[] = [
  {
    id: "openai/dall-e-3",
    displayName: "DALL-E 3",
    description: "OpenAI flagship image generation model with high prompt fidelity.",
    iconUrl: "https://openai.com/favicon.ico",
  },
];

export class OpenAIImageProvider implements ImageProvider {
  readonly name = "openai";
  readonly models = OPENAI_IMAGE_MODELS;
  private client: OpenAI;

  constructor(apiKey: string, baseURL?: string) {
    this.client = new OpenAI({ apiKey, ...(baseURL ? { baseURL } : {}), dangerouslyAllowBrowser: true });
  }

  async generate(params: ImageGenerateParams): Promise<GeneratedImage> {
    const { width, height } = aspectRatioToDimensions(params.aspectRatio ?? "1:1");
    const model = params.model.replace("openai/", "") || "dall-e-3";
    
    try {
      const response = await this.client.images.generate({
        model,
        prompt: params.prompt,
        size: width > height ? "1792x1024" : width < height ? "1024x1792" : "1024x1024",
        n: 1,
      });

      const url = response.data?.[0]?.url;
      if (!url) {
        throw new GenerationError("openai", "no_output", "OpenAI returned no image URL");
      }
      return { url, mimeType: "image/png", width, height };
    } catch (error) {
      if (error instanceof GenerationError) throw error;
      throw new GenerationError(
        "openai",
        "api_error",
        error instanceof Error ? error.message : "Unknown OpenAI error"
      );
    }
  }
}
