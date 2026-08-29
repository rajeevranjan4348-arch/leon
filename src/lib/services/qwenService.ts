/**
 * Qwen & DashScope AI Service
 * Handles high-fidelity image and video generation using Alibaba Qwen / Tongyi Wanx models.
 */

import { getQwenKeyInfo } from '../settings';

export interface QwenImageOptions {
  prompt: string;
  model?: 'wanx2.1-t2i-turbo' | 'wanx2.1-t2i-plus' | 'wanx-v1' | 'qwen-image';
  size?: '1024*1024' | '1280*720' | '720*1280' | '1024*768' | '768*1024';
  aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
  promptExpansion?: boolean;
  customKey?: string;
}

export interface QwenImageResult {
  success: boolean;
  imageUrl: string;
  model: string;
  prompt: string;
  provider?: string;
  error?: string;
}

export interface QwenVideoOptions {
  prompt: string;
  model?: 'wanx2.1-t2v-turbo' | 'wanx-v1' | 'wan2.1-t2v-14b';
  duration?: 5 | 10;
  aspectRatio?: '16:9' | '9:16' | '1:1';
  firstFrameUrl?: string;
  customKey?: string;
}

export interface QwenVideoTaskResult {
  success: boolean;
  taskId: string;
  status: 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED';
  videoUrl?: string;
  progress?: number;
  model?: string;
  error?: string;
}

export class QwenService {
  /**
   * Generates high-resolution images via Qwen/Wanx.
   */
  public static async generateImage(options: QwenImageOptions): Promise<QwenImageResult> {
    const {
      prompt,
      model = 'wanx2.1-t2i-turbo',
      size,
      aspectRatio = '1:1',
      promptExpansion = true,
      customKey,
    } = options;

    const keyInfo = getQwenKeyInfo();
    const effectiveKey = customKey || keyInfo.key;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (effectiveKey) {
      headers['Authorization'] = `Bearer ${effectiveKey}`;
    }

    try {
      const response = await fetch('/api/qwen/image_generation', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          prompt,
          model,
          size,
          aspect_ratio: aspectRatio,
          prompt_expansion: promptExpansion,
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || `Qwen Image Generation failed with status ${response.status}`);
      }

      const data = await response.json();
      return {
        success: Boolean(data.success),
        imageUrl: data.imageUrl,
        model: data.model || model,
        prompt: data.prompt || prompt,
        provider: data.provider || 'qwen-dashscope',
      };
    } catch (error: any) {
      console.error('Qwen Image Generation Error:', error);
      throw error;
    }
  }

  /**
   * Generates video synthesis task using Qwen / Wanx models.
   */
  public static async generateVideo(options: QwenVideoOptions): Promise<QwenVideoTaskResult> {
    const {
      prompt,
      model = 'wanx2.1-t2v-turbo',
      duration = 5,
      aspectRatio = '16:9',
      firstFrameUrl,
      customKey,
    } = options;

    const keyInfo = getQwenKeyInfo();
    const effectiveKey = customKey || keyInfo.key;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (effectiveKey) {
      headers['Authorization'] = `Bearer ${effectiveKey}`;
    }

    try {
      const response = await fetch('/api/qwen/video_generation', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          prompt,
          model,
          duration,
          aspect_ratio: aspectRatio,
          first_frame_url: firstFrameUrl,
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || `Qwen Video Task failed with status ${response.status}`);
      }

      const data = await response.json();
      return {
        success: Boolean(data.success),
        taskId: data.taskId || data.task_id,
        status: data.status || 'PENDING',
        model: data.model || model,
        videoUrl: data.videoUrl,
      };
    } catch (error: any) {
      console.error('Qwen Video Generation Error:', error);
      throw error;
    }
  }

  /**
   * Queries the progress or output of an ongoing Qwen video synthesis task.
   */
  public static async queryVideoStatus(taskId: string, customKey?: string): Promise<QwenVideoTaskResult> {
    const keyInfo = getQwenKeyInfo();
    const effectiveKey = customKey || keyInfo.key;

    const headers: Record<string, string> = {};
    if (effectiveKey) {
      headers['Authorization'] = `Bearer ${effectiveKey}`;
    }

    try {
      const response = await fetch(`/api/qwen/query_video?task_id=${encodeURIComponent(taskId)}`, {
        headers,
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || `Query Qwen Video failed with status ${response.status}`);
      }

      const data = await response.json();
      const status = data.status === 'Success' || data.task_status === 'SUCCEEDED'
        ? 'SUCCEEDED'
        : (data.status === 'Fail' || data.task_status === 'FAILED' ? 'FAILED' : 'RUNNING');

      return {
        success: Boolean(data.success),
        taskId,
        status,
        videoUrl: data.videoUrl,
        progress: data.progress || (status === 'SUCCEEDED' ? 100 : 50),
      };
    } catch (error: any) {
      console.error('Qwen Query Video Error:', error);
      throw error;
    }
  }

  /**
   * Checks Qwen API connectivity and health status.
   */
  public static async checkHealth(): Promise<{ connected: boolean; provider: string; models: string[] }> {
    try {
      const res = await fetch('/api/qwen/health');
      if (res.ok) {
        return await res.json();
      }
      return { connected: false, provider: 'qwen-dashscope', models: [] };
    } catch {
      return { connected: false, provider: 'qwen-dashscope', models: [] };
    }
  }
}

export const qwenService = QwenService;
