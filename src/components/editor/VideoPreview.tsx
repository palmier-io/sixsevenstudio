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

  // Handle time updates
  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;

    // Emit current time (timeline time in seconds)
    onTimeUpdate?.(video.currentTime);
  };

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
            onTimeUpdate={handleTimeUpdate}
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
