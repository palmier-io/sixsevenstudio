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

  // Keyboard shortcuts: Space to play/pause, Arrow keys to seek
  useEffect(() => {
    if (!videoPath || !videoRef.current) return;

    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      // Only handle if not typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const video = videoRef.current;
      if (!video) return;

      switch (e.key) {
        case ' ':
          e.preventDefault();
          if (video.paused) {
            video.play();
          } else {
            video.pause();
          }
          break;
        case 'ArrowLeft':
          e.preventDefault();
          video.currentTime = Math.max(0, video.currentTime - 5);
          break;
        case 'ArrowRight':
          e.preventDefault();
          video.currentTime = Math.min(video.duration, video.currentTime + 5);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [videoPath]);

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
          <div className="text-center space-y-4">
            <div className="size-12 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <div>
              <p className="text-sm font-medium text-foreground">Generating preview...</p>
              <p className="text-xs text-muted-foreground mt-1">This may take a moment</p>
            </div>
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
          <div className="text-center space-y-3">
            <div className="size-16 rounded-full bg-muted flex items-center justify-center mx-auto">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="size-8 text-muted-foreground"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">No clips on timeline</p>
              <p className="text-xs text-muted-foreground mt-1">
                Add clips from the library to see preview
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
