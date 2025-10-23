import { useEffect, useState } from "react";
import { VideoGalleryItem } from "@/components/VideoGalleryItem";
import { VideoMeta } from "@/hooks/tauri/use-projects";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import { toast } from "sonner";

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
  const [api, setApi] = useState<CarouselApi>();

  useEffect(() => {
    if (!api) return;

    api.on("select", () => {
      toast.info("Carousel api selected")
      const selectedIndex = api.selectedScrollSnap();
      toast.info(`Selected index: ${selectedIndex}`);
      const selectedVideo = videos[selectedIndex];
      if (selectedVideo) {
        toast.info(`Selected video: ${selectedVideo.id}`);
        onVideoSelect(selectedVideo);
      }
    });
  }, [api, videos, onVideoSelect]);

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 pt-2 pb-1 flex-shrink-0">
        <h3 className="text-sm font-semibold">Video Gallery</h3>
      </div>
      <div className="flex-1 min-h-0 flex items-center px-16 py-2 overflow-visible">
        {videos.length === 0 ? (
          <div className="w-full flex items-center justify-center">
            <p className="text-sm text-muted-foreground">
              No videos yet. Start generating to see them here.
            </p>
          </div>
        ) : (
          <Carousel
            opts={{
              align: "start",
              loop: false,
            }}
            setApi={setApi}
            className="w-full"
          >
            <CarouselContent className="-ml-4">
              {videos.map((video) => (
                <CarouselItem key={video.id} className="pl-4 basis-auto">
                  <div className="w-48 md:w-56 lg:w-64">
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
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
        )}
      </div>
    </div>
  );
}
