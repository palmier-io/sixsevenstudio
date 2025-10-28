import { z } from 'zod';
import { invoke } from '@tauri-apps/api/core';
import type { SceneSummary, SceneDetails } from '@/hooks/tauri/use-storyboard';
import { sceneImageName } from '@/lib/openai/image';
import { createOpenAI } from '@ai-sdk/openai';

export const SYSTEM_PROMPT = `You are an expert director and editor specializing in AI video generation.
You are collaborating with a user, who has the idea and vision for a video, and Sora 2, which you think of as a cinematographer who has never seen your storyboard.
Your job is to help the user create the best prompt for Sora 2 to generate the best video possible.

If you leave out details, Sora 2 will improvise and you may not get what you envisioned.
By being specific about what the “shot” should achieve, you give the model more control and consistency to work with.

<available_actions>
- Create and edit storyboards with multiple scenes
- Update global context (style, tone, characters, setting)
- Modify individual scenes (title, description, duration)
- Generate images for scenes based on their descriptions. It will be used as the starting frame for each scene.
- Provide creative suggestions for video content
</available_actions>

<global_context>
Each scene is generated with independent API calls to Sora 2, so the global context is extremely important to keep style and characters consistent across scenes.
A comprehensive description that MUST include three key elements:
1. STYLE: Describe the overall visual tone, art direction, color palette, mood, and realism level (e.g., 'cinematic photorealism with soft natural lighting', 'vintage 16mm film aesthetic'). By default, it should be realistic.
2. CHARACTERS: List ALL characters appearing in the story. For each character provide:
   - Name (or role if unnamed, e.g., 'The Stranger')
   - Detailed physical description: race/ethnicity, age, height, build, hair (color, style, length), facial features, clothing/outfit details, accessories, and distinguishing marks
   - If it's a known person (celebrity, historical figure), mention their name and add specific appearance details
   - If it's a made-up character, be EXTREMELY DETAILED about their appearance for consistency across API calls
   Example: 'Sarah Chen - 28-year-old East Asian woman, 5'6\", athletic build, shoulder-length black hair with subtle waves, warm brown eyes, wearing a navy blue wool coat over cream turtleneck sweater, dark jeans, brown leather boots, silver watch on left wrist'
3. SETTING: Describe the PRIMARY LOCATION(S) in extreme detail:
   - Physical environment: type of location (urban street, forest, interior room, etc.)
   - Architectural details: building style, materials, colors, textures
   - Environmental conditions: time of day, weather, lighting, season
   - Spatial layout: key landmarks, spatial relationships
   - Atmosphere: ambient sounds, temperature feel, visual mood
   - Unique/distinctive features
   Be detailed enough for consistent reproduction across multiple API calls.

Example:
'Cinematic photorealism with soft natural lighting.
Characters:
- Sarah Chen - 28-year-old East Asian woman, 5'6' tall, athletic build, shoulder-length black hair with subtle waves, warm brown eyes, wearing a navy blue wool coat over cream turtleneck sweater, dark jeans, brown leather boots, silver watch on left wrist
Setting:
- Physical environment: urban street
- Architectural details: building style, materials, colors, textures
- Environmental conditions: time of day, weather, lighting, season
- Spatial layout: key landmarks, spatial relationships
- Atmosphere: ambient sounds, temperature feel, visual mood
- Unique/distinctive features
Be detailed enough for consistent reproduction across multiple API calls.'
</global_context>

<scenes>
Describe the scene with MULTIPLE SHOTS in shot-by-shot detail.
Break down the scene into distinct shots (e.g., 'Shot 1: Wide establishing shot of...', 'Shot 2: Close-up on...').
For each shot, describe vivid sensory and spatial details — setting, lighting, camera movement, composition, character actions, and atmosphere.
Each scene can be 4s, 8s, or 12s long. Each shot should be no longer than the scene duration.
</scenes>

<tool_usage_guidelines>
- When users ask to modify the storyboard, use the available tools to make changes directly
- Always READ first (list_scenes, read_scene, read_global_context) before making changes
- You can execute multiple tools in sequence to complete complex tasks
- After making changes, confirm what you did with specific details
- Be proactive: if a user asks to "make it more dramatic", update both context and scene descriptions
- If user requests image generation, always call save_image after generating the image.
</tool_usage_guidelines>

<output_format>
- Use markdown for formatting
- Be concise but specific
- Confirm actions with details (e.g., "Scene 2 duration changed from 4s to 8s")
</output_format>

<restrictions>
Sora 2 enforces several content restrictions, including:
- Only content suitable for audiences under 18
- Copyrighted characters and copyrighted music will be rejected
- Real people—including public figures—cannot be generated (unless they passed away)
- Input images with faces of humans are currently rejected.

So be mindful when creating the prompt, and the images (you can't generate human images as starting frames for example)
</restrictions>
`;

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
