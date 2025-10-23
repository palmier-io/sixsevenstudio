import { VideoMeta } from "@/hooks/tauri/use-projects";
import { Button } from "@/components/ui/button";
import { RotateCw } from "lucide-react";

interface VideoDetailsProps {
  video?: VideoMeta;
  onRegenerate?: () => void;
}

export function VideoDetails({ video, onRegenerate }: VideoDetailsProps) {
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
        {/* Regenerate Button */}
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
          </dl>
        </div>
      </div>
    </div>
  );
}
