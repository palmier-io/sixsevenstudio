import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Plus, Trash2 } from 'lucide-react';
import { GeneratingStatus } from '@/components/GeneratingStatus';
import { type VideoSettings, calculateCost } from '@/components/VideoSettings';
import { type Scene } from '@/hooks/tauri/use-storyboard';

interface StoryboardEditorProps {
  scenes: Scene[];
  globalContext: string;
  totalSeconds: number;
  videoSettings: VideoSettings;
  onGlobalContextChange: (value: string) => void;
  onAddScene: () => void;
  onDeleteScene: (id: string) => void;
  onUpdateScene: (id: string, field: keyof Scene, value: string) => void;
  isGenerating?: boolean;
}

export function StoryboardEditor({
  scenes,
  globalContext,
  totalSeconds,
  videoSettings,
  onGlobalContextChange,
  onAddScene,
  onDeleteScene,
  onUpdateScene,
  isGenerating,
}: StoryboardEditorProps) {
  const totalCost = scenes.reduce((total, scene) => {
    const sceneDuration = parseInt(scene.duration.replace('s', ''), 10);
    const sceneCost = calculateCost({
      ...videoSettings,
      duration: sceneDuration,
    });
    return total + sceneCost;
  }, 0);

  return (
    <Card className="flex flex-col h-full min-h-0 relative">
      <GeneratingStatus isGenerating={isGenerating || false} className="text-base">
        <div className="text-xs text-white/70">
          Generating your storyboard
        </div>
      </GeneratingStatus>
      <div className="p-6 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-medium">Draft your video</h2>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">duration: {totalSeconds}s</span>
            <span className="text-sm text-muted-foreground">cost: ${totalCost.toFixed(2)}</span>
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
        <div className="space-y-4 pb-6">
          {/* Global Context Section */}
          <div className="space-y-1.5">
            <h3 className="text-sm font-medium text-muted-foreground">Global Context</h3>
            <Textarea
              value={globalContext}
              onChange={(e) => onGlobalContextChange(e.target.value)}
              className="min-h-[150px] resize-none"
              placeholder="Describe the global context (style, characters, setting)..."
            />
          </div>

          <Separator />

          {/* Scenes Section */}
          {scenes.map((scene, index) => (
            <div key={scene.id} className="space-y-2">
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
                className="min-h-[150px] resize-none"
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
