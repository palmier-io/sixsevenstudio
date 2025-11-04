import { Card, CardContent } from "@/components/ui/card";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { useVideoPolling } from "@/hooks/use-video-polling";
import { VideoStatus as OpenAIVideoStatus } from "@/lib/openai/video";
import { VideoStatus } from "@/components/videos/VideoStatus";
import { useEffect, useRef } from "react";

interface VideoPlayerProps {
  src: string;
  videoId: string;
  projectPath: string;
}

export function VideoPlayer({ src, videoId, projectPath }: VideoPlayerProps) {
  const status = useVideoPolling({
    videoId,
    projectPath,
  });
  const videoRef = useRef<HTMLVideoElement>(null);

  const isVideoReady = status?.status === OpenAIVideoStatus.COMPLETED && status?.videoSrc;

  // Keyboard shortcuts: Space to play/pause, Arrow keys to seek
  useEffect(() => {
    if (!isVideoReady || !videoRef.current) return;

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
  }, [isVideoReady]);

  return (
    <Card className="w-full max-w-4xl overflow-hidden">
      <CardContent className="p-0">
        <AspectRatio ratio={16 / 9} className="bg-black">
          <div className="relative w-full h-full">
            {isVideoReady && (
              <video
                ref={videoRef}
                key={src}
                src={src}
                className="w-full h-full object-contain"
                controls
                preload="metadata"
              />
            )}

            {/* Video status overlay (generating/failed) */}
            {status && (
              <VideoStatus
                status={status.status}
                progress={status.progress}
                size="large"
                error={status.error}
              />
            )}
          </div>
        </AspectRatio>
      </CardContent>
    </Card>
  );
}
