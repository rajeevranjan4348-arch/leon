import { registerAllProviders } from "./generation/register-all.js";
import { generateImage } from "./generation/image-generation.js";
import { generateVideo } from "./generation/video-generation.js";
import { getAvailableImageModels, getAvailableVideoModels } from "./generation/registry.js";
import { LOOMIC_SYSTEM_PROMPT } from "./agent/prompts.js";
import { workspaceSkillEngine } from "./agent/workspace-skills.js";
import { loomicToolRegistry } from "./agent/tools.ts";
import { subAgentOrchestrator } from "./agent/sub-agents.js";
import type { GeneratedImage, GeneratedVideo, ImageGenerateParams, LoomicAgentRunOptions, LoomicServerEnv, VideoGenerateParams } from "./types.js";

export class LoomicEngine {
  private static instance: LoomicEngine;
  private initialized = false;

  private constructor() {}

  public static getInstance(): LoomicEngine {
    if (!LoomicEngine.instance) {
      LoomicEngine.instance = new LoomicEngine();
    }
    return LoomicEngine.instance;
  }

  public initialize(env: LoomicServerEnv = {}) {
    if (this.initialized) return;
    registerAllProviders(env);
    this.initialized = true;
  }

  public getAvailableImageModels() {
    this.ensureInitialized();
    return getAvailableImageModels();
  }

  public getAvailableVideoModels() {
    this.ensureInitialized();
    return getAvailableVideoModels();
  }

  public async generateImage(params: ImageGenerateParams): Promise<GeneratedImage> {
    this.ensureInitialized();
    return generateImage(params);
  }

  public async generateVideo(params: VideoGenerateParams): Promise<GeneratedVideo> {
    this.ensureInitialized();
    return generateVideo(params);
  }

  public async processAgentTask(options: LoomicAgentRunOptions): Promise<{
    message: string;
    generatedImages?: GeneratedImage[];
    generatedVideos?: GeneratedVideo[];
    providerUsed?: string;
  }> {
    this.ensureInitialized();

    const systemPrompt = workspaceSkillEngine.buildPromptContext(
      LOOMIC_SYSTEM_PROMPT,
      options.workspaceSkills as any
    );

    const lower = options.prompt.toLowerCase();

    // Check if user is asking for video generation
    if (lower.includes("video") || lower.includes("animation") || lower.includes("generate clip")) {
      const videoSubAgent = subAgentOrchestrator.createVideoSubAgent(options.prompt);
      const res = await videoSubAgent.execute();
      if (res.success && res.data) {
        return {
          message: `[Loomic Agent] ${res.summary}`,
          generatedVideos: [res.data],
          providerUsed: "Veo / Metaso Engine",
        };
      }
    }

    // Check if user is asking for image generation
    if (
      lower.includes("image") ||
      lower.includes("picture") ||
      lower.includes("poster") ||
      lower.includes("draw") ||
      lower.includes("illustration") ||
      lower.includes("generate image")
    ) {
      const imgSubAgent = subAgentOrchestrator.createImageSubAgent(options.prompt);
      const res = await imgSubAgent.execute();
      if (res.success && res.data) {
        return {
          message: `[Loomic Agent] ${res.summary}`,
          generatedImages: [res.data],
          providerUsed: "Gemini Imagen / Replicate Engine",
        };
      }
    }

    return {
      message: `[Loomic AI Design System] Evaluated prompt with Loomic system prompt context. System prompt length: ${systemPrompt.length} chars.`,
      providerUsed: "Loomic Core Engine",
    };
  }

  private ensureInitialized() {
    if (!this.initialized) {
      this.initialize();
    }
  }
}

export const loomicEngine = LoomicEngine.getInstance();
