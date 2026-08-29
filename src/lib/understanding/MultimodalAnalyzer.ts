import { MultimodalContextInfo } from './types';

export class MultimodalAnalyzer {
  /**
   * Analyzes attached media inputs and maps them into actionable multimodal understanding context.
   */
  public static analyzeMedia(attachments: any[] = [], userQuery = ''): MultimodalContextInfo {
    if (!attachments || attachments.length === 0) {
      return {
        hasMedia: false,
        mediaCount: 0,
        mediaTypes: [],
      };
    }

    const mediaTypes: string[] = [];
    let hasImage = false;
    let hasVideo = false;
    let hasDocument = false;
    let hasAudio = false;

    for (const item of attachments) {
      const mime = (item.mimeType || item.type || '').toLowerCase();
      if (mime.startsWith('image/')) {
        hasImage = true;
        if (!mediaTypes.includes('image')) mediaTypes.push('image');
      } else if (mime.startsWith('video/')) {
        hasVideo = true;
        if (!mediaTypes.includes('video')) mediaTypes.push('video');
      } else if (mime.startsWith('audio/')) {
        hasAudio = true;
        if (!mediaTypes.includes('audio')) mediaTypes.push('audio');
      } else if (mime.includes('pdf') || mime.includes('document') || mime.includes('text') || mime.includes('csv') || mime.includes('json')) {
        hasDocument = true;
        if (!mediaTypes.includes('document')) mediaTypes.push('document');
      }
    }

    let detectedVisualIntent = 'General Inspection';
    let suggestedAction = 'Analyze provided media details';

    const lowerQuery = userQuery.toLowerCase();
    if (hasImage) {
      if (/\b(read|ocr|extract text|transcribe|words in|text in)\b/i.test(lowerQuery)) {
        detectedVisualIntent = 'OCR / Text Extraction';
        suggestedAction = 'Extract and transcribe visible text and numbers from the image accurately.';
      } else if (/\b(error|bug|issue|problem|stack trace|fix|why failing)\b/i.test(lowerQuery)) {
        detectedVisualIntent = 'Screenshot Debugging';
        suggestedAction = 'Identify the error code, UI discrepancy, or bug displayed in the screenshot and provide the resolution.';
      } else if (/\b(describe|what is in|explain|identify|who is|what animal|what object)\b/i.test(lowerQuery)) {
        detectedVisualIntent = 'Object & Scene Recognition';
        suggestedAction = 'Describe key entities, visual components, context, and visual elements in detail.';
      } else if (/\b(chart|graph|diagram|plot|table|numbers)\b/i.test(lowerQuery)) {
        detectedVisualIntent = 'Chart & Diagram Analysis';
        suggestedAction = 'Parse axes, data trends, values, and architectural flow from the visual chart.';
      }
    } else if (hasVideo) {
      detectedVisualIntent = 'Video Timeline Progression';
      suggestedAction = 'Analyze sequential visual frames, scene transitions, movement, and key timestamped actions.';
    } else if (hasDocument) {
      detectedVisualIntent = 'Document & Data Parsing';
      suggestedAction = 'Extract tabular information, key sections, summaries, and exact figures from the uploaded document.';
    }

    return {
      hasMedia: true,
      mediaCount: attachments.length,
      mediaTypes,
      detectedVisualIntent,
      suggestedAction,
    };
  }
}
