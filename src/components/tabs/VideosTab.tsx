import { useState, useEffect, useCallback, useMemo } from "react";
import { VideoPlayer } from "@/components/videos/VideoPlayer";
import { VideoGallery } from "@/components/videos/VideoGallery";
import { VideoDetails } from "@/components/videos/VideoDetails";
import { useProjects, type VideoMeta, type ProjectMeta } from "@/hooks/tauri/use-projects";
import { useVideos } from "@/hooks/use-videos";
import { useVideoStatusStore } from "@/stores/useVideoStatusStore";
import { toast } from "sonner";
import { convertFileSrc } from "@tauri-apps/api/core";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import openai from 'openai';
import { VideoStatus } from "@/lib/openai/video";
import { getVideoPath } from "@/hooks/use-video-polling";

function VideoPlaceholder(props: { title: string; subtitle: string; pulsing?: boolean }) {
  const { title, subtitle, pulsing } = props;
  return (
    <div className="text-center">
      <div className="mx-auto mb-4 size-16 rounded-full bg-muted flex items-center justify-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className={`size-8 text-muted-foreground${pulsing ? " animate-pulse" : ""}`}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z"
          />
        </svg>
      </div>
      <h3 className="text-lg font-medium mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground">{subtitle}</p>
    </div>
  );
}

interface VideosTabProps {
  projectName: string;
}

export function VideosTab({ projectName }: VideosTabProps) {
  const { getProject, deleteVideoFromProject, addVideosToProject, getImage } = useProjects();
  const { createVideo, remixVideo } = useVideos();
  const { getStatus } = useVideoStatusStore();

  const [projectMeta, setProjectMeta] = useState<ProjectMeta | null>(null);
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);

  // Load project metadata (videos list + project path)
  useEffect(() => {
    const load = async () => {
      if (!projectName) return;
      try {
        const meta = await getProject(projectName);
        setProjectMeta(meta);
        // default select first video
        if (meta.videos.length > 0) {
          setSelectedVideoId(meta.videos[0].id);
        }
      } catch (error) {
        toast.error("Failed to load project", {
          description: error instanceof Error ? error.message : String(error),
        });
      }
    };
    load();
  }, [projectName, getProject]);

  const handleVideoSelect = useCallback((video: VideoMeta) => {
    setSelectedVideoId(video.id);
  }, []);

  const handleVideoDelete = useCallback(async (videoId: string) => {
    if (!projectName) return;
    try {
      await deleteVideoFromProject(projectName, videoId);
      const updatedMeta = await getProject(projectName);
      setProjectMeta(updatedMeta);
      setSelectedVideoId(null);
      toast.success("Video deleted successfully");
    } catch (error) {
      toast.error("Failed to delete video", {
        description: error instanceof Error ? error.message : String(error),
      });
    }
  }, [projectName, deleteVideoFromProject, getProject]);

  const handleVideoRegenerate = useCallback(async (video: VideoMeta) => {
    if (!projectName || !projectMeta) return;
    try {
      toast.loading("Regenerating video...", { id: "regenerate" });

      const currentStatus = getStatus(video.id);
      const isFailed = currentStatus?.status === VideoStatus.FAILED;

      const newVideoId = await createVideo({
        model: video.model as openai.Videos.VideoModel,
        prompt: video.prompt,
        size: video.resolution as openai.Videos.VideoSize,
        seconds: video.duration.toString() as openai.Videos.VideoSeconds,
      });

      const sampleNumber = isFailed
        ? video.sample_number
        : (video.sample_number || 1) + 1;

      // Create new video metadata
      const newVideoMeta: VideoMeta = {
        id: newVideoId,
        prompt: video.prompt,
        model: video.model,
        resolution: video.resolution,
        duration: video.duration,
        created_at: Date.now(),
        scene_number: video.scene_number,
        scene_title: video.scene_title,
        sample_number: sampleNumber,
      };

      // For failed videos: replace. For successful videos: add new sample
      if (isFailed) {
        await deleteVideoFromProject(projectName, video.id);
      }
      await addVideosToProject(projectName, [newVideoMeta]);

      // Refresh project data
      const updatedMeta = await getProject(projectName);
      setProjectMeta(updatedMeta);

      toast.success("Video regeneration started", { id: "regenerate" });
    } catch (error) {
      toast.error("Failed to regenerate video", {
        id: "regenerate",
        description: error instanceof Error ? error.message : String(error),
      });
    }
  }, [projectName, projectMeta, createVideo, getStatus, getImage, addVideosToProject, deleteVideoFromProject, getProject]);

  const handleVideoRemix = useCallback(async (video: VideoMeta, remixPrompt: string) => {
    if (!projectName || !projectMeta) return;
    try {
      toast.loading("Remixing video...", { id: "remix" });

      const newVideoId = await remixVideo(video.id, remixPrompt);

      const sampleNumber = (video.sample_number || 1) + 1;

      const newVideoMeta: VideoMeta = {
        id: newVideoId,
        prompt: video.prompt, // Keep original prompt
        model: video.model,
        resolution: video.resolution,
        duration: video.duration,
        created_at: Date.now(),
        scene_number: video.scene_number,
        scene_title: video.scene_title,
        sample_number: sampleNumber,
        remixed_from_video_id: video.id,
        remix_prompt: remixPrompt,
      };

      await addVideosToProject(projectName, [newVideoMeta]);

      const updatedMeta = await getProject(projectName);
      setProjectMeta(updatedMeta);

      toast.success("Video remix started", { id: "remix" });
    } catch (error) {
      toast.error("Failed to remix video", {
        id: "remix",
        description: error instanceof Error ? error.message : String(error),
      });
    }
  }, [projectName, projectMeta, remixVideo, addVideosToProject, getProject]);

  const selectedVideo: VideoMeta | undefined = useMemo(() => {
    return projectMeta?.videos.find(v => v.id === selectedVideoId);
  }, [projectMeta, selectedVideoId]);

  return (
    <ResizablePanelGroup direction="vertical" className="flex-1 h-full">
      {/* Top Section */}
      <ResizablePanel defaultSize={75} minSize={40}>
        <ResizablePanelGroup direction="horizontal" className="h-full">
          {/* Left Panel: Video Player */}
          <ResizablePanel defaultSize={75} minSize={40}>
            <div className="h-full overflow-auto p-6 flex items-center justify-center">
              {selectedVideoId && projectMeta ? (
                <VideoPlayer
                  src={convertFileSrc(getVideoPath(projectMeta.path, selectedVideoId))}
                  videoId={selectedVideoId}
                  projectPath={projectMeta.path}
                />
              ) : (
                <VideoPlaceholder
                  title="No video selected"
                  subtitle="Click a video from the gallery below to view it"
                />
              )}
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Right Panel: Video Details */}
          <ResizablePanel defaultSize={25} minSize={15}>
            <VideoDetails
              video={selectedVideo}
              onRegenerate={selectedVideo ? () => handleVideoRegenerate(selectedVideo) : undefined}
              onRemix={selectedVideo ? (remixPrompt: string) => handleVideoRemix(selectedVideo, remixPrompt) : undefined}
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      </ResizablePanel>

      <ResizableHandle withHandle />

      {/* Bottom Panel - Video Gallery */}
      <ResizablePanel defaultSize={25} minSize={10} maxSize={50}>
        <div className="h-full border-t">
          {projectMeta && (
            <VideoGallery
              videos={projectMeta.videos}
              selectedVideoId={selectedVideoId || undefined}
              onVideoSelect={handleVideoSelect}
              onVideoDelete={handleVideoDelete}
              onVideoRegenerate={handleVideoRegenerate}
              onVideoRemix={handleVideoRemix}
              projectPath={projectMeta.path}
            />
          )}
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
