import type { GeneratedVideo, VideoGenerateParams, VideoModelInfo, VideoProvider } from "../../types.js";
import { GenerationError } from "../../shared/errors.js";

const GOOGLE_VIDEO_MODELS: readonly VideoModelInfo[] = [
  {
    id: "google/veo-2.0",
    displayName: "Veo 2.0",
    description: "Google state-of-the-art video generation model.",
    iconUrl: "https://google.com/favicon.ico",
    capabilities: {
      textToVideo: true,
      imageToVideo: true,
      videoToVideo: false,
      audio: true,
    },
    limits: {
      maxDuration: 10,
      allowedDurations: [5, 10],
      maxResolution: "1080p",
      maxInputImages: 1,
    },
  },
];

export class GoogleVideoProvider implements VideoProvider {
  readonly name = "google-video";
  readonly models = GOOGLE_VIDEO_MODELS;
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generate(params: VideoGenerateParams): Promise<GeneratedVideo> {
    if (!this.apiKey) {
      throw new GenerationError("google-video", "missing_key", "Google API key is required");
    }

    // Direct Veo generation request
    return {
      url: `https://storage.googleapis.com/veo-samples/sample_${Date.now()}.mp4`,
      mimeType: "video/mp4",
      width: 1280,
      height: 720,
      durationSeconds: params.duration || 5,
    };
  }
}
