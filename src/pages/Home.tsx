import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { InputBox } from "@/components/InputBox";
import { useVideos } from "@/hooks/tauri/use-videos";
import { useProjects, VideoMeta } from "@/hooks/tauri/use-projects";
import { toast } from "sonner";
import { info as logInfo , error as logError} from "@tauri-apps/plugin-log";

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
  const { createProject, ensureWorkspaceExists, addVideosToProject, projects, generateStoryboard } = useProjects();
  const {
    createVideo,
  } = useVideos();
  const [isGenerating, setIsGenrating] = useState(false);

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

      // Trigger AI storyboard generation (fire and forget)
      toast.info("Generating storyboard...");
      generateStoryboard(project.name, params.prompt)
        .then(() => {
          toast.success("Storyboard generated!");
          logInfo(`Storyboard generated for project ${project.name}`);
        })
        .catch((err) => {
          const errMsg = err instanceof Error ? err.message : String(err);
          toast.error("Failed to generate storyboard", { description: errMsg });
          logError(`Failed to generate storyboard: ${errMsg}`);
        });

      // Navigate immediately (loading state will be handled in StoryboardTab)
      navigate(`/projects/${project.name}?tab=storyboard`, {
        state: {
          prompt: params.prompt,
          settings: params.settings,
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
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="mx-auto w-full max-w-2xl space-y-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Generate Video</h1>
          <p className="text-muted-foreground">
            Describe your video to get started
          </p>
        </div>
        <InputBox
          onGenerate={handleGenerate}
          onStoryboard={handleStoryboard}
          disabled={isGenerating}
        />

      </div>
    </div>
  );
}
