import { useState, useEffect } from "react";
import { PlusCircle, Upload, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { convertFileSrc } from "@tauri-apps/api/core";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { VideoClip } from "@/types/video-editor";

interface ClipLibraryProps {
  clips: VideoClip[];
  onClipAdd?: (clip: VideoClip) => void;
  projectName: string;
  onImportVideo?: () => Promise<VideoClip>;
  onLoadImportedVideos?: () => Promise<VideoClip[]>;
  onDeleteImportedVideo?: (videoId: string) => Promise<void>;
}

interface ClipItemProps {
  clip: VideoClip;
  onAdd?: (clip: VideoClip) => void;
  onDelete?: (clip: VideoClip) => void;
}

function ClipItem({ clip, onAdd, onDelete }: ClipItemProps) {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const videoSrc = clip.videoPath ? `${convertFileSrc(clip.videoPath)}#t=0.1` : null;

  return (
    <div className="relative group w-full">
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

      {onDelete && (
        <Button
          variant="secondary"
          size="icon-sm"
          className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
          onClick={() => onDelete(clip)}
        >
          <Trash2 className="size-3" />
        </Button>
      )}
    </div>
  );
}

export function ClipLibrary({ clips, onClipAdd, projectName, onImportVideo, onLoadImportedVideos, onDeleteImportedVideo }: ClipLibraryProps) {
  const [activeTab, setActiveTab] = useState<"sora" | "import">("sora");
  const [importedClips, setImportedClips] = useState<VideoClip[]>([]);

  // Load imported videos on mount and when project changes
  useEffect(() => {
    if (!onLoadImportedVideos) return;

    const loadImportedVideos = async () => {
      try {
        const videos = await onLoadImportedVideos();
        setImportedClips(videos);
      } catch (error) {
        console.error("Failed to load imported videos:", error);
      }
    };

    loadImportedVideos();
  }, [projectName, onLoadImportedVideos]);

  const handleFilePicker = () => {
    if (!onImportVideo) {
      toast.error("Import functionality not available");
      return;
    }

    // This will open the Tauri file dialog
    onImportVideo().then((clip) => {
      setImportedClips((prev) => [...prev, clip]);
      toast.success("Video imported successfully");
    }).catch((error) => {
      const errMsg = error instanceof Error ? error.message : String(error);
      if (!errMsg.includes("cancelled")) {
        toast.error("Failed to import video", { description: errMsg });
      }
    });
  };

  const handleDeleteImported = async (videoId: string) => {
    if (!onDeleteImportedVideo) {
      toast.error("Delete functionality not available");
      return;
    }

    try {
      await onDeleteImportedVideo(videoId);
      setImportedClips((prev) => prev.filter((clip) => clip.id !== videoId));
      toast.success("Video removed");
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      toast.error("Failed to delete video", { description: errMsg });
    }
  };

  return (
    <Card className="h-full flex flex-col overflow-hidden">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "sora" | "import")} className="flex-1 min-h-0 flex flex-col">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-col">
              <CardTitle className="text-base">Media</CardTitle>
            </div>
            <TabsList className="w-fit h-7 p-[2px]">
              <TabsTrigger 
                value="sora" 
                className="text-xs h-full px-2 gap-1.5"
              >
                <Sparkles className="size-3" />
                Sora
              </TabsTrigger>
              <TabsTrigger value="import" className="text-xs h-full px-2 gap-1.5">
                <Upload className="size-3" />
                Import
              </TabsTrigger>
            </TabsList>
          </div>
          {activeTab === "import" && (
            <div className="flex justify-end mt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleFilePicker}
                className="h-7 px-2 text-xs"
              >
                <Upload className="size-3 mr-1" />
                Browse
              </Button>
            </div>
          )}
        </CardHeader>

        <CardContent className="flex-1 flex flex-col overflow-hidden pl-3 pr-1 pt-0 min-h-0">
          <TabsContent value="sora" className="flex-1 flex flex-col min-h-0 mt-0 overflow-hidden">
            <div className="flex-1 min-h-0 overflow-hidden">
              <ScrollArea className="h-full w-full" type="auto">
                {clips.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="size-16 rounded-full bg-muted flex items-center justify-center mb-3">
                      <Sparkles className="size-8 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium text-foreground">No media yet</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Generate videos in the storyboard to see them here
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 pb-2 pr-2">
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
            </div>
          </TabsContent>

          <TabsContent value="import" className="flex-1 flex flex-col min-h-0 mt-0 overflow-hidden">
            <div className="flex-1 min-h-0 overflow-hidden">
              <ScrollArea className="h-full w-full" type="auto">
                {importedClips.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="size-16 rounded-full bg-muted flex items-center justify-center mb-3">
                      <Upload className="size-8 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium text-foreground">No imported videos yet</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Click Browse to import your own video files
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 pb-2 pr-2">
                    {importedClips.map((clip) => (
                      <ClipItem
                        key={clip.id}
                        clip={clip}
                        onAdd={onClipAdd}
                        onDelete={(item) => handleDeleteImported(item.id)}
                      />
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </TabsContent>
        </CardContent>
      </Tabs>
    </Card>
  );
}
