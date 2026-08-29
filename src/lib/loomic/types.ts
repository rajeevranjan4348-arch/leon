/**
 * Loomic System & AI Agent Core Types
 * Pure non-UI backend contract definitions ported from Loomic
 */

import { z } from "zod";

export type ImageQuality = "standard" | "hd" | "ultra";
export type OutputFormat = "png" | "jpg" | "webp";

export interface ModelInfo {
  id: string;
  displayName: string;
  description: string;
  iconUrl?: string;
  provider?: string;
}

export interface VideoPriceRate {
  resolution: "720p" | "1080p";
  displayResolution: string;
  providerPointsPerSecond: number;
  cnyPerSecond: {
    min: number;
    max: number;
  };
}

export interface VideoPricingInfo {
  currency: "CNY";
  billingUnit: "generated_second";
  providerPointsName: string;
  evidenceDate: string;
  rates: readonly VideoPriceRate[];
}

export interface VideoModelInfo extends ModelInfo {
  capabilities: {
    textToVideo: boolean;
    imageToVideo: boolean;
    videoToVideo: boolean;
    audio: boolean;
  };
  limits: {
    maxDuration: number;
    allowedDurations?: number[];
    maxResolution: "480p" | "720p" | "1080p" | "2160p";
    maxInputImages: number;
  };
  pricing?: VideoPricingInfo;
}

export interface ImageGenerateParams {
  prompt: string;
  model: string;
  aspectRatio?: string;
  inputImages?: string[];
  quality?: ImageQuality;
  outputFormat?: OutputFormat;
  metadata?: Record<string, unknown>;
}

export interface GeneratedImage {
  url: string;
  mimeType: string;
  width: number;
  height: number;
}

export interface ImageProvider {
  readonly name: string;
  readonly models: readonly ModelInfo[];
  generate(params: ImageGenerateParams): Promise<GeneratedImage>;
}

export interface VideoGenerateParams {
  prompt: string;
  model: string;
  resolution?: "480p" | "720p" | "1080p";
  duration?: number;
  aspectRatio?: string;
  inputImages?: string[];
  inputVideo?: string;
  enableAudio?: boolean;
}

export interface GeneratedVideo {
  url: string;
  mimeType: string;
  width: number;
  height: number;
  durationSeconds: number;
}

export interface VideoProvider {
  readonly name: string;
  readonly models: readonly VideoModelInfo[];
  generate(params: VideoGenerateParams): Promise<GeneratedVideo>;
}

export interface LoomicServerEnv {
  openAIApiKey?: string;
  openAIApiBase?: string;
  googleApiKey?: string;
  googleVertexProject?: string;
  googleVertexLocation?: string;
  googleVertexVideoLocation?: string;
  replicateApiToken?: string;
  metasoApiKey?: string;
  metasoApiBase?: string;
  volcesApiKey?: string;
  volcesBaseUrl?: string;
  agentModel?: string;
}

export interface CanvasElementOperation {
  action: "move" | "resize" | "delete" | "update_style" | "add_text" | "add_shape" | "add_line" | "update_text" | "align" | "distribute" | "reorder";
  elementId?: string;
  label?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  strokeColor?: string;
  backgroundColor?: string;
  opacity?: number;
  fontSize?: number;
  strokeWidth?: number;
  startElementId?: string;
  endElementId?: string;
  alignType?: "left" | "right" | "center" | "top" | "bottom" | "middle";
  distributeType?: "horizontal" | "vertical";
  layerOrder?: "front" | "back";
}

export interface LoomicAgentRunOptions {
  prompt: string;
  canvasState?: string;
  inputImages?: string[];
  modelPreference?: string;
  brandKitId?: string;
  workspaceSkills?: Array<{
    name: string;
    description: string;
    path: string;
    content: string;
  }>;
}
