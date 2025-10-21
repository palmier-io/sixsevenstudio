import { Card, CardContent } from "@/components/ui/card";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { useVideoPolling } from "@/hooks/use-video-polling";
import { OpenAIVideoJobStatus } from "@/types/openai";
import { VideoStatus } from "@/components/VideoStatus";

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

  const isVideoReady = status?.status === OpenAIVideoJobStatus.COMPLETED && status?.videoSrc;

  return (
    <Card className="w-full max-w-4xl overflow-hidden">
      <CardContent className="p-0">
        <AspectRatio ratio={16 / 9} className="bg-black">
          <div className="relative w-full h-full">
            {isVideoReady && (
              <video
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
              />
            )}
          </div>
        </AspectRatio>
      </CardContent>
    </Card>
  );
}
