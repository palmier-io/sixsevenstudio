import { Card } from '@/components/ui/card';
import { TextEditor } from './TextEditor';
import { type VideoSettings, calculateCost } from '@/components/VideoSettings';
import { type Scene } from '@/hooks/tauri/use-storyboard';

interface OverviewCardProps {
  globalContext: string;
  scenes: Scene[];
  videoSettings: VideoSettings;
  onGlobalContextChange: (value: string) => void;
}

export function OverviewCard({
  globalContext,
  scenes,
  videoSettings,
  onGlobalContextChange,
}: OverviewCardProps) {

  // Calculate total duration and cost
  const totalSeconds = scenes.reduce((total, scene) => {
    const match = scene.duration.match(/(\d+)s/);
    const seconds = match ? parseInt(match[1], 10) : 0;
    return total + seconds;
  }, 0);

  const totalCost = scenes.reduce((total, scene) => {
    const sceneDuration = parseInt(scene.duration.replace('s', ''), 10);
    const sceneCost = calculateCost({
      ...videoSettings,
      duration: sceneDuration,
    });
    return total + sceneCost;
  }, 0);

  return (
    <Card className="flex flex-col h-full p-6 overflow-hidden">
      <div className="flex-shrink-0 mb-6">
        <h2 className="text-lg font-medium mb-4">Project Overview</h2>

        {/* Stats */}
        <div className="flex gap-6 text-sm text-muted-foreground">
          <div>Duration: {totalSeconds}s</div>
          <div>Cost: ${totalCost.toFixed(2)}</div>
          <div>Scenes: {scenes.length}</div>
        </div>
      </div>

      <div className="flex-1 overflow-auto space-y-6">
        {/* Global Context */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">Global Context</h3>
          <TextEditor
            content={globalContext}
            onChange={onGlobalContextChange}
            placeholder="Describe the overall style, characters, setting, and tone for your video..."
          />
        </div>
      </div>
    </Card>
  );
}
