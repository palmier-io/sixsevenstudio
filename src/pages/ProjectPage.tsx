import { useParams } from "react-router-dom";
import { useState, useEffect, useCallback, useMemo } from "react";
import { VideoPlayer } from "@/components/VideoPlayer";
import { VideoGallery } from "@/components/VideoGallery";
import { VideoDetails } from "@/components/VideoDetails";
import { useProjects, type VideoMeta, type ProjectMeta } from "@/hooks/tauri/use-projects";
import { toast } from "sonner";
import { convertFileSrc } from "@tauri-apps/api/core";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";


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

export function ProjectPage() {
  const params = useParams<{ projectName: string }>();

  const { getProject, deleteVideoFromProject } = useProjects();

  const [projectMeta, setProjectMeta] = useState<ProjectMeta | null>(null);
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);

  // Load project metadata (videos list + project path)
  useEffect(() => {
    const load = async () => {
      if (!params.projectName) return;
      try {
        const meta = await getProject(params.projectName);
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
  }, [params.projectName]);

  // Handler for selecting a video
  const handleVideoSelect = useCallback((video: VideoMeta) => {
    setSelectedVideoId(video.id);
  }, []);

  const handleVideoDelete = useCallback(async (videoId: string) => {
    if (!params.projectName) return;
    try {
      await deleteVideoFromProject(params.projectName, videoId);
      const updatedMeta = await getProject(params.projectName);
      setProjectMeta(updatedMeta);
      setSelectedVideoId(null);
      toast.success("Video deleted successfully");
    } catch (error) {
      toast.error("Failed to delete video", {
        description: error instanceof Error ? error.message : String(error),
      });
    }
  }, [params.projectName, deleteVideoFromProject, getProject]);

  const selectedVideo: VideoMeta | undefined = useMemo(() => {
    return projectMeta?.videos.find(v => v.id === selectedVideoId);
  }, [projectMeta, selectedVideoId]);

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Top Section */}
      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          {/* Left Panel: Video Player */}
          <ResizablePanel defaultSize={65} minSize={40}>
            <div className="h-full overflow-auto p-6 flex items-center justify-center">
              {selectedVideoId && projectMeta ? (
                <VideoPlayer
                  src={convertFileSrc(`${projectMeta.path}/${selectedVideoId}.mp4`)}
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
          <ResizablePanel defaultSize={35} minSize={15}>
            <VideoDetails video={selectedVideo} />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* Bottom Panel */}
      <div className="h-[180px] border-t flex-shrink-0">
        {projectMeta && (
          <VideoGallery
            videos={projectMeta.videos}
            selectedVideoId={selectedVideoId || undefined}
            onVideoSelect={handleVideoSelect}
            onVideoDelete={handleVideoDelete}
            projectPath={projectMeta.path}
          />
        )}
      </div>
    </div>
  );
}
