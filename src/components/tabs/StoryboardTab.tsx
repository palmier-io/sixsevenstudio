import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Separator } from '@/components/ui/separator';
import { Plus, ArrowUp, Trash2, Loader2, Video } from 'lucide-react';
import { useProjects, type Scene } from '@/hooks/tauri/use-projects';
import { toast } from 'sonner';
import { useVideos } from '@/hooks/tauri/use-videos';
import { VideoSettingsButton, type VideoSettings } from '@/components/VideoSettings';

const SAVE_AFTER_IDLE_SECONDS = 5000; // 5 seconds

interface StoryboardTabProps {
  projectName: string;
}

export function StoryboardTab({ projectName }: StoryboardTabProps) {
  const { getStoryboard, saveStoryboard, getProject, generateStoryboard, getPromptFromStoryboard, addVideosToProject } = useProjects();
  const { createVideo } = useVideos();

  const [scenes, setScenes] = useState<Scene[]>([]);
  const [globalStyle, setGlobalStyle] = useState('');
  const [responseId, setResponseId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefining, setIsRefining] = useState(false);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [videoSettings, setVideoSettings] = useState<VideoSettings>({
    model: 'sora-2',
    resolution: '1280x720',
    duration: 12,
    samples: 1,
  });

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

          // Load response_id from project metadata
          try {
            const projectMeta = await getProject(projectName);
            setResponseId(projectMeta.storyboard_response_id ?? null);
          } catch (err) {
            console.error('Failed to load project metadata:', err);
          }
        } else {
          // Initialize with default first scene if no data exists
          setScenes([{
            id: '1',
            title: 'Scene 1',
            description: '',
            duration: '3s',
          }]);
          setGlobalStyle('Global in Japanese anime style');
        }
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        toast.error('Failed to load storyboard', { description: errMsg });
      } finally {
        setIsLoading(false);
      }
    };

    loadStoryboard();
  }, [projectName, getStoryboard]);

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

  const handleRefineStoryboard = async () => {
    if (!projectName || !feedbackMessage.trim() || isRefining) return;

    try {
      setIsRefining(true);
      toast.info('Refining storyboard with AI...');

      // Use generateStoryboard - it will automatically detect refinement mode
      const refinedData = await generateStoryboard(projectName, feedbackMessage);

      // Update the scenes and global style with refined data
      setScenes(refinedData.scenes);
      setGlobalStyle(refinedData.global_style);
      setFeedbackMessage('');

      toast.success('Storyboard refined successfully!');
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      toast.error('Failed to refine storyboard', { description: errMsg });
    } finally {
      setIsRefining(false);
    }
  };

  const handleGenerateVideo = async () => {
    if (!projectName || isGeneratingVideo) return;

    try {
      setIsGeneratingVideo(true);
      toast.info('Generating video from storyboard...');

      const prompt = await getPromptFromStoryboard(projectName);
      const videoId = await createVideo({
        model: videoSettings.model,
        prompt: prompt,
        size: videoSettings.resolution,
        seconds: String(videoSettings.duration),
      });

      await addVideosToProject(projectName, [{
        id: videoId,
        prompt: '',
        model: videoSettings.model,
        resolution: videoSettings.resolution,
        duration: videoSettings.duration,
        created_at: Date.now(),
      }]);

      toast.success('Video generation started!', {
        description: `Video ID: ${videoId}`,
      });
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      toast.error('Failed to generate video', { description: errMsg });
    } finally {
      setIsGeneratingVideo(false);
    }
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
    <div className="h-full w-full flex flex-col">
      {/* Main Content */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 p-6 min-h-0">
        {/* Left Panel - Starting Frame */}
        <Card className="flex flex-col h-full">
          <div className="p-6 flex flex-col h-full">
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
              <h2 className="text-lg font-medium">Starting frame</h2>
            </div>
            <div className="flex-1 flex items-center justify-center min-h-0">
              <AspectRatio ratio={16 / 9} className="bg-muted rounded-lg overflow-hidden w-full">
                <img
                  src="https://images.unsplash.com/photo-1516339901601-2e1b62dc0c45?w=800&q=80"
                  alt="Starting frame"
                  className="w-full h-full object-cover"
                />
              </AspectRatio>
            </div>
          </div>
        </Card>

        {/* Right Panel - Draft Your Video */}
        <Card className="flex flex-col h-full min-h-0">
          <div className="p-6 flex-shrink-0">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-medium">Draft your video</h2>
              <Button
                onClick={addScene}
                size="icon"
                variant="outline"
                className="rounded-full w-8 h-8"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <ScrollArea className="flex-1 px-6 min-h-0">
            <div className="space-y-6 pb-6">
              {/* Global Style Section */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">Global Style</h3>
                <Textarea
                  value={globalStyle}
                  onChange={(e) => setGlobalStyle(e.target.value)}
                  className="min-h-[80px] resize-none"
                  placeholder="Describe the overall global style..."
                />
              </div>

              <Separator />

              {/* Scenes Section */}
              {scenes.map((scene, index) => (
                <div key={scene.id} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-muted-foreground">{scene.title}</h3>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        {scene.duration}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteScene(scene.id)}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <Textarea
                    value={scene.description}
                    onChange={(e) => updateScene(scene.id, 'description', e.target.value)}
                    className="min-h-[100px] resize-none"
                    placeholder="Describe this scene..."
                  />
                  {index < scenes.length - 1 && (
                    <Separator />
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </Card>
      </div>

      {/* Bottom Bar - AI Feedback Input */}
      <div className="flex-shrink-0 border-t bg-background">
        <div className="px-6 py-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <label className="text-sm font-medium text-muted-foreground mb-2 block">
                </label>
                <div className="relative">
                  <Input
                    value={feedbackMessage}
                    onChange={(e) => setFeedbackMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleRefineStoryboard();
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
                    onClick={handleRefineStoryboard}
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
                  onClick={handleGenerateVideo}
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
                  onSettingsChange={setVideoSettings}
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
    </div>
  );
}
