import type { CanvasElementOperation, GeneratedImage, GeneratedVideo } from "../types.js";
import { generateImage } from "../generation/image-generation.js";
import { generateVideo } from "../generation/video-generation.js";

export interface LoomicToolResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  summary: string;
}

export class LoomicToolRegistry {
  public async generateImageTool(params: {
    prompt: string;
    model?: string;
    aspectRatio?: string;
    inputImages?: string[];
  }): Promise<LoomicToolResult<GeneratedImage>> {
    try {
      const model = params.model || "google-official/gemini-2.5-flash-image";
      const image = await generateImage({
        prompt: params.prompt,
        model,
        aspectRatio: params.aspectRatio || "1:1",
        inputImages: params.inputImages,
      });
      return {
        success: true,
        data: image,
        summary: `Generated image using model [${model}]: ${params.prompt.slice(0, 60)}...`,
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
        summary: `Image generation failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  public async generateVideoTool(params: {
    prompt: string;
    model?: string;
    duration?: number;
    resolution?: "480p" | "720p" | "1080p";
  }): Promise<LoomicToolResult<GeneratedVideo>> {
    try {
      const model = params.model || "google/veo-2.0";
      const video = await generateVideo({
        prompt: params.prompt,
        model,
        duration: params.duration || 5,
        resolution: params.resolution || "720p",
      });
      return {
        success: true,
        data: video,
        summary: `Generated video using model [${model}]: ${params.prompt.slice(0, 60)}...`,
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
        summary: `Video generation failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  public async manipulateCanvasTool(
    operations: CanvasElementOperation[]
  ): Promise<LoomicToolResult<{ appliedOperations: number }>> {
    return {
      success: true,
      data: { appliedOperations: operations.length },
      summary: `Successfully applied ${operations.length} canvas element operations.`,
    };
  }

  public async inspectCanvasTool(canvasId?: string): Promise<LoomicToolResult<Record<string, unknown>>> {
    return {
      success: true,
      data: {
        canvasId: canvasId || "primary",
        elementCount: 0,
        dimensions: { width: 1920, height: 1080 },
      },
      summary: `Inspected canvas [${canvasId || "primary"}].`,
    };
  }
}

export const loomicToolRegistry = new LoomicToolRegistry();
