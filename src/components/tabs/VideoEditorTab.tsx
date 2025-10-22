import { useState, useEffect, useCallback } from "react";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { VideoPreview } from "@/components/editor/VideoPreview";
import { ClipLibrary } from "@/components/editor/ClipLibrary";
import { Timeline } from "@/components/editor/Timeline";
import { useVideoEditorState } from "@/hooks/use-video-editor-state";
import { useVideoEditor } from "@/hooks/tauri/use-video-editor";
import { useProjects } from "@/hooks/tauri/use-projects";
import { toast } from "sonner";
import type { VideoClip } from "@/types/video-editor";

interface VideoEditorTabProps {
  projectName: string;
}

export function VideoEditorTab({ projectName }: VideoEditorTabProps) {
  const { getProject } = useProjects();
  const { clips, selectedClipId, totalDuration, addClip, removeClip, selectClip, splitClip } = useVideoEditorState();
  const { createPreviewVideo } = useVideoEditor();

  const [libraryClips, setLibraryClips] = useState<VideoClip[]>([]);
  const [currentPlaybackTime, setCurrentPlaybackTime] = useState<number | null>(null);
  const [seekToTime, setSeekToTime] = useState<number | undefined>(undefined);
  const [previewVideoPath, setPreviewVideoPath] = useState<string | null>(null);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);

  // Load videos from project
  useEffect(() => {
    const loadVideos = async () => {
      try {
        const project = await getProject(projectName);
        const videoClips: VideoClip[] = project.videos.map((video) => ({
          id: video.id,
          name: `Video ${video.id.slice(0, 8)}`,
          videoPath: `${project.path}/${video.id}.mp4`,
          originalDuration: video.duration,
          createdAt: video.created_at,
        }));
        setLibraryClips(videoClips);
      } catch (error) {
        console.error('Failed to load videos:', error);
        toast.error('Failed to load videos');
      }
    };

    loadVideos();
  }, [projectName, getProject]);

  const handleClipAdd = (clip: VideoClip) => {
    addClip(clip, totalDuration);
    toast.success('Clip added to timeline');
  };

  const handleDelete = () => {
    if (selectedClipId) {
      removeClip(selectedClipId);
      toast.success('Clip deleted');
    }
  };

  const handleSplit = (clipId: string, splitTime: number) => {
    splitClip(clipId, splitTime);
    toast.success('Clip split');
  };

  // Generate preview video whenever clips change
  useEffect(() => {
    const generatePreview = async () => {
      if (clips.length === 0) {
        setPreviewVideoPath(null);
        return;
      }

      setIsGeneratingPreview(true);
      try {
        const path = await createPreviewVideo(clips, projectName);
        setPreviewVideoPath(path);
      } catch (error) {
        console.error('Failed to generate preview:', error);
        toast.error('Failed to generate preview video');
      } finally {
        setIsGeneratingPreview(false);
      }
    };

    generatePreview();
  }, [clips, projectName, createPreviewVideo]);

  // Handle video time update - timeline time directly from stitched video
  const handleVideoTimeUpdate = useCallback((videoTime: number) => {
    setCurrentPlaybackTime(videoTime);
  }, []);

  // Handle timeline click - seek to position in stitched video
  const handleTimelineClick = useCallback((clickedTime: number) => {
    setSeekToTime(clickedTime);
  }, []);

  return (
    <ResizablePanelGroup direction="vertical" className="flex-1 h-full">
      {/* Top Section */}
      <ResizablePanel defaultSize={75} minSize={40}>
        <ResizablePanelGroup direction="horizontal" className="h-full">
          {/* Left Panel: Video Preview */}
          <ResizablePanel defaultSize={75} minSize={40}>
            <div className="h-full overflow-auto p-6 flex items-center justify-center">
              <VideoPreview
                videoPath={previewVideoPath}
                onTimeUpdate={handleVideoTimeUpdate}
                seekToTime={seekToTime}
                isGenerating={isGeneratingPreview}
              />
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Right Panel: Clip Library */}
          <ResizablePanel defaultSize={25} minSize={15}>
            <ClipLibrary
              clips={libraryClips}
              onClipAdd={handleClipAdd}
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      </ResizablePanel>

      <ResizableHandle withHandle />

      {/* Bottom Panel - Timeline */}
      <ResizablePanel defaultSize={40} minSize={10} maxSize={50}>
        <div className="h-full border-t">
          <Timeline
            clips={clips}
            selectedClipId={selectedClipId}
            onClipSelect={selectClip}
            onClipDelete={handleDelete}
            onClipSplit={handleSplit}
            currentTime={currentPlaybackTime ?? undefined}
            onTimelineClick={handleTimelineClick}
          />
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
