import { useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { convertFileSrc } from "@tauri-apps/api/core";

interface VideoPreviewProps {
  videoPath: string | null; // Path to the stitched preview video
  onTimeUpdate?: (currentTime: number) => void;
  seekToTime?: number; // Seek to specific time when provided
  isGenerating?: boolean; // Whether preview is being generated
}

export function VideoPreview({ videoPath, onTimeUpdate, seekToTime, isGenerating = false }: VideoPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Handle external seek commands (from timeline clicks/drags)
  useEffect(() => {
    if (videoRef.current && videoPath && seekToTime !== undefined) {
      videoRef.current.currentTime = seekToTime;
    }
  }, [seekToTime, videoPath]);

  // Use native video timeupdate event - fires automatically when video plays
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoPath || !onTimeUpdate) {
      return;
    }

    const handleTimeUpdate = () => {
      if (videoRef.current) {
        onTimeUpdate(videoRef.current.currentTime);
      }
    };

    // Use native timeupdate event (fires ~4 times per second when playing)
    video.addEventListener('timeupdate', handleTimeUpdate);
    // Also update on seek for immediate feedback
    video.addEventListener('seeked', handleTimeUpdate);
    // Update when video loads metadata
    video.addEventListener('loadedmetadata', handleTimeUpdate);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('seeked', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleTimeUpdate);
    };
  }, [videoPath, onTimeUpdate]);

  return (
    <Card className="w-full h-full flex flex-col overflow-hidden">
      <CardContent className="p-0 flex-1 flex items-center justify-center bg-black min-h-0">
        {isGenerating ? (
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Generating preview...</p>
          </div>
        ) : videoPath ? (
          <video
            ref={videoRef}
            src={convertFileSrc(videoPath)}
            className="max-w-full max-h-full object-contain"
            controls
            key={videoPath} // Force re-render when video changes
          />
        ) : (
          <div className="text-center">
            <p className="text-sm text-muted-foreground">No clips on timeline</p>
            <p className="text-xs text-muted-foreground mt-1">
              Add clips to the timeline to see preview
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
