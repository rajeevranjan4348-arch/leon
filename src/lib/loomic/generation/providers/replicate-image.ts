import type { GeneratedImage, ImageGenerateParams, ImageProvider, ModelInfo } from "../../types.js";
import { aspectRatioToDimensions } from "../utils.js";
import { GenerationError } from "../../shared/errors.js";

const REPLICATE_API_BASE = "https://api.replicate.com/v1";

const REPLICATE_IMAGE_MODELS: readonly ModelInfo[] = [
  {
    id: "black-forest-labs/flux-1.1-pro",
    displayName: "Flux 1.1 Pro",
    description: "Next-gen image generation model with high quality and speed.",
    iconUrl: "https://replicate.com/favicon.ico",
  },
  {
    id: "black-forest-labs/flux-schnell",
    displayName: "Flux Schnell",
    description: "Ultra-fast text-to-image generation.",
    iconUrl: "https://replicate.com/favicon.ico",
  },
];

export class ReplicateImageProvider implements ImageProvider {
  readonly name = "replicate";
  readonly models = REPLICATE_IMAGE_MODELS;
  private apiToken: string;

  constructor(apiToken: string) {
    this.apiToken = apiToken;
  }

  async generate(params: ImageGenerateParams): Promise<GeneratedImage> {
    const aspectRatio = params.aspectRatio ?? "1:1";
    const { width, height } = aspectRatioToDimensions(aspectRatio);
    const input: Record<string, unknown> = {
      prompt: params.prompt,
      aspect_ratio: aspectRatio,
    };

    if (params.inputImages?.length) {
      input.input_image = params.inputImages[0];
    }

    try {
      const response = await fetch(
        `${REPLICATE_API_BASE}/models/${params.model}/predictions`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.apiToken}`,
            "Content-Type": "application/json",
            Prefer: "wait",
          },
          body: JSON.stringify({ input }),
        }
      );

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        throw new GenerationError(
          "replicate",
          "api_error",
          `Replicate API error ${response.status}: ${(errorBody as { detail?: string })?.detail ?? "Unknown error"}`
        );
      }

      const data = (await response.json()) as { output: string[] | string; status: string };
      const outputUrl = Array.isArray(data.output) ? data.output[0] : data.output;
      if (!outputUrl) {
        throw new GenerationError("replicate", "no_output", "Replicate returned no output URL");
      }

      return { url: outputUrl, mimeType: "image/png", width, height };
    } catch (error) {
      if (error instanceof GenerationError) throw error;
      throw new GenerationError(
        "replicate",
        "api_error",
        error instanceof Error ? error.message : "Replicate execution failed"
      );
    }
  }
}
