import OpenAI from 'openai';
import { writeFile, exists, readFile } from '@tauri-apps/plugin-fs';
import { invoke } from '@tauri-apps/api/core';
import openai from 'openai';
import { debug } from '@tauri-apps/plugin-log';

export enum VideoStatus {
  COMPLETED = 'completed',
  FAILED = 'failed',
  QUEUED = 'queued',
  IN_PROGRESS = 'in_progress',
}

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
  params: openai.Videos.VideoCreateParams
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

    if (params.input_reference && params.size) {
      // Parse target dimensions from size (e.g., "1280x720")
      const [widthStr, heightStr] = params.size.split('x');
      const targetWidth = parseInt(widthStr, 10);
      const targetHeight = parseInt(heightStr, 10);

      if (targetWidth && targetHeight) {
        const imagePath = params.input_reference as any as string;

        await invoke('resize_image', {
          imagePath,
          targetWidth,
          targetHeight,
        });

        const imageBytes = await readFile(imagePath);
        const imageBlob = new Blob([imageBytes], { type: 'image/png' });
        const imageFile = new File([imageBlob], 'reference.png', { type: 'image/png' });

        requestParams.input_reference = imageFile;
      }
    }

    const response = await client.videos.create(requestParams);

    debug(`Video created: ${response.id}`);
    return response.id;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to create video: ${errorMessage}`);
  }
}

export async function getVideoStatus(
  apiKey: string,
  videoId: string
): Promise<openai.Videos.Video> {
  const client = getClient(apiKey);

  try {
    const response = await client.videos.retrieve(videoId);
    debug(`Video status: ${response.status}, progress: ${response.progress} error: ${response.error?.message}`);
    return response;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to get video status: ${errorMessage}`);
  }
}

export async function downloadVideo(
  apiKey: string,
  videoId: string,
  savePath: string,
): Promise<void> {
  try {
    const fileExists = await exists(savePath);
    if (fileExists) {
      debug(`Video already exists at ${savePath}, skipping download`);
      return;
    }

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

    const savePathDir = savePath.split('/').slice(0, -1).join('/');
    await invoke('ensure_dir_exists', { path: savePathDir });

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
