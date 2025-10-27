import OpenAI from 'openai';
import { writeFile } from '@tauri-apps/plugin-fs';
import { invoke } from '@tauri-apps/api/core';
import type { OpenAIVideoJobResponse } from '@/types/openai';

let openaiClient: OpenAI | null = null;

function getClient(apiKey: string): OpenAI {
  if (!openaiClient || openaiClient.apiKey !== apiKey) {
    openaiClient = new OpenAI({
      apiKey,
      // tauri uses local webview, so allowing calling openai from frontend.
      dangerouslyAllowBrowser: true,
    });
  }
  return openaiClient;
}


export async function createVideo(
  apiKey: string,
  params: {
    model: string;
    prompt: string;
    size?: string;
    seconds?: string;
    inputReferencePath?: string;
  }
): Promise<string> {
  const client = getClient(apiKey);

  try {
    const requestParams: any = {
      model: params.model,
      prompt: params.prompt,
    };

    if (params.size) {
      requestParams.size = params.size;
    }

    if (params.seconds) {
      requestParams.seconds = params.seconds;
    }

    if (params.inputReferencePath && params.size) {
      // Parse target dimensions from size (e.g., "1280x720")
      const [widthStr, heightStr] = params.size.split('x');
      const targetWidth = parseInt(widthStr, 10);
      const targetHeight = parseInt(heightStr, 10);

      if (targetWidth && targetHeight) {
        // Use Rust to resize the image in-place for optimal quality
        // This modifies the file on disk to match video dimensions
        await invoke('resize_image_for_video', {
          imagePath: params.inputReferencePath,
          targetWidth,
          targetHeight,
        });

        // Now the file is resized, pass the path to OpenAI SDK
        // The SDK will read and upload it
        requestParams.input_reference = params.inputReferencePath;
      }
    }

    const response = await client.videos.create(requestParams);

    return response.id;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to create video: ${errorMessage}`);
  }
}

export async function getVideoStatus(
  apiKey: string,
  videoId: string
): Promise<OpenAIVideoJobResponse> {
  const client = getClient(apiKey);

  try {
    const response = await client.videos.retrieve(videoId);

    return {
      id: response.id,
      completed_at: response.completed_at ?? undefined,
      created_at: response.created_at ?? undefined,
      error: response.error ?? undefined,
      expires_at: response.expires_at ?? undefined,
      model: response.model ?? undefined,
      object: response.object ?? undefined,
      progress: response.progress ?? undefined,
      remixed_from_video_id: response.remixed_from_video_id ?? undefined,
      seconds: response.seconds ?? undefined,
      size: response.size ?? undefined,
      status: response.status as any ?? undefined,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to get video status: ${errorMessage}`);
  }
}

export async function downloadVideo(
  apiKey: string,
  videoId: string,
  savePath: string
): Promise<void> {
  try {
    // First check if video is completed
    const status = await getVideoStatus(apiKey, videoId);

    if (status.status !== 'completed') {
      throw new Error(`Video is not ready for download. Status: ${status.status}`);
    }

    const client = getClient(apiKey);

    const response = await client.videos.downloadContent(videoId);

    if (!response.ok) {
      throw new Error(`Failed to download video: HTTP ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    await writeFile(savePath, uint8Array);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to download video: ${errorMessage}`);
  }
}

export async function remixVideo(
  apiKey: string,
  videoId: string,
  remixPrompt: string
): Promise<string> {
  const client = getClient(apiKey);

  try {
    const response = await client.videos.remix(videoId, {
      prompt: remixPrompt,
    });

    return response.id;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to remix video: ${errorMessage}`);
  }
}
