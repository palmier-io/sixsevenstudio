import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { InputBox } from "@/components/InputBox";
import { useVideos } from "@/hooks/tauri/use-videos";
import { useProjects, VideoMeta } from "@/hooks/tauri/use-projects";
import { toast } from "sonner";
import { info as logInfo , error as logError} from "@tauri-apps/plugin-log";

export function Home() {
  const navigate = useNavigate();
  const { createProject, ensureWorkspaceExists, addVideosToProject } = useProjects();
  const {
    createVideo,
  } = useVideos();
  const [isGenerating, setIsGenrating] = useState(false);

  const handleStoryboard = (params: {
    prompt: string;
    settings: {
      model: string;
      resolution: string;
      duration: number;
      samples: number;
    };
  }) => {
    navigate('/storyboard', {
      state: {
        prompt: params.prompt,
        settings: params.settings,
      },
    });
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

      // Create project name from prompt (first 50 chars, sanitized)
      const projectName = params.prompt
        .slice(0, 50)
        .trim()
        .replace(/[^a-zA-Z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .toLowerCase() || `video-${Date.now()}`;

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
