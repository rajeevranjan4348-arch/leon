/**
 * Native Multimodal Vision + Video Understanding Handler
 * Handles file validation, base64 conversion, image optimization, and video keyframe extraction for Gemini 3.x models.
 */

export interface VideoKeyframe {
  timestamp: number;
  timestampLabel: string;
  base64Data: string;
  mimeType: string;
  dataUrl: string;
}

export interface MultimodalMediaItem {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  type: 'image' | 'video' | 'document' | 'audio';
  dataUrl: string;
  base64Data: string; // Clean base64 string without 'data:...;base64,' prefix
  duration?: number;
  width?: number;
  height?: number;
  videoFrames?: VideoKeyframe[];
  extractedText?: string;
  timestamp: number;
}

const SUPPORTED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/bmp',
  'image/svg+xml',
]);

const SUPPORTED_VIDEO_TYPES = new Set([
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/mov',
  'video/x-matroska',
  'video/ogg',
  'video/3gpp',
]);

const SUPPORTED_DOC_TYPES = new Set([
  'application/pdf',
  'text/plain',
  'text/markdown',
  'text/csv',
  'application/json',
  'text/html',
  'text/javascript',
  'text/typescript',
  'text/css',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);

export function detectMediaType(file: File): {
  isValid: boolean;
  type: 'image' | 'video' | 'document' | 'audio';
  mimeType: string;
  error?: string;
} {
  const mime = (file.type || '').toLowerCase();
  const name = (file.name || '').toLowerCase();

  // 1. Image
  if (SUPPORTED_IMAGE_TYPES.has(mime) || /\.(jpg|jpeg|png|webp|gif|bmp|svg)$/i.test(name)) {
    const finalMime = mime || (
      name.endsWith('.png') ? 'image/png' :
      name.endsWith('.webp') ? 'image/webp' :
      name.endsWith('.gif') ? 'image/gif' :
      'image/jpeg'
    );
    return { isValid: true, type: 'image', mimeType: finalMime };
  }

  // 2. Video
  if (SUPPORTED_VIDEO_TYPES.has(mime) || /\.(mp4|webm|mov|mkv|ogg|3gp)$/i.test(name)) {
    const finalMime = mime || (
      name.endsWith('.webm') ? 'video/webm' :
      name.endsWith('.mov') ? 'video/quicktime' :
      'video/mp4'
    );
    return { isValid: true, type: 'video', mimeType: finalMime };
  }

  // 3. Audio
  if (mime.startsWith('audio/') || /\.(mp3|wav|ogg|aac|flac|m4a)$/i.test(name)) {
    return { isValid: true, type: 'audio', mimeType: mime || 'audio/mpeg' };
  }

  // 4. Document / Code / PDF
  if (
    SUPPORTED_DOC_TYPES.has(mime) ||
    /\.(pdf|txt|md|csv|json|html|js|ts|tsx|jsx|py|java|cpp|c|rs|go|sql|css)$/i.test(name)
  ) {
    const finalMime = mime || (name.endsWith('.pdf') ? 'application/pdf' : 'text/plain');
    return { isValid: true, type: 'document', mimeType: finalMime };
  }

  // Fallback check
  if (file.size > 50 * 1024 * 1024) {
    return {
      isValid: false,
      type: 'document',
      mimeType: mime || 'application/octet-stream',
      error: 'File size exceeds 50MB limit.',
    };
  }

  return {
    isValid: true,
    type: 'document',
    mimeType: mime || 'application/octet-stream',
  };
}

/**
 * Converts a File into a clean Base64 string and dataUrl preview
 */
export async function fileToBase64(file: File): Promise<{ base64Data: string; dataUrl: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64Data = dataUrl.replace(/^data:[^;]+;base64,/, '');
      resolve({ base64Data, dataUrl });
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

/**
 * Optimizes large images for Gemini Vision without quality degradation.
 * Downscales images over 2048px dimension to optimize payload speed and reliability.
 */
export async function optimizeImage(file: File, maxDimension = 2048): Promise<{ base64Data: string; dataUrl: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let { width, height } = img;

      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        // Fallback to direct file conversion
        fileToBase64(file).then(res => resolve({ ...res, width: img.width, height: img.height })).catch(reject);
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
      const dataUrl = canvas.toDataURL(mimeType, 0.92);
      const base64Data = dataUrl.replace(/^data:[^;]+;base64,/, '');

      resolve({ base64Data, dataUrl, width, height });
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      // Fallback
      fileToBase64(file).then(res => resolve({ ...res, width: 0, height: 0 })).catch(reject);
    };

    img.src = objectUrl;
  });
}

/**
 * Extracts keyframes from video files to preserve chronological timeline and scene analysis
 */
export async function extractVideoKeyframes(
  file: File,
  maxFrames = 8
): Promise<{
  duration: number;
  width: number;
  height: number;
  frames: VideoKeyframe[];
}> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    const objectUrl = URL.createObjectURL(file);

    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    video.src = objectUrl;

    const cleanup = () => {
      URL.revokeObjectURL(objectUrl);
      video.remove();
    };

    video.onloadedmetadata = async () => {
      const duration = video.duration || 1;
      const width = video.videoWidth || 640;
      const height = video.videoHeight || 360;

      // Scale frame canvas to max 1280px for high clarity
      const maxDim = 1280;
      let frameW = width;
      let frameH = height;
      if (frameW > maxDim || frameH > maxDim) {
        if (frameW > frameH) {
          frameH = Math.round((frameH * maxDim) / frameW);
          frameW = maxDim;
        } else {
          frameW = Math.round((frameW * maxDim) / frameH);
          frameH = maxDim;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = frameW;
      canvas.height = frameH;
      const ctx = canvas.getContext('2d');

      const frameCount = Math.min(maxFrames, Math.max(3, Math.ceil(duration / 3)));
      const timestamps: number[] = [];

      if (duration <= 2) {
        timestamps.push(0, duration / 2, duration * 0.95);
      } else {
        const step = (duration - 0.2) / (frameCount - 1);
        for (let i = 0; i < frameCount; i++) {
          timestamps.push(Math.min(duration - 0.05, Math.max(0.05, i * step)));
        }
      }

      const frames: VideoKeyframe[] = [];

      const captureFrameAt = (time: number): Promise<VideoKeyframe | null> => {
        return new Promise((res) => {
          let timeoutId: any;
          const onSeeked = () => {
            clearTimeout(timeoutId);
            video.removeEventListener('seeked', onSeeked);
            if (ctx) {
              ctx.drawImage(video, 0, 0, frameW, frameH);
              const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
              const base64Data = dataUrl.replace(/^data:image\/jpeg;base64,/, '');
              const mins = Math.floor(time / 60);
              const secs = (time % 60).toFixed(1).padStart(4, '0');
              const timestampLabel = `${mins.toString().padStart(2, '0')}:${secs}`;

              res({
                timestamp: time,
                timestampLabel,
                base64Data,
                mimeType: 'image/jpeg',
                dataUrl,
              });
            } else {
              res(null);
            }
          };

          timeoutId = setTimeout(() => {
            video.removeEventListener('seeked', onSeeked);
            res(null);
          }, 3000);

          video.addEventListener('seeked', onSeeked, { once: true });
          video.currentTime = time;
        });
      };

      for (const t of timestamps) {
        try {
          const frame = await captureFrameAt(t);
          if (frame) {
            frames.push(frame);
          }
        } catch {
          // Ignore individual frame extraction error
        }
      }

      cleanup();
      resolve({
        duration,
        width,
        height,
        frames,
      });
    };

    video.onerror = () => {
      cleanup();
      resolve({
        duration: 0,
        width: 0,
        height: 0,
        frames: [],
      });
    };
  });
}

/**
 * Fully processes an uploaded file into a rich MultimodalMediaItem
 */
export async function processUploadedFile(
  file: File,
  onProgress?: (stage: string) => void
): Promise<MultimodalMediaItem> {
  const typeInfo = detectMediaType(file);
  const id = `media_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  onProgress?.(`Processing ${file.name}...`);

  if (typeInfo.type === 'image') {
    onProgress?.('Optimizing image for Gemini Vision...');
    const opt = await optimizeImage(file);
    return {
      id,
      name: file.name,
      mimeType: typeInfo.mimeType,
      size: file.size,
      type: 'image',
      dataUrl: opt.dataUrl,
      base64Data: opt.base64Data,
      width: opt.width,
      height: opt.height,
      timestamp: Date.now(),
    };
  }

  if (typeInfo.type === 'video') {
    onProgress?.('Extracting video timeline keyframes...');
    const videoData = await extractVideoKeyframes(file, 8);
    const { base64Data, dataUrl } = await fileToBase64(file);

    return {
      id,
      name: file.name,
      mimeType: typeInfo.mimeType,
      size: file.size,
      type: 'video',
      dataUrl: videoData.frames[0]?.dataUrl || dataUrl,
      base64Data,
      duration: videoData.duration,
      width: videoData.width,
      height: videoData.height,
      videoFrames: videoData.frames,
      timestamp: Date.now(),
    };
  }

  // Audio or Document / Text
  const { base64Data, dataUrl } = await fileToBase64(file);
  let extractedText: string | undefined = undefined;

  if (file.type.startsWith('text/') || /\.(txt|md|csv|json|js|ts|py|html|css)$/i.test(file.name)) {
    try {
      extractedText = await file.text();
    } catch {
      // Ignore text read error
    }
  }

  return {
    id,
    name: file.name,
    mimeType: typeInfo.mimeType,
    size: file.size,
    type: typeInfo.type,
    dataUrl,
    base64Data,
    extractedText,
    timestamp: Date.now(),
  };
}

/**
 * Transforms MultimodalMediaItems into formatted parts for Gemini API contents
 */
export function formatMediaForGemini(mediaItems: MultimodalMediaItem[]): Array<{
  mimeType: string;
  data: string;
  name?: string;
  type?: string;
  description?: string;
}> {
  const parts: Array<{
    mimeType: string;
    data: string;
    name?: string;
    type?: string;
    description?: string;
  }> = [];

  for (const item of mediaItems) {
    if (item.type === 'image') {
      parts.push({
        mimeType: item.mimeType,
        data: item.base64Data,
        name: item.name,
        type: 'image',
      });
    } else if (item.type === 'video') {
      // If we extracted timeline keyframes, include all keyframe image parts with timestamp annotations
      if (item.videoFrames && item.videoFrames.length > 0) {
        item.videoFrames.forEach((frame, idx) => {
          parts.push({
            mimeType: frame.mimeType,
            data: frame.base64Data,
            name: `${item.name} [Frame ${idx + 1}/${item.videoFrames?.length} @ ${frame.timestampLabel}]`,
            type: 'video-frame',
            description: `Video: ${item.name} | Timestamp: ${frame.timestampLabel} (Duration: ${item.duration?.toFixed(1)}s)`,
          });
        });
      } else {
        // Raw video data
        parts.push({
          mimeType: item.mimeType,
          data: item.base64Data,
          name: item.name,
          type: 'video',
        });
      }
    } else if (item.type === 'document') {
      if (item.mimeType === 'application/pdf') {
        parts.push({
          mimeType: 'application/pdf',
          data: item.base64Data,
          name: item.name,
          type: 'document',
        });
      } else if (item.extractedText) {
        // Text is handled in prompt text or document part
        parts.push({
          mimeType: 'text/plain',
          data: btoa(unescape(encodeURIComponent(item.extractedText.slice(0, 50000)))),
          name: item.name,
          type: 'document',
        });
      }
    } else if (item.type === 'audio') {
      parts.push({
        mimeType: item.mimeType,
        data: item.base64Data,
        name: item.name,
        type: 'audio',
      });
    }
  }

  return parts;
}
