import { speakTextWithPersona, stopTTS, getTTSState, TTSState } from './voiceService';

export class TTSStreamer {
  private queue: string[] = [];
  private isProcessing = false;
  private lastSpokenIndex = 0;

  public appendContent(content: string, isFinished: boolean) {
    // split content into sentences
    // ...
  }
}
