import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Separator } from '@/components/ui/separator';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { Plus, ArrowUp, Trash2, Loader2, Video, Image as ImageIcon, X } from 'lucide-react';
import { useProjects, type Scene } from '@/hooks/tauri/use-projects';
import { toast } from 'sonner';
import { useVideos } from '@/hooks/tauri/use-videos';
import { VideoSettingsButton, type VideoSettings } from '@/components/VideoSettings';
import { DEFAULT_VIDEO_SETTINGS, STARTING_FRAME_FILENAME } from '@/types/constants';
import { convertFileSrc } from '@tauri-apps/api/core';

const SAVE_AFTER_IDLE_SECONDS = 5000; // 5 seconds

interface StoryboardTabProps {
  projectName: string;
}

// Starting Frame Panel Component
function StartingFramePanel({
  projectName,
  onImageUpload,
  onImageDelete,
  onImageLoad,
}: {
  projectName: string;
  onImageUpload: (base64Data: string) => Promise<string>;
  onImageDelete: () => Promise<void>;
  onImageLoad: () => Promise<string | null>;
}) {
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);

  // Shared function to process image files
  const processImageFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Invalid file type', { description: 'Please select an image file' });
      return;
    }

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        const base64Data = base64String.split(',')[1];

        try {
          if (imagePreviewUrl && imagePreviewUrl.startsWith('blob:')) {
            URL.revokeObjectURL(imagePreviewUrl);
          }

          const imagePath = await onImageUpload(base64Data);
          setImagePreviewUrl(convertFileSrc(imagePath));
          toast.success('Image uploaded successfully');
        } catch (error) {
          const errMsg = error instanceof Error ? error.message : String(error);
          toast.error('Failed to upload image', { description: errMsg });
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      toast.error('Failed to process image', { description: errMsg });
    }
  };

  const handlePickImage = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processImageFile(file);
    }
  };

  const handleClearImage = async () => {
    if (imagePreviewUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreviewUrl);
    }
    setImagePreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';

    try {
      await onImageDelete();
      toast.success('Image removed');
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error('Failed to delete image:', errMsg);
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer.items?.length) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounterRef.current = 0;

    const files = e.dataTransfer.files;
    if (files?.length) {
      await processImageFile(files[0]);
    }
  };

  // Load image from metadata on mount
  useEffect(() => {
    const loadImage = async () => {
      const imagePath = await onImageLoad();
      if (imagePath) {
        setImagePreviewUrl(convertFileSrc(imagePath));
      }
    };
    loadImage();
  }, [projectName, onImageLoad]);

  // Paste handler
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) {
            e.preventDefault();
            await processImageFile(file);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [onImageUpload]);
  return (
    <Card className="flex flex-col h-full">
      <div className="p-6 flex flex-col h-full">
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <h2 className="text-lg font-medium">Starting frame</h2>
          {imagePreviewUrl && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClearImage}
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <div
          className="flex-1 flex items-center justify-center min-h-0 overflow-hidden"
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <AspectRatio ratio={1 / 1} className="bg-muted rounded-lg overflow-hidden w-full relative">
            {imagePreviewUrl ? (
              <img
                src={imagePreviewUrl}
                alt="Starting frame"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-3 p-6 text-center">
                <Button variant="outline" onClick={handlePickImage} className="gap-2">
                  <ImageIcon className="h-4 w-4" />
                  Upload Image
                </Button>
                <p className="text-sm text-muted-foreground">
                  or drag and drop, or paste an image
                </p>
              </div>
            )}
            {isDragging && (
              <div className="absolute inset-0 bg-primary/10 border-2 border-dashed border-primary flex items-center justify-center backdrop-blur-sm">
                <div className="text-primary font-medium">Drop image here</div>
              </div>
            )}
          </AspectRatio>
        </div>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
    </Card>
  );
}

// Storyboard Editor Component
function StoryboardEditor({
  scenes,
  globalStyle,
  totalSeconds,
  onGlobalStyleChange,
  onAddScene,
  onDeleteScene,
  onUpdateScene,
}: {
  scenes: Scene[];
  globalStyle: string;
  totalSeconds: number;
  onGlobalStyleChange: (value: string) => void;
  onAddScene: () => void;
  onDeleteScene: (id: string) => void;
  onUpdateScene: (id: string, field: keyof Scene, value: string) => void;
}) {
  return (
    <Card className="flex flex-col h-full min-h-0">
      <div className="p-6 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-medium">Draft your video</h2>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{totalSeconds}s total</span>
            <Button
              onClick={onAddScene}
              size="icon"
              variant="outline"
              className="rounded-full w-8 h-8"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1 px-6 min-h-0">
        <div className="space-y-6 pb-6">
          {/* Global Style Section */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">Global Style</h3>
            <Textarea
              value={globalStyle}
              onChange={(e) => onGlobalStyleChange(e.target.value)}
              className="min-h-[80px] resize-none"
              placeholder="Describe the overall global style..."
            />
          </div>

          <Separator />

          {/* Scenes Section */}
          {scenes.map((scene, index) => (
            <div key={scene.id} className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-muted-foreground">
                  Scene {index + 1}: {scene.title}
                </h3>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{scene.duration}</Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDeleteScene(scene.id)}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <Textarea
                value={scene.description}
                onChange={(e) => onUpdateScene(scene.id, 'description', e.target.value)}
                className="min-h-[100px] resize-none"
                placeholder="Describe this scene..."
              />
              {index < scenes.length - 1 && <Separator />}
            </div>
          ))}
        </div>
      </ScrollArea>
    </Card>
  );
}

// Action Bar Component
function ActionBar({
  responseId,
  scenes,
  videoSettings,
  onVideoSettingsChange,
  onRefineStoryboard,
  onGenerateVideo,
}: {
  responseId: string | null;
  scenes: Scene[];
  videoSettings: VideoSettings;
  onVideoSettingsChange: (settings: VideoSettings) => void;
  onRefineStoryboard: (feedback: string) => Promise<void>;
  onGenerateVideo: (settings: VideoSettings) => Promise<void>;
}) {
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [isRefining, setIsRefining] = useState(false);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);

  const handleRefineClick = async () => {
    if (!feedbackMessage.trim() || isRefining) return;

    try {
      setIsRefining(true);
      await onRefineStoryboard(feedbackMessage);
      setFeedbackMessage('');
      toast.success('Storyboard refined successfully!');
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      toast.error('Failed to refine storyboard', { description: errMsg });
    } finally {
      setIsRefining(false);
    }
  };

  const handleGenerateClick = async () => {
    if (isGeneratingVideo) return;

    try {
      setIsGeneratingVideo(true);
      await onGenerateVideo(videoSettings);
      toast.success('Video generation started!');
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      toast.error('Failed to generate video', { description: errMsg });
    } finally {
      setIsGeneratingVideo(false);
    }
  };
  return (
    <div className="flex-shrink-0 border-t bg-background">
      <div className="px-6 py-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <div className="relative">
                <Input
                  value={feedbackMessage}
                  onChange={(e) => setFeedbackMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleRefineClick();
                    }
                  }}
                  className="w-full pr-12 h-11"
                  placeholder={
                    !responseId
                      ? "Generate a storyboard first to enable AI refinement..."
                      : "Type feedback to refine your storyboard (e.g., 'Make it more dramatic')"
                  }
                  disabled={isRefining || !responseId}
                />
                <Button
                  size="icon"
                  className="absolute right-1 top-1 h-9 w-9"
                  onClick={handleRefineClick}
                  disabled={isRefining || !feedbackMessage.trim() || !responseId}
                >
                  {isRefining ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowUp className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            <div className="flex items-center">
              <Button
                onClick={handleGenerateClick}
                disabled={isGeneratingVideo || scenes.length === 0}
                variant="default"
                className="gap-2 h-11 rounded-r-none border-r-0"
              >
                {isGeneratingVideo ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Video className="h-4 w-4" />
                    Generate Video
                  </>
                )}
              </Button>
              <VideoSettingsButton
                settings={videoSettings}
                onSettingsChange={onVideoSettingsChange}
                variant="default"
                size="icon"
                showSamples={false}
                className="rounded-l-none h-11"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function StoryboardTab({ projectName }: StoryboardTabProps) {
  const { getStoryboard, saveStoryboard, getProject, generateStoryboard, getPromptFromStoryboard, addVideosToProject, saveImage, getImage, deleteImage } = useProjects();
  const { createVideo } = useVideos();

  const [scenes, setScenes] = useState<Scene[]>([]);
  const [globalStyle, setGlobalStyle] = useState('');
  const [responseId, setResponseId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [videoSettings, setVideoSettings] = useState<VideoSettings>(DEFAULT_VIDEO_SETTINGS);

  // Load storyboard data when component mounts
  useEffect(() => {
    const loadStoryboard = async () => {
      if (!projectName) return;

      setIsLoading(true);
      try {
        const data = await getStoryboard(projectName);

        if (data) {
          setScenes(data.scenes);
          setGlobalStyle(data.global_style);
        } else {
          // Initialize with default first scene if no data exists
          setScenes([{
            id: '1',
            title: 'Scene 1',
            description: '',
            duration: '3s',
          }]);
          setGlobalStyle('');
        }

        // Load response_id from project metadata
        try {
          const projectMeta = await getProject(projectName);
          setResponseId(projectMeta.storyboard_response_id ?? null);
        } catch (err) {
          console.error('Failed to load project metadata:', err);
        }
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        toast.error('Failed to load storyboard', { description: errMsg });
      } finally {
        setIsLoading(false);
      }
    };

    loadStoryboard();
  }, [projectName, getStoryboard, getProject]);

  // Auto-save storyboard when scenes or global style changes
  useEffect(() => {
    if (!projectName || isLoading) return;

    const saveData = async () => {
      try {
        await saveStoryboard(projectName, {
          scenes,
          global_style: globalStyle,
        });
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        console.error('Failed to save storyboard:', errMsg);
      }
    };

    // Debounce save to avoid too many writes
    const timeoutId = setTimeout(saveData, SAVE_AFTER_IDLE_SECONDS);
    return () => clearTimeout(timeoutId);
  }, [scenes, globalStyle, projectName, isLoading, saveStoryboard]);

  const addScene = () => {
    const newScene: Scene = {
      id: String(scenes.length + 1),
      title: `Scene ${scenes.length + 1}`,
      description: '',
      duration: '4s',
    };
    setScenes([...scenes, newScene]);
  };

  const deleteScene = (id: string) => {
    setScenes(scenes.filter(scene => scene.id !== id));
  };

  const updateScene = (id: string, field: keyof Scene, value: string) => {
    setScenes(scenes.map(scene =>
      scene.id === id ? { ...scene, [field]: value } : scene
    ));
  };

  // Calculate total seconds from all scenes
  const calculateTotalSeconds = () => {
    return scenes.reduce((total, scene) => {
      const match = scene.duration.match(/(\d+)s/);
      const seconds = match ? parseInt(match[1], 10) : 0;
      return total + seconds;
    }, 0);
  };

  if (isLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading storyboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col overflow-hidden">
      <ResizablePanelGroup direction="vertical">
        {/* Main Content */}
        <ResizablePanel defaultSize={75} minSize={40}>
          <div className="h-full p-6">
            <ResizablePanelGroup direction="horizontal" className="gap-6">
              <ResizablePanel defaultSize={50} minSize={30}>
                <StartingFramePanel
                  projectName={projectName}
                  onImageUpload={async (base64Data) => {
                    return await saveImage(projectName, STARTING_FRAME_FILENAME, base64Data);
                  }}
                  onImageDelete={async () => {
                    await deleteImage(projectName, STARTING_FRAME_FILENAME);
                  }}
                  onImageLoad={async () => {
                    try {
                      return await getImage(projectName, STARTING_FRAME_FILENAME);
                    } catch (err) {
                      console.error('Failed to load image:', err);
                      return null;
                    }
                  }}
                />
              </ResizablePanel>
              <ResizableHandle />
              <ResizablePanel defaultSize={50} minSize={30}>
                <StoryboardEditor
                  scenes={scenes}
                  globalStyle={globalStyle}
                  totalSeconds={calculateTotalSeconds()}
                  onGlobalStyleChange={setGlobalStyle}
                  onAddScene={addScene}
                  onDeleteScene={deleteScene}
                  onUpdateScene={updateScene}
                />
              </ResizablePanel>
            </ResizablePanelGroup>
          </div>
        </ResizablePanel>

        <ResizableHandle />

        <ResizablePanel defaultSize={10} minSize={10}>
          <ActionBar
            responseId={responseId}
            scenes={scenes}
            videoSettings={videoSettings}
            onVideoSettingsChange={setVideoSettings}
            onRefineStoryboard={async (feedback: string) => {
              const refinedData = await generateStoryboard(projectName, feedback);
              setScenes(refinedData.scenes);
              setGlobalStyle(refinedData.global_style);
            }}
            onGenerateVideo={async (settings: VideoSettings) => {
              const prompt = await getPromptFromStoryboard(projectName);
              const projectMeta = await getProject(projectName);
              const imagePath = projectMeta.image_path ? await getImage(projectName, STARTING_FRAME_FILENAME) : undefined;

              const videoId = await createVideo({
                model: settings.model,
                prompt: prompt,
                size: settings.resolution,
                seconds: String(settings.duration),
                inputReferencePath: imagePath || undefined,
              });

              await addVideosToProject(projectName, [{
                id: videoId,
                prompt: '',
                model: settings.model,
                resolution: settings.resolution,
                duration: settings.duration,
                created_at: Date.now(),
              }]);
            }}
          />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
