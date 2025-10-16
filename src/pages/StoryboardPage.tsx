import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Separator } from '@/components/ui/separator';
import { Plus, ArrowUp, Trash2 } from 'lucide-react';

interface Scene {
  id: string;
  title: string;
  description: string;
  duration: string;
}

export default function StoryboardPage() {
  const [scenes, setScenes] = useState<Scene[]>([
    {
      id: '1',
      title: 'Scene 1',
      description: 'A low-angle wide shot. Translucent, glowing foxtails fill the foreground, bathed in a soft halo of light. In the middle ground, a boy and a girl stand hand-in-hand, their profiles outlined against the vast, twilight sky as brilliant meteors streak across it. A gentle breeze rustles the field.',
      duration: '3s',
    },
    {
      id: '2',
      title: 'Scene 2',
      description: 'Cut to a close-up of their intertwined hands. The camera slowly focuses, highlighting the subtle pressure of his fingers against hers. The light from a passing meteor briefly illuminates their hands with a blue glow.',
      duration: '3s',
    },
    {
      id: '3',
      title: 'Scene 3',
      description: 'Close-up on the girl\'s face. She turns her head slightly towards him, her eyes reflecting the celestial light. She speaks softly, her voice barely above a whisper. Girl: "Did you see that? It was beautiful."',
      duration: '3s',
    },
    {
      id: '4',
      title: 'Scene 4',
      description: 'The camera shifts to a close-up of the boy\'s face. He doesn\'t look at the sky, but keeps his gaze fixed on her. A small, gentle smile forms on his lips. Boy: "I see something even more beautiful."',
      duration: '3s',
    },
    {
      id: '5',
      title: 'Scene 5',
      description: 'Medium shot of both of them. Hearing his words, she turns to face him fully, a faint blush visible on her cheeks. The wind gently lifts a strand of her hair. He raises his free hand as if to tuck it back.',
      duration: '3s',
    },
  ]);

  const [animationStyle, setAnimationStyle] = useState('Animation in Japanese anime style');

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
            <h2 className="text-lg font-medium">Draft your video</h2>
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
        <Button
          onClick={addScene}
          size="icon"
          variant="outline"
          className="rounded-full w-10 h-10"
        >
          <Plus className="h-5 w-5" />
        </Button>

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
