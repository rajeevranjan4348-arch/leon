/**
 * FLUX Inference Engine
 * 
 * Implements Black Forest Labs FLUX (https://github.com/black-forest-labs/flux)
 * image generation inference workflows, prompt enhancement, aspect ratio mapping,
 * and inference fallback execution.
 */

import { generateFluxImage, BFLGenerateOptions, BFLResponse } from '../bfl';

export interface FluxInferenceRequest {
  prompt: string;
  model?: 'flux-pro-1.1' | 'flux-dev' | 'flux-schnell';
  aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
  enhancePrompt?: boolean;
}

export interface FluxInferenceResult {
  success: boolean;
  imageUrl?: string;
  modelUsed: string;
  promptUsed: string;
  width: number;
  height: number;
  error?: string;
}

export class FluxInferenceEngine {
  private static instance: FluxInferenceEngine;

  private constructor() {}

  public static getInstance(): FluxInferenceEngine {
    if (!FluxInferenceEngine.instance) {
      FluxInferenceEngine.instance = new FluxInferenceEngine();
    }
    return FluxInferenceEngine.instance;
  }

  /**
   * Maps standard aspect ratios to exact FLUX pixel dimensions.
   */
  public resolveDimensions(aspectRatio: '1:1' | '16:9' | '9:16' | '4:3' | '3:4' = '1:1'): { width: number; height: number } {
    switch (aspectRatio) {
      case '16:9':
        return { width: 1280, height: 720 };
      case '9:16':
        return { width: 720, height: 1280 };
      case '4:3':
        return { width: 1024, height: 768 };
      case '3:4':
        return { width: 768, height: 1024 };
      case '1:1':
      default:
        return { width: 1024, height: 1024 };
    }
  }

  /**
   * Enhances raw user prompt with FLUX-optimized photorealistic design triggers.
   */
  public optimizePrompt(rawPrompt: string): string {
    if (!rawPrompt) return '';
    let prompt = rawPrompt.trim();

    // Check if prompt already contains detailed photography modifiers
    if (!/photorealistic|cinematic|detailed|4k|hyperrealistic|studio lighting/i.test(prompt)) {
      prompt = `${prompt}, hyperrealistic, sharp focus, 8k resolution, professional studio lighting, photorealistic details`;
    }

    return prompt;
  }

  /**
   * Executes FLUX image inference task.
   */
  public async generateImage(request: FluxInferenceRequest): Promise<FluxInferenceResult> {
    const model = request.model || 'flux-schnell';
    const dimensions = this.resolveDimensions(request.aspectRatio);
    const finalPrompt = request.enhancePrompt ? this.optimizePrompt(request.prompt) : request.prompt;

    const bflOptions: BFLGenerateOptions = {
      prompt: finalPrompt,
      model,
      width: dimensions.width,
      height: dimensions.height,
      promptUpsampling: request.enhancePrompt,
    };

    const response: BFLResponse = await generateFluxImage(bflOptions);

    if (response.success && response.imageUrl) {
      return {
        success: true,
        imageUrl: response.imageUrl,
        modelUsed: model,
        promptUsed: finalPrompt,
        width: dimensions.width,
        height: dimensions.height,
      };
    }

    return {
      success: false,
      modelUsed: model,
      promptUsed: finalPrompt,
      width: dimensions.width,
      height: dimensions.height,
      error: response.error || 'FLUX Inference generation failed.',
    };
  }
}

export const fluxInferenceEngine = FluxInferenceEngine.getInstance();
