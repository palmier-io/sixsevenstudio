import { Card } from "@/components/ui/card";
import { Play, Trash2 } from "lucide-react";
import { VideoMeta } from "@/hooks/tauri/use-projects";
import { OpenAIVideoJobStatus } from "@/types/openai";
import { Button } from "@/components/ui/button";
import { useVideoPolling } from "@/hooks/useVideoPolling";
import { VideoStatus } from "@/components/VideoStatus";

interface VideoGalleryItemProps {
  video: VideoMeta;
  projectPath: string;
  isSelected?: boolean;
  onClick?: () => void;
  onDelete?: () => void;
}

export function VideoGalleryItem({
  video,
  projectPath,
  isSelected,
  onClick,
  onDelete,
}: VideoGalleryItemProps) {
  const status = useVideoPolling({
    videoId: video.id,
    projectPath,
  });

  const isGenerating = status?.status === OpenAIVideoJobStatus.QUEUED || status?.status === OpenAIVideoJobStatus.IN_PROGRESS;
  const hasFailed = status?.status === OpenAIVideoJobStatus.FAILED;
  const videoSrc = status?.videoSrc;

  return (
    <Card
      className={`relative overflow-hidden cursor-pointer transition-all hover:shadow-md aspect-video p-0 ${
        isSelected ? "border-2 border-primary" : ""
      }`}
      onClick={onClick}
    >
      {/* Video container */}
      <div className="absolute inset-0 bg-muted">
        {videoSrc && (
          <video
            src={`${videoSrc}#t=0.1`}
            className="w-full h-full object-cover"
            preload="metadata"
            muted
          />
        )}

        {/* Video status overlay (generating/failed) */}
        {status && (
          <VideoStatus
            status={status.status}
            progress={status.progress}
            size="small"
          />
        )}

        {/* Play button overlay */}
        {!isGenerating && !hasFailed && (
          <div className="absolute inset-0 bg-black/0 hover:bg-black/30 transition-colors flex items-center justify-center group">
            <Play className="size-6 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
          </div>
        )}

        {/* Video ID overlay */}
        <div className="absolute top-2 left-2 bg-black/60 px-2 py-1 rounded text-white text-[10px] font-mono max-w-[calc(100%-6rem)] truncate">
          {video.id}
        </div>

        {/* Delete button overlay */}
        {onDelete && (
          <div className="absolute top-2 right-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="bg-black/60 hover:bg-red-600/80 text-white h-8 w-8"
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
