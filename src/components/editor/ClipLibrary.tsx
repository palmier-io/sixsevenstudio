import { PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { convertFileSrc } from "@tauri-apps/api/core";
import type { VideoClip } from "@/types/video-editor";

interface ClipLibraryProps {
  clips: VideoClip[];
  onClipAdd?: (clip: VideoClip) => void;
}

interface ClipItemProps {
  clip: VideoClip;
  onAdd?: (clip: VideoClip) => void;
}

function ClipItem({ clip, onAdd }: ClipItemProps) {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const videoSrc = clip.videoPath ? `${convertFileSrc(clip.videoPath)}#t=0.1` : null;

  return (
    <div className="relative group max-w-xs">
      <div
        className={cn(
          "relative rounded border bg-card overflow-hidden",
          "hover:border-primary/50 hover:shadow transition-all"
        )}
      >
        <AspectRatio ratio={16 / 9} className="bg-muted">
          {videoSrc ? (
            <video
              src={videoSrc}
              className="w-full h-full object-cover"
              preload="metadata"
              muted
            />
          ) : clip.thumbnail ? (
            <img src={clip.thumbnail} alt={clip.name} className="object-cover w-full h-full" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="size-6 text-muted-foreground"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z"
                />
              </svg>
            </div>
          )}
        </AspectRatio>

        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-1.5">
          <div className="flex items-center justify-between gap-1.5">
            <span className="text-white text-[10px] font-medium truncate flex-1">{clip.name}</span>
            <Badge variant="secondary" className="text-[10px] h-4 px-1 shrink-0">
              {formatTime(clip.originalDuration)}
            </Badge>
          </div>
        </div>
      </div>

      {onAdd && (
        <Button
          size="sm"
          className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg h-7 px-2 text-xs"
          onClick={() => onAdd(clip)}
        >
          <PlusCircle className="h-3 w-3 mr-1" />
          Add
        </Button>
      )}
    </div>
  );
}

export function ClipLibrary({ clips, onClipAdd }: ClipLibraryProps) {
  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Clips</CardTitle>
        <CardDescription className="text-xs">Click to add to timeline</CardDescription>
      </CardHeader>

      <CardContent className="flex-1 overflow-auto px-3">
        <ScrollArea className="h-full">
          {clips.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-sm text-muted-foreground">No clips yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Generate videos in the storyboard to see them here
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {clips.map((clip) => (
                <ClipItem
                  key={clip.id}
                  clip={clip}
                  onAdd={onClipAdd}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
