import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Film, X } from "lucide-react";
import { useState } from "react";
import { TRANSITIONS } from "@/types/transitions";

export interface TransitionConfig {
  type: string;
  duration: number;
}

interface TransitionSelectorProps {
  currentTransition?: TransitionConfig;
  onTransitionChange: (transition: TransitionConfig | null) => void;
}

export function TransitionSelector({
  currentTransition,
  onTransitionChange,
}: TransitionSelectorProps) {
  const [open, setOpen] = useState(false);
  const [transitionType, setTransitionType] = useState(
    currentTransition?.type || "fade"
  );
  const [duration, setDuration] = useState(currentTransition?.duration || 1.0);

  const handleApply = () => {
    onTransitionChange({ type: transitionType, duration });
    setOpen(false);
  };

  const handleClear = () => {
    onTransitionChange(null);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={currentTransition ? "default" : "outline"}
          size="sm"
          className="h-8 w-8 p-0 rounded-full"
          title={
            currentTransition
              ? `${currentTransition.type} (${currentTransition.duration}s)`
              : "Add transition"
          }
        >
          <Film className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Transition Effect</h4>
            <Select value={transitionType} onValueChange={setTransitionType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TRANSITIONS.map((transition) => (
                  <SelectItem key={transition.id} value={transition.id}>
                    {transition.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <h4 className="font-medium text-sm">Duration</h4>
              <span className="text-sm text-muted-foreground">
                {duration.toFixed(1)}s
              </span>
            </div>
            <Slider
              value={[duration]}
              onValueChange={(values: number[]) => setDuration(values[0])}
              min={0.5}
              max={3}
              step={0.1}
              className="w-full"
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={handleApply} className="flex-1">
              Apply
            </Button>
            {currentTransition && (
              <Button
                onClick={handleClear}
                variant="outline"
                size="icon"
                title="Remove transition"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
