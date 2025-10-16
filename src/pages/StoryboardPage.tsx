import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Separator } from '@/components/ui/separator';
import { Plus, ArrowUp, Trash2, Loader2 } from 'lucide-react';
import { useProjects, type Scene } from '@/hooks/tauri/use-projects';
import { toast } from 'sonner';

const SAVE_AFTER_IDLE_SECONDS = 5000; // 5 seconds

export default function StoryboardPage() {
  const location = useLocation();
  const { getStoryboard, saveStoryboard } = useProjects();

  const [scenes, setScenes] = useState<Scene[]>([]);
  const [animationStyle, setAnimationStyle] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [projectName, setProjectName] = useState<string | null>(null);

  // Load storyboard data on mount
  useEffect(() => {
    const loadStoryboard = async () => {
      try {
        const state = location.state as { projectName?: string; prompt?: string } | null;
        const name = state?.projectName;

        if (!name) {
          toast.error('No project specified');
          setIsLoading(false);
          return;
        }

        setProjectName(name);

        const data = await getStoryboard(name);

        if (data) {
          setScenes(data.scenes);
          setAnimationStyle(data.animation_style);
        } else {
          // Initialize with default first scene if no data exists
          setScenes([{
            id: '1',
            title: 'Scene 1',
            description: state?.prompt || '',
            duration: '3s',
          }]);
          setAnimationStyle('Animation in Japanese anime style');
        }
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        toast.error('Failed to load storyboard', { description: errMsg });
      } finally {
        setIsLoading(false);
      }
    };

    loadStoryboard();
  }, [location.state, getStoryboard]);

  // Auto-save storyboard when scenes or animation style changes
  useEffect(() => {
    if (!projectName || isLoading) return;

    const saveData = async () => {
      try {
        await saveStoryboard(projectName, {
          scenes,
          animation_style: animationStyle,
        });
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        console.error('Failed to save storyboard:', errMsg);
      }
    };

    // Debounce save to avoid too many writes
    const timeoutId = setTimeout(saveData, SAVE_AFTER_IDLE_SECONDS);
    return () => clearTimeout(timeoutId);
  }, [scenes, animationStyle, projectName, isLoading, saveStoryboard]);

  const addScene = () => {
    const newScene: Scene = {
      id: String(scenes.length + 1),
      title: `Scene ${scenes.length + 1}`,
      description: '',
      duration: '3s',
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

  if (!projectName) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <div className="text-center">
          <h3 className="text-lg font-medium mb-2">No project found</h3>
          <p className="text-sm text-muted-foreground">Please create a new storyboard from the home page.</p>
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
          <div className="p-6 flex-shrink-0 flex items-center justify-between">
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

          <ScrollArea className="flex-1 px-6 min-h-0">
            <div className="space-y-6 pb-6">
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

      {/* Bottom Bar */}
      <div className="flex-shrink-0 flex items-center justify-center gap-3 px-6 py-6 border-t">
        <div className="relative max-w-2xl w-full">
          <Input
            value={animationStyle}
            onChange={(e) => setAnimationStyle(e.target.value)}
            className="w-full pr-12 h-12 rounded-full"
            placeholder="Describe your animation style..."
          />
          <Button
            size="icon"
            className="absolute right-1 top-1 h-10 w-10 rounded-full"
          >
            <ArrowUp className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
