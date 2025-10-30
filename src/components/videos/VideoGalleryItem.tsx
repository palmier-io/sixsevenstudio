import { Card } from "@/components/ui/card";
import { Play, Trash2, RotateCw } from "lucide-react";
import { VideoMeta } from "@/hooks/tauri/use-projects";
import { VideoStatus as OpenAIVideoStatus } from "@/lib/openai/video";
import { Button } from "@/components/ui/button";
import { RemixPopover } from "@/components/videos/RemixPopover";
import { useVideoPolling } from "@/hooks/use-video-polling";
import { VideoStatus } from "@/components/videos/VideoStatus";

interface VideoGalleryItemProps {
  video: VideoMeta;
  projectPath: string;
  isSelected?: boolean;
  onClick?: () => void;
  onDelete?: () => void;
  onRegenerate?: () => void;
  onRemix?: (remixPrompt: string) => void;
}

export function VideoGalleryItem({
  video,
  projectPath,
  isSelected,
  onClick,
  onDelete,
  onRegenerate,
  onRemix,
}: VideoGalleryItemProps) {
  const status = useVideoPolling({
    videoId: video.id,
    projectPath,
  });

  const isGenerating = status?.status === OpenAIVideoStatus.QUEUED || status?.status === OpenAIVideoStatus.IN_PROGRESS;
  const hasFailed = status?.status === OpenAIVideoStatus.FAILED;
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
            error={status.error}
          />
        )}

        {/* Play button overlay */}
        {!isGenerating && !hasFailed && (
          <div className="absolute inset-0 bg-black/0 hover:bg-black/30 transition-colors flex items-center justify-center group">
            <Play className="size-4 sm:size-5 md:size-6 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
          </div>
        )}

        {/* Video metadata overlay */}
        <div className="absolute top-1 left-1 sm:top-1.5 sm:left-1.5 md:top-2 md:left-2 bg-black/60 px-1 py-0.5 sm:px-1.5 sm:py-1 md:px-2 md:py-1 rounded text-white text-[8px] sm:text-[9px] md:text-[10px] max-w-[calc(100%-3rem)] sm:max-w-[calc(100%-4rem)] md:max-w-[calc(100%-5rem)] truncate">
          {video.scene_number
            ? `${video.sample_number && video.sample_number > 1 ? `(${video.sample_number}) ` : ''}Scene ${video.scene_number}`
            : video.id}
        </div>

        {/* Action buttons overlay - vertical stack */}
        <div className="absolute top-1 right-1 sm:top-1.5 sm:right-1.5 md:top-2 md:right-2 flex flex-col gap-0.5 sm:gap-1 z-20" onClick={(e) => e.stopPropagation()}>
          {onRemix && (
            <RemixPopover
              onRemix={onRemix}
              buttonSize="icon"
              buttonClassName="bg-black/60 hover:bg-purple-600/80 text-white h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8"
              compact
            />
          )}
          {onRegenerate && (
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onRegenerate();
              }}
              className="bg-black/60 hover:bg-blue-600/80 text-white h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8"
              title="Regenerate video"
            >
              <RotateCw className="size-3 sm:size-3.5 md:size-4" />
            </Button>
          )}
          {onDelete && (
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="bg-black/60 hover:bg-red-600/80 text-white h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8"
              title="Delete video"
            >
              <Trash2 className="size-3 sm:size-3.5 md:size-4" />
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
