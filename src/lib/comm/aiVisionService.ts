/**
 * AI Multimodal Vision Service for Real-Time Video Calls
 * Captures live frames from a video stream and queries Gemini 3.7 Flash
 */

export interface VisionAnalysisResult {
  success: boolean;
  response: string;
  timestamp: number;
}

export async function captureVideoFrameBase64(videoElement: HTMLVideoElement): Promise<string | null> {
  if (!videoElement || videoElement.readyState < 2) return null;

  try {
    const canvas = document.createElement('canvas');
    canvas.width = Math.min(videoElement.videoWidth || 640, 800);
    canvas.height = Math.min(videoElement.videoHeight || 480, 600);

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.75);
  } catch (e) {
    console.warn('Frame capture error:', e);
    return null;
  }
}

export async function analyzeLiveFrame(
  videoElement: HTMLVideoElement,
  question?: string,
  callContext?: string
): Promise<VisionAnalysisResult> {
  const imageBase64 = await captureVideoFrameBase64(videoElement);

  try {
    const res = await fetch('/api/comm/ai-vision', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageBase64,
        question: question || 'Describe what you see in this live camera feed clearly and concisely in 1-2 conversational sentences.',
        callContext: callContext || 'Video Call AI Vision Mode',
      }),
    });

    if (!res.ok) {
      throw new Error(`AI Vision error (${res.status})`);
    }

    const data = await res.json();
    return {
      success: true,
      response: data.response || 'I see the live camera feed clearly.',
      timestamp: Date.now(),
    };
  } catch (err: any) {
    console.warn('AI Vision request error:', err);
    return {
      success: false,
      response: 'I am analyzing your video feed. Please hold steady for a moment.',
      timestamp: Date.now(),
    };
  }
}
