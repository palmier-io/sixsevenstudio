import { useRef, useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Pause } from "lucide-react";
import { useVideoPolling } from "@/hooks/useVideoPolling";
import { OpenAIVideoJobStatus } from "@/types/openai";
import { VideoStatus } from "@/components/VideoStatus";

interface VideoPlayerProps {
  src: string;
  videoId: string;
  projectPath: string;
}

export function VideoPlayer({ src, videoId, projectPath }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const status = useVideoPolling({
    videoId,
    projectPath,
  });

  // Reset state when src changes
  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setError(null);
    setIsLoading(true);

    if (videoRef.current) {
      videoRef.current.load();
    }
  }, [src]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setTotalDuration(videoRef.current.duration);
      setIsLoading(false);
      setError(null);
    }
  };

  const handleError = () => {
    setError("Failed to load video");
    setIsLoading(false);
  };

  const handleCanPlay = () => {
    setIsLoading(false);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const isVideoReady = status?.status === OpenAIVideoJobStatus.COMPLETED && status?.videoSrc;

  return (
    <Card className="w-full overflow-hidden">
      <CardContent className="p-0">
        <div className="relative bg-black aspect-video">
          {isVideoReady && (
            <video
              ref={videoRef}
              key={src}
              src={src}
              className="w-full aspect-video"
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onCanPlay={handleCanPlay}
              onError={handleError}
              onEnded={() => setIsPlaying(false)}
              onClick={togglePlay}
              preload="metadata"
            />
          )}

          {/* Video status overlay (generating/failed) */}
          {status && (
            <VideoStatus
              status={status.status}
              progress={status.progress}
              size="large"
            />
          )}

          {/* Loading Indicator for video file */}
          {isVideoReady && isLoading && !error && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <div className="text-white text-sm">Loading video...</div>
            </div>
          )}

          {/* Error Display for video playback */}
          {isVideoReady && error && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80">
              <div className="text-red-400">{error}</div>
            </div>
          )}

          {/* Video Controls Overlay - only show when video is ready */}
          {isVideoReady && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 space-y-2">
            {/* Seek Bar */}
            <input
              type="range"
              min="0"
              max={totalDuration || 0}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-1 bg-white/30 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
            />

            {/* Control Buttons */}
            <div className="flex items-center gap-2 text-white">
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={togglePlay}
                className="text-white hover:bg-white/20"
              >
                {isPlaying ? (
                  <Pause className="size-5" />
                ) : (
                  <Play className="size-5" />
                )}
              </Button>
              <span className="text-sm">
                {formatTime(currentTime)} / {formatTime(totalDuration)}
              </span>
            </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
