import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { InputBox } from "@/components/InputBox";
import { useVideos } from "@/hooks/use-videos";
import { useProjects, VideoMeta } from "@/hooks/tauri/use-projects";
import { toast } from "sonner";
import { info as logInfo , error as logError} from "@tauri-apps/plugin-log";
import openai from "openai";
import { createProjectNameFromPrompt } from "@/lib/utils";
import { type LLMModel } from "@/types/constants";
import { generateId } from "@/lib/utils";


export function Home() {
  const navigate = useNavigate();
  const { createProject, ensureWorkspaceExists, addVideosToProject, projects, saveImage } = useProjects();
  const {
    createVideo,
  } = useVideos();
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);

  const handleImageSelect = (file: File) => {
    setSelectedImage(file);
  };

  const handleImageClear = () => {
    setSelectedImage(null);
  };

  const handleStoryboard = async (params: {
    prompt: string;
    settings: {
      model: string;
      resolution: string;
      duration: number;
      samples: number;
    };
    llmModel: LLMModel;
  }) => {
    try {
      await ensureWorkspaceExists();

      const existingProjectNames = projects.map(p => p.name);
      const projectName = createProjectNameFromPrompt(params.prompt, "storyboard", existingProjectNames);
      const project = await createProject(projectName);

      // Navigate immediately with prompt - AI chat will handle generation
      navigate(`/projects/${project.name}?tab=storyboard`, {
        state: {
          initialPrompt: params.prompt,
          settings: params.settings,
          llmModel: params.llmModel,
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
      setIsGenerating(true);
      await ensureWorkspaceExists();

      const existingProjectNames = projects.map(p => p.name);
      const projectName = createProjectNameFromPrompt(params.prompt, "video", existingProjectNames);
      const project = await createProject(projectName);

      let inputReferencePath: string | undefined;
      if (selectedImage) {
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve, reject) => {
          reader.onload = () => {
            const base64 = (reader.result as string).split(',')[1];
            resolve(base64);
          };
          reader.onerror = reject;
        });
        reader.readAsDataURL(selectedImage);

        const base64Data = await base64Promise;
        const imageName = `${generateId("input")}.png`;
        inputReferencePath = await saveImage(project.name, imageName, base64Data);
        logInfo(`Saved input reference image: ${inputReferencePath}`);
      }

      // Start video generation for n samples
      const videoMetadata: VideoMeta[] = [];
      for (let i = 0; i < params.settings.samples; i++) {
        const videoId = await createVideo({
          model: params.settings.model as openai.Videos.VideoModel,
          prompt: params.prompt,
          size: params.settings.resolution as openai.Videos.VideoSize,
          seconds: params.settings.duration.toString() as openai.Videos.VideoSeconds,
          input_reference: inputReferencePath as any,
        });

        videoMetadata.push({
          id: videoId,
          prompt: params.prompt,
          model: params.settings.model,
          resolution: params.settings.resolution,
          duration: params.settings.duration,
          created_at: Date.now(),
          input_reference_image: inputReferencePath,
        } as VideoMeta);
      }

      await addVideosToProject(project.name, videoMetadata);
      setSelectedImage(null);

      
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
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex h-screen items-center justify-center p-6 -mt-16">
      <div className="mx-auto w-full max-w-2xl space-y-6">
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-4 mb-3">
            <h1 className="text-4xl font-semibold tracking-tight">Let's create.</h1>
          </div>
          <p className="text-muted-foreground text-sm">
            Generate AI videos or create storyboards with Sora
          </p>
        </div>
        <InputBox
          onGenerate={handleGenerate}
          onStoryboard={handleStoryboard}
          onImageSelect={handleImageSelect}
          onImageClear={handleImageClear}
          disabled={isGenerating}
        />
      </div>
    </div>
  );
}
