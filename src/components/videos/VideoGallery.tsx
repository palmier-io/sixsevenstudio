import { VideoGalleryItem } from "@/components/videos/VideoGalleryItem";
import { VideoMeta } from "@/hooks/tauri/use-projects";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface VideoGalleryProps {
  videos: VideoMeta[];
  selectedVideoId?: string;
  onVideoSelect: (video: VideoMeta) => void;
  onVideoDelete?: (videoId: string) => void;
  onVideoRegenerate?: (video: VideoMeta) => void;
  onVideoRemix?: (video: VideoMeta, remixPrompt: string) => void;
  projectPath: string;
}

export function VideoGallery({
  videos,
  selectedVideoId,
  onVideoSelect,
  onVideoDelete,
  onVideoRegenerate,
  onVideoRemix,
  projectPath,
}: VideoGalleryProps) {
  return (
    <div className="h-full flex flex-col">
      <div className="px-4 pt-2 pb-1 flex-shrink-0">
        <h3 className="text-sm font-semibold">Video Gallery</h3>
      </div>
      <div className="flex-1 min-h-0 px-4 py-2">
        {videos.length === 0 ? (
          <div className="w-full h-full flex items-center justify-center">
            <p className="text-sm text-muted-foreground">
              No videos yet. Start generating to see them here.
            </p>
          </div>
        ) : (
          <ScrollArea className="h-full w-full" type="auto">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 pb-4">
              {videos.map((video) => (
                <div key={video.id} className="w-full">
                  <VideoGalleryItem
                    video={video}
                    projectPath={projectPath}
                    isSelected={selectedVideoId === video.id}
                    onClick={() => onVideoSelect(video)}
                    onDelete={onVideoDelete ? () => onVideoDelete(video.id) : undefined}
                    onRegenerate={onVideoRegenerate ? () => onVideoRegenerate(video) : undefined}
                    onRemix={onVideoRemix ? (remixPrompt: string) => onVideoRemix(video, remixPrompt) : undefined}
                  />
                </div>
              ))}
            </div>
            <ScrollBar orientation="vertical" />
          </ScrollArea>
        )}
      </div>
    </div>
  );
}
