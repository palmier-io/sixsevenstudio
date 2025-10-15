import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Loader2, AlertCircle, Play, Trash2 } from "lucide-react";
import { VideoMeta } from "@/hooks/tauri/use-projects";
import { useVideos } from "@/hooks/tauri/use-videos";
import { useEffect, useState } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

const STATUS_POLL_INTERVAL = 5000; // 5 seconds

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
  const { getVideoStatus, downloadVideo } = useVideos();
  const [status, setStatus] = useState<{ status: string; progress: number }>({ status: "", progress: 0 });
  const [videoSrc, setVideoSrc] = useState<string | undefined>();

  // Poll video status until terminal state
  useEffect(() => {
    let isActive = true;

    const poll = async () => {
      // Stop if already in terminal state
      if (status.status === "completed" || status.status === "failed") return;

      try {
        const res = await getVideoStatus(video.id);
        if (!res?.status || !isActive) return;

        setStatus({ status: res.status, progress: res.progress ?? 0 });

        // Download and set video source when completed
        if (res.status === "completed") {
          const savePath = `${projectPath}/${video.id}.mp4`;
          try {
            await downloadVideo(video.id, savePath);
            if (isActive) {
              setVideoSrc(convertFileSrc(savePath));
            }
          } catch (error) {
            if (isActive) {
              toast.error("Failed to download", {
                description: error instanceof Error ? error.message : String(error),
              });
            }
          }
        }
      } catch {
        // Silently ignore errors
      }
    };

    poll();
    const timer = window.setInterval(poll, STATUS_POLL_INTERVAL);

    return () => {
      isActive = false;
      clearInterval(timer);
    };
  }, [video.id, projectPath, status.status, getVideoStatus, downloadVideo]);

  const isGenerating = status.status === "queued" || status.status === "processing";
  const hasFailed = status.status === "failed" || status.status === "error" || status.status === "timeout";

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

        {/* Generating overlay */}
        {isGenerating && (
          <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-1 text-white">
            <Loader2 className="size-4 animate-spin" />
            <span className="text-[10px] capitalize">{status.status}</span>
            <div className="w-3/4 space-y-0.5">
              <div className="flex justify-between text-[9px]">
                <span>{status.progress}%</span>
              </div>
              <Progress value={status.progress} className="h-0.5 bg-white/20" />
            </div>
          </div>
        )}

        {/* Failed overlay */}
        {hasFailed && (
          <div className="absolute inset-0 bg-red-950/60 flex flex-col items-center justify-center gap-1 text-red-200">
            <AlertCircle className="size-4" />
            <span className="text-[10px]">Failed</span>
          </div>
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
