import { z } from 'zod';
import { invoke } from '@tauri-apps/api/core';
import type { SceneSummary, SceneDetails } from '@/hooks/tauri/use-storyboard';
import { sceneImageName } from '@/lib/openai/image';
import { createOpenAI } from '@ai-sdk/openai';

export const SYSTEM_PROMPT = `You are an AI assistant for video storyboarding and editing.

## Your Role
You help users create and manage storyboards for video generation projects. You have direct access to tools that read and modify storyboard files.

## Available Actions
You can help users:
- Create and edit storyboards with multiple scenes
- Update global context (style, tone, characters, setting)
- Modify individual scenes (title, description, duration)
- Generate AI images for scenes based on their descriptions
- Provide creative suggestions for video content

## Storyboard Structure
- **Global context**: Overall style, tone, and setting for the entire video
- **Scenes**: Individual shots with:
  - Title: Short descriptive name
  - Description: What happens in the scene
  - Duration: Must be "4s", "8s", or "12s"

## Tool Usage Guidelines
- When users ask to modify the storyboard, use the available tools to make changes directly
- Always READ first (list_scenes, read_scene, read_global_context) before making changes
- You can execute multiple tools in sequence to complete complex tasks
- After making changes, confirm what you did with specific details
- Be proactive: if a user asks to "make it more dramatic", update both context and scene descriptions

## Output Format
- Use markdown for formatting
- Be concise but specific
- Confirm actions with details (e.g., "Scene 2 duration changed from 4s to 8s")`;

// Factory function to create tools with project context
export function createStoryboardTools(
  projectName: string,
  invalidateStoryboard: () => void,
  apiKey: string,
  getLastGeneratedImage: () => string | null
) {
  const openai = createOpenAI({ apiKey });

  return {
    read_global_context: {
      description: 'Read the global context for the storyboard (style, tone, characters, setting)',
      inputSchema: z.object({}),
      execute: async () => {
        const context = await invoke<string>('read_context', { projectName });
        return context || 'No global context set yet.';
      },
    },
    update_global_context: {
      description: 'Update the global context for the storyboard',
      inputSchema: z.object({
        content: z.string().describe('The new global context'),
      }),
      execute: async ({ content }: { content: string }) => {
        await invoke('write_context', { projectName, content });
        invalidateStoryboard();
        return 'Global context updated successfully.';
      },
    },
    list_scenes: {
      description: 'List all scenes in the storyboard with their titles and durations',
      inputSchema: z.object({}),
      execute: async () => {
        const scenes = await invoke<SceneSummary[]>('list_scenes', { projectName });
        if (scenes.length === 0) {
          return 'No scenes found. The storyboard is empty.';
        }
        return scenes
          .map(
            (s, index) =>
              `Scene ${index + 1} (id: ${s.id}): "${s.title}" (${s.duration})${s.hasReferenceImage ? ' [has image]' : ''}`
          )
          .join('\n');
      },
    },
    read_scene: {
      description: 'Read the full details of a specific scene',
      inputSchema: z.object({
        scene_id: z.string().describe('The ID of the scene to read'),
      }),
      execute: async ({ scene_id }: { scene_id: string }) => {
        const scene = await invoke<SceneDetails>('read_scene', {
          projectName,
          sceneId: scene_id,
        });
        return `Scene ${scene.title} (${scene.duration})\n\n${scene.description}${scene.hasReferenceImage ? '\n\n[Has reference image]' : ''}`;
      },
    },
    update_scene: {
      description: "Update a scene's title, description, or duration",
      inputSchema: z.object({
        scene_id: z.string().describe('The ID of the scene to update'),
        title: z.string().optional().describe('New title for the scene'),
        description: z.string().optional().describe('New description for the scene'),
        duration: z.enum(['4s', '8s', '12s']).optional().describe('New duration (4s, 8s, or 12s)'),
      }),
      execute: async ({
        scene_id,
        title,
        description,
        duration,
      }: {
        scene_id: string;
        title?: string;
        description?: string;
        duration?: string;
      }) => {
        // Read current scene first
        const scene = await invoke<SceneDetails>('read_scene', {
          projectName,
          sceneId: scene_id,
        });

        // Use provided values or keep existing
        const newTitle = title || scene.title;
        const newDescription = description || scene.description;
        const newDuration = duration || scene.duration;

        await invoke('write_scene', {
          projectName,
          sceneId: scene_id,
          title: newTitle,
          description: newDescription,
          duration: newDuration,
          order: scene.order,
        });

        invalidateStoryboard();
        return `Scene ${scene_id} updated successfully.`;
      },
    },
    create_scene: {
      description: 'Create a new scene in the storyboard',
      inputSchema: z.object({
        scene_id: z.string().describe('The ID for the new scene (use next numeric ID)'),
        title: z.string().describe('Title of the scene'),
        description: z.string().describe('Description of what happens in the scene'),
        duration: z.enum(['4s', '8s', '12s']).describe('Duration of the scene'),
      }),
      execute: async ({
        scene_id,
        title,
        description,
        duration,
      }: {
        scene_id: string;
        title: string;
        description: string;
        duration: string;
      }) => {
        await invoke('write_scene', {
          projectName,
          sceneId: scene_id,
          title,
          description,
          duration,
        });
        invalidateStoryboard();
        return `Scene ${scene_id} created successfully.`;
      },
    },
    delete_scene: {
      description: 'Delete a scene from the storyboard',
      inputSchema: z.object({
        scene_id: z.string().describe('The ID of the scene to delete'),
      }),
      execute: async ({ scene_id }: { scene_id: string }) => {
        await invoke('delete_scene', { projectName, sceneId: scene_id });
        invalidateStoryboard();
        return `Scene ${scene_id} deleted successfully.`;
      },
    },
    image_generation: openai.tools.imageGeneration({
      outputFormat: 'webp',
    }),
    save_image: {
      description: 'Save the last generated image to a scene. Must be called after generating an image with image_generation.',
      inputSchema: z.object({
        scene_id: z.string().describe('The scene ID to save the image to'),
      }),
      execute: async ({ scene_id }: { scene_id: string }) => {
        const base64Image = getLastGeneratedImage();
        if (!base64Image) {
          return 'Error: No image has been generated yet. Generate an image first using image_generation.';
        }

        try {
          const imagePath = await invoke<string>('save_image', {
            projectName,
            imageName: sceneImageName(scene_id),
            imageData: base64Image,
          });

          invalidateStoryboard();
          return `Image saved successfully to scene ${scene_id} at: ${imagePath}`;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          return `Failed to save image: ${errorMessage}`;
        }
      },
    },
  };
}
