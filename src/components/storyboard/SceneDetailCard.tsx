import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2 } from 'lucide-react';
import { TextEditor } from './TextEditor';
import { type Scene } from '@/hooks/tauri/use-storyboard';
import { type VideoSettings, calculateCost } from '@/components/VideoSettings';

interface SceneDetailCardProps {
  scene: Scene;
  sceneNumber: number;
  videoSettings: VideoSettings;
  onUpdateScene: (id: string, field: keyof Scene, value: string) => void;
  onDeleteScene: (id: string) => void;
}

export function SceneDetailCard({
  scene,
  sceneNumber,
  videoSettings,
  onUpdateScene,
  onDeleteScene,
}: SceneDetailCardProps) {
  const sceneDuration = parseInt(scene.duration.replace('s', ''), 10);
  const sceneCost = calculateCost({
    ...videoSettings,
    duration: sceneDuration,
  });

  return (
    <Card className="flex flex-col h-full p-6 overflow-hidden">
      <div className="flex-shrink-0 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-3">
            {/* Editable Title */}
            <div className="flex items-center gap-2">
              <span className="text-lg font-medium whitespace-nowrap">Scene {sceneNumber}: </span>
              <Input
                value={scene.title}
                onChange={(e) => onUpdateScene(scene.id, 'title', e.target.value)}
                placeholder="Scene title..."
                className="text-lg font-medium h-8 border-0 px-2 -ml-2 focus-visible:ring-1"
              />
            </div>

            {/* Duration and Cost */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <span>Duration:</span>
                <Select
                  value={scene.duration}
                  onValueChange={(value) => onUpdateScene(scene.id, 'duration', value)}
                >
                  <SelectTrigger className="w-15 h-6 text-xs border-0 px-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="4s">4s</SelectItem>
                    <SelectItem value="8s">8s</SelectItem>
                    <SelectItem value="12s">12s</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>Cost: ${sceneCost.toFixed(2)}</div>
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDeleteScene(scene.id)}
            className="h-8 w-8 text-muted-foreground hover:text-destructive flex-shrink-0"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {/* Scene Description */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-muted-foreground">Description</Label>
          <TextEditor
            content={scene.description}
            onChange={(value) => onUpdateScene(scene.id, 'description', value)}
            placeholder="Describe what happens in this scene..."
          />
        </div>
      </div>
    </Card>
  );
}
