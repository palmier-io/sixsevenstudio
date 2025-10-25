import { Film, LayoutDashboard, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { type Scene } from '@/hooks/tauri/use-storyboard';

export type SelectedView = 'overview' | { type: 'scene'; sceneId: string };

interface SceneListProps {
  scenes: Scene[];
  selectedView: SelectedView;
  onSelectView: (view: SelectedView) => void;
  onAddScene: () => void;
}

export function SceneList({ scenes, selectedView, onSelectView, onAddScene }: SceneListProps) {
  const isOverviewSelected = selectedView === 'overview';

  return (
    <Card className="flex flex-col h-full">
      <div className="p-3 border-b flex-shrink-0 flex items-center justify-between">
        <h2 className="text-sm font-semibold px-2">Scenes</h2>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={onAddScene}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {/* Overview Button */}
          <Button
            variant={isOverviewSelected ? 'secondary' : 'ghost'}
            className="w-full justify-start gap-2 h-9"
            onClick={() => onSelectView('overview')}
          >
            <LayoutDashboard className="h-4 w-4" />
            <span className="text-sm">Overview</span>
          </Button>

          {/* Scene Items */}
          {scenes.map((scene, index) => {
            const isSelected =
              typeof selectedView === 'object' &&
              selectedView.type === 'scene' &&
              selectedView.sceneId === scene.id;

            return (
              <Button
                key={scene.id}
                variant={isSelected ? 'secondary' : 'ghost'}
                className="w-full justify-start gap-2 h-9"
                onClick={() => onSelectView({ type: 'scene', sceneId: scene.id })}
              >
                <Film className="h-4 w-4" />
                <span className="text-sm truncate">Scene {index + 1}</span>
              </Button>
            );
          })}
        </div>
      </ScrollArea>
    </Card>
  );
}
