import { useRef, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { convertFileSrc } from "@tauri-apps/api/core";

// https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/timeupdate_event
const EVENTS_FOR_PLAYHEAD_UPDATE = [
  'timeupdate', // Fires automatically when video plays
  'seeked', // Update on seek for immediate feedback
  'loadedmetadata', // Ensures playhead resets to 0
  'canplay', // Catches cases where loadedmetadata already fired
  'play', // Ensures playhead moves
  'pause', // Ensures playhead shows correct position
];

interface VideoPreviewProps {
  videoPath: string | null; // Path to the stitched preview video
  onTimeUpdate?: (currentTime: number) => void;
  seekToTime?: number; // Seek to specific time when provided
  isGenerating?: boolean; // Whether preview is being generated
}

export function VideoPreview({ videoPath, onTimeUpdate, seekToTime, isGenerating = false }: VideoPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  // Handle external seek commands (from timeline clicks/drags)
  useEffect(() => {
    if (videoRef.current && videoPath && seekToTime !== undefined) {
      videoRef.current.currentTime = seekToTime;
    }
  }, [seekToTime, videoPath]);

  // Use ref callback to set up listeners when video element mounts
  const videoRefCallback = useCallback((element: HTMLVideoElement | null) => {
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }

    videoRef.current = element;
    
    if (!element || !videoPath || !onTimeUpdate) {
      return;
    }

    const updatePlayhead = () => {
      if (videoRef.current) {
        onTimeUpdate(videoRef.current.currentTime);
      }
    };

    // Use native timeupdate event (fires ~4 times per second when playing)
    EVENTS_FOR_PLAYHEAD_UPDATE.forEach(event => {
      element.addEventListener(event, updatePlayhead);
    });

    if (element.readyState >= 2) {
      updatePlayhead();
    }

    // Store cleanup function
    cleanupRef.current = () => {
      EVENTS_FOR_PLAYHEAD_UPDATE.forEach(event => {
        element.removeEventListener(event, updatePlayhead);
      });
    };
  }, [videoPath, onTimeUpdate]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
  }, []);

  return (
    <Card className="w-full h-full flex flex-col overflow-hidden">
      <CardContent className="p-0 flex-1 flex items-center justify-center bg-black min-h-0">
        {isGenerating ? (
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Generating preview...</p>
          </div>
        ) : videoPath ? (
          <video
            ref={videoRefCallback}
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
