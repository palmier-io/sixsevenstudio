import { VideoMeta } from "@/hooks/tauri/use-projects";

interface VideoDetailsProps {
  video?: VideoMeta;
}

export function VideoDetails({ video }: VideoDetailsProps) {
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
          </dl>
        </div>
      </div>
    </div>
  );
}
