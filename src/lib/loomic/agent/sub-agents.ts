import { loomicToolRegistry, LoomicToolResult } from "./tools.js";
import type { GeneratedVideo } from "../types.js";

export interface SubAgentTask<T = unknown> {
  subAgentName: string;
  taskDescription: string;
  execute: () => Promise<LoomicToolResult<T>>;
}

export class SubAgentOrchestrator {
  public createVideoSubAgent(prompt: string, model?: string): SubAgentTask<GeneratedVideo> {
    return {
      subAgentName: "video_generate_specialist",
      taskDescription: `Video specialist generating clip for prompt: "${prompt}"`,
      execute: async () => {
        return loomicToolRegistry.generateVideoTool({
          prompt,
          model,
        });
      },
    };
  }

  public createImageSubAgent(prompt: string, model?: string) {
    return {
      subAgentName: "image_generate_specialist",
      taskDescription: `Image specialist generating graphic for prompt: "${prompt}"`,
      execute: async () => {
        return loomicToolRegistry.generateImageTool({
          prompt,
          model,
        });
      },
    };
  }
}

export const subAgentOrchestrator = new SubAgentOrchestrator();
