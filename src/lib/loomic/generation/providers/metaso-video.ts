import type { GeneratedVideo, VideoGenerateParams, VideoModelInfo, VideoProvider } from "../../types.js";
import { GenerationError } from "../../shared/errors.js";

const METASO_VIDEO_MODELS: readonly VideoModelInfo[] = [
  {
    id: "minimax/h3-v2",
    displayName: "MiniMax H3 V2",
    description: "High performance AI video generation engine with hyper-realistic motion.",
    iconUrl: "https://minimax.io/favicon.ico",
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
      maxInputImages: 2,
    },
  },
];

export class MetasoVideoProvider implements VideoProvider {
  readonly name = "metaso";
  readonly models = METASO_VIDEO_MODELS;
  private apiKey: string;
  private apiBase: string;

  constructor(apiKey: string, apiBase = "https://api.minimax.io/v1") {
    this.apiKey = apiKey;
    this.apiBase = apiBase;
  }

  async generate(params: VideoGenerateParams): Promise<GeneratedVideo> {
    try {
      const response = await fetch(`${this.apiBase}/video_generation`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "video-01",
          prompt: params.prompt,
          first_frame_image: params.inputImages?.[0],
        }),
      });

      if (!response.ok) {
        throw new GenerationError("metaso", "api_error", `HTTP ${response.status} from Metaso MiniMax`);
      }

      const data = await response.json();
      return {
        url: data.file_id || data.url || `https://api.minimax.io/v1/files/${data.task_id}`,
        mimeType: "video/mp4",
        width: 1280,
        height: 720,
        durationSeconds: params.duration || 5,
      };
    } catch (err) {
      if (err instanceof GenerationError) throw err;
      throw new GenerationError("metaso", "api_error", err instanceof Error ? err.message : String(err));
    }
  }
}
