import { VideoMeta } from "@/hooks/tauri/use-projects";
import { Button } from "@/components/ui/button";
import { RemixPopover } from "@/components/videos/RemixPopover";
import { RotateCw } from "lucide-react";

interface VideoDetailsProps {
  video?: VideoMeta;
  onRegenerate?: () => void;
  onRemix?: (remixPrompt: string) => void;
}

export function VideoDetails({ video, onRegenerate, onRemix }: VideoDetailsProps) {
  if (!video) {
    return (
      <div className="h-full overflow-auto p-6">
        <div>
          <h2 className="text-lg font-semibold mb-2">Original Prompt</h2>
          <p className="text-sm text-muted-foreground">No prompt available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-6">
      <div className="space-y-6">
        {/* Action Buttons */}
        <div className="flex gap-2">
          {onRegenerate && (
            <Button
              onClick={onRegenerate}
              variant="outline"
              size="sm"
              className="w-fit"
            >
              <RotateCw className="size-3 mr-1.5" />
              Regenerate
            </Button>
          )}
          {onRemix && <RemixPopover onRemix={onRemix} />}
        </div>

        {/* Scene Information (if available) */}
        {video.scene_number && video.scene_title && (
          <div>
            <p className="text-sm font-medium">Scene {video.scene_number} - {video.scene_title}</p>
          </div>
        )}

        <div>
          <h2 className="text-lg font-semibold mb-2">Original Prompt</h2>
          <p className="text-sm text-muted-foreground">
            {video.prompt}
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-3">Video Metadata</h2>
          <dl className="space-y-2">
            <div className="flex justify-between text-sm">
              <dt className="text-muted-foreground">Model:</dt>
              <dd className="font-medium">{video.model}</dd>
            </div>
            <div className="flex justify-between text-sm">
              <dt className="text-muted-foreground">Resolution:</dt>
              <dd className="font-medium">{video.resolution}</dd>
            </div>
            <div className="flex justify-between text-sm">
              <dt className="text-muted-foreground">Duration:</dt>
              <dd className="font-medium">{video.duration}s</dd>
            </div>
            {video.sample_number && (
              <div className="flex justify-between text-sm">
                <dt className="text-muted-foreground">Sample:</dt>
                <dd className="font-medium">#{video.sample_number}</dd>
              </div>
            )}
            {video.remixed_from_video_id && (
              <div className="flex justify-between text-sm">
                <dt className="text-muted-foreground">Remixed from:</dt>
                <dd className="font-medium text-xs truncate">{video.remixed_from_video_id}</dd>
              </div>
            )}
          </dl>
        </div>

        {video.remix_prompt && (
          <div>
            <h2 className="text-lg font-semibold mb-2">Remix Prompt</h2>
            <p className="text-sm text-muted-foreground">
              {video.remix_prompt}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
