/**
 * Qwen Image & Video Generation Library Wrapper
 */

import { QwenService, QwenImageOptions, QwenImageResult, QwenVideoOptions, QwenVideoTaskResult } from './services/qwenService';

export * from './services/qwenService';

export async function generateQwenImage(options: QwenImageOptions): Promise<QwenImageResult> {
  return QwenService.generateImage(options);
}

export async function generateQwenVideo(options: QwenVideoOptions): Promise<QwenVideoTaskResult> {
  return QwenService.generateVideo(options);
}

export async function queryQwenVideo(taskId: string): Promise<QwenVideoTaskResult> {
  return QwenService.queryVideoStatus(taskId);
}
