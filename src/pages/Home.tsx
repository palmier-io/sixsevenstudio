import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { InputBox } from "@/components/InputBox";
import { useVideos } from "@/hooks/use-videos";
import { useProjects, VideoMeta } from "@/hooks/tauri/use-projects";
import { toast } from "sonner";
import { info as logInfo , error as logError} from "@tauri-apps/plugin-log";
import { STARTING_FRAME_FILENAME } from "@/types/constants";

function createProjectNameFromPrompt(
  prompt: string,
  fallbackPrefix: string,
  existingProjects: string[]
): string {
  const baseName = prompt
    .slice(0, 50)
    .trim()
    .replace(/[^a-zA-Z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .toLowerCase() || `${fallbackPrefix}-${Date.now()}`;

  // Check for collisions and append suffix if needed
  let finalName = baseName;
  let suffix = 2;
  while (existingProjects.includes(finalName)) {
    finalName = `${baseName}-${suffix}`;
    suffix++;
  }

  return finalName;
}

export function Home() {
  const navigate = useNavigate();
  const { createProject, ensureWorkspaceExists, addVideosToProject, projects, saveImage } = useProjects();
  const {
    createVideo,
  } = useVideos();
  const [isGenerating, setIsGenrating] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);

  const handleStoryboard = async (params: {
    prompt: string;
    settings: {
      model: string;
      resolution: string;
      duration: number;
      samples: number;
    };
  }) => {
    try {
      await ensureWorkspaceExists();

      const existingProjectNames = projects.map(p => p.name);
      const projectName = createProjectNameFromPrompt(params.prompt, "storyboard", existingProjectNames);
      const project = await createProject(projectName);

      if (selectedImage) {
        try {
          const reader = new FileReader();
          const imageDataPromise = new Promise<string>((resolve, reject) => {
            reader.onloadend = () => {
              const base64String = reader.result as string;
              const base64Data = base64String.split(',')[1]; // Remove data:image/...;base64, prefix
              resolve(base64Data);
            };
            reader.onerror = reject;
            reader.readAsDataURL(selectedImage);
          });
          const imageData = await imageDataPromise;
          await saveImage(project.name, STARTING_FRAME_FILENAME, imageData);
          logInfo(`Reference image saved for project ${project.name}`);
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : String(err);
          logError(`Failed to save reference image: ${errMsg}`);
          // Continue with storyboard generation even if image save fails
        }
      }

      // Navigate immediately with prompt - AI chat will handle generation
      navigate(`/projects/${project.name}?tab=storyboard`, {
        state: {
          initialPrompt: params.prompt,
          settings: params.settings,
          useAiChat: true,
        },
      });
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      toast.error("Failed to create project", {
        description: errMsg,
      });
      logError(`Failed to create project for storyboard: ${errMsg}`);
    }
  };

  const handleGenerate = async (params: {
    prompt: string;
    settings: {
      model: string;
      resolution: string;
      duration: number;
      samples: number;
    };
  }) => {
    try {
      setIsGenrating(true);
      await ensureWorkspaceExists();

      const existingProjectNames = projects.map(p => p.name);
      const projectName = createProjectNameFromPrompt(params.prompt, "video", existingProjectNames);
      const project = await createProject(projectName);

      // Start video generation for n samples
      const videoMetadata: VideoMeta[] = [];
      for (let i = 0; i < params.settings.samples; i++) {
        const videoId = await createVideo({
          model: params.settings.model,
          prompt: params.prompt,
          size: params.settings.resolution,
          seconds: params.settings.duration.toString(),
        });

        videoMetadata.push({
          id: videoId,
          prompt: params.prompt,
          model: params.settings.model,
          resolution: params.settings.resolution,
          duration: params.settings.duration,
          created_at: Date.now(),
        } as VideoMeta);
      }

      await addVideosToProject(project.name, videoMetadata);

      
      toast.success("Project created and video generation started!", {
        description: `Project: ${project.name}`,
      });
      logInfo(`Project ${project.name} created and video generation started!`)

      // Navigate to the project page
      navigate(`/projects/${project.name}`, {
        state: {
          prompt: params.prompt,
          resolution: params.settings.resolution,
          duration: params.settings.duration,
          project,
        },
      });
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error)
      toast.error("Failed to start video generation", {
        description: errMsg,
      });
      logError(`Failed to start video generation ${errMsg}`);
    } finally {
      setIsGenrating(false);
    }
  };

  return (
    <div className="flex h-screen items-center justify-center p-6 -mt-16">
      <div className="mx-auto w-full max-w-2xl space-y-4">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-4 mb-2">
            <h1 className="text-3xl">Let's create.</h1>
          </div>
        </div>
        <InputBox
          onGenerate={handleGenerate}
          onStoryboard={handleStoryboard}
          onImageSelect={(file) => setSelectedImage(file)}
          onImageClear={() => setSelectedImage(null)}
          disabled={isGenerating}
        />

      </div>
    </div>
  );
}
