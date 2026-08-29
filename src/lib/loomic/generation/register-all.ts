import type { LoomicServerEnv } from "../types.js";
import { GoogleImageProvider } from "./providers/google-image.js";
import { GoogleVideoProvider } from "./providers/google-video.js";
import { MetasoVideoProvider } from "./providers/metaso-video.js";
import { OpenAIImageProvider } from "./providers/openai-image.js";
import { registerImageProvider, registerVideoProvider } from "./registry.js";
import { ReplicateImageProvider } from "./providers/replicate-image.js";

export function registerAllProviders(env: LoomicServerEnv = {}): void {
  const googleKey = env.googleApiKey || (typeof process !== "undefined" ? process.env.GOOGLE_API_KEY : undefined);
  if (googleKey) {
    registerImageProvider(new GoogleImageProvider(googleKey));
    registerVideoProvider(new GoogleVideoProvider(googleKey));
  }

  const openAiKey = env.openAIApiKey || (typeof process !== "undefined" ? process.env.OPENAI_API_KEY : undefined);
  if (openAiKey) {
    registerImageProvider(new OpenAIImageProvider(openAiKey, env.openAIApiBase));
  }

  const replicateToken = env.replicateApiToken || (typeof process !== "undefined" ? process.env.REPLICATE_API_TOKEN : undefined);
  if (replicateToken) {
    registerImageProvider(new ReplicateImageProvider(replicateToken));
  }

  const metasoKey = env.metasoApiKey || (typeof process !== "undefined" ? process.env.METASO_API_KEY : undefined);
  if (metasoKey) {
    registerVideoProvider(new MetasoVideoProvider(metasoKey, env.metasoApiBase));
  }
}
