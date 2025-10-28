import { experimental_generateImage as generateImage } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { invoke } from '@tauri-apps/api/core';
import { debug } from '@tauri-apps/plugin-log';

export const GPT_IMAGE_SIZE_OPTIONS = ['1024x1024', '1536x1024', '1024x1536'] as const;
const DEFAULT_SIZE = '1024x1024';
const DEFAULT_MODEL = 'gpt-image-1';

export interface GenerateImageParams {
  prompt: string;
  size?: (typeof GPT_IMAGE_SIZE_OPTIONS)[number];
}

export async function generateAndSaveImage(
  apiKey: string,
  projectName: string,
  imageName: string,
  params: GenerateImageParams
): Promise<string> {
  try {
    const openai = createOpenAI({ apiKey });

    const { image } = await generateImage({
      model: openai.image(DEFAULT_MODEL),
      prompt: params.prompt,
      size: params.size || DEFAULT_SIZE,
    });

    debug(`Image generated successfully for prompt: ${params.prompt.substring(0, 50)}...`);

    const base64 = btoa(
      image.uint8Array.reduce((data: string, byte: number) => data + String.fromCharCode(byte), '')
    );

    const imagePath = await invoke<string>('save_image', {
      projectName,
      imageName,
      imageData: base64,
    });

    debug(`Image saved to: ${imagePath}`);
    return imagePath;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to generate and save image: ${errorMessage}`);
  }
}

export function sceneImageName(sceneId: string): string {
  return `scene_${sceneId}_reference.jpg`;
}