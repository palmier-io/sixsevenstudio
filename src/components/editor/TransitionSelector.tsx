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
import { useState, useEffect } from "react";
import { TRANSITIONS } from "@/types/transitions";
import { cn } from "@/lib/utils";

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
    currentTransition?.type || "none"
  );
  
  const clampDuration = (d: number) => Math.max(0.1, Math.min(2, d));
  const [duration, setDuration] = useState(
    currentTransition?.duration ? clampDuration(currentTransition.duration) : 1.0
  );

  // Sync state when popover opens or currentTransition changes
  useEffect(() => {
    if (open) {
      setTransitionType(currentTransition?.type || "none");
      setDuration(currentTransition?.duration ? clampDuration(currentTransition.duration) : 1.0);
    }
  }, [open, currentTransition]);

  const handleApply = () => {
    if (transitionType === "none") {
      onTransitionChange(null);
    } else {
      onTransitionChange({ type: transitionType, duration: clampDuration(duration) });
    }
    setOpen(false);
  };

  const handleTransitionTypeChange = (value: string) => {
    setTransitionType(value);
    if (value === "none" && currentTransition) {
      onTransitionChange(null);
      setOpen(false);
    }
  };

  const handleClear = () => {
    onTransitionChange(null);
    setOpen(false);
    setTransitionType("none");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={currentTransition ? "default" : "outline"}
          size="sm"
          className={cn(
            "h-8 w-8 p-0 rounded-full transition-all",
            currentTransition
              ? "shadow-md"
              : "border-dashed opacity-100 border-muted-foreground/80 bg-muted/30 hover:border-primary hover:bg-muted/50"
          )}
          title={
            currentTransition
              ? `${currentTransition.type} (${currentTransition.duration}s)`
              : "Add transition"
          }
        >
          <Film
            className={cn(
              "h-4 w-4",
              currentTransition ? "" : "text-muted-foreground"
            )}
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Transition Effect</h4>
            <Select value={transitionType} onValueChange={handleTransitionTypeChange}>
              <SelectTrigger>
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
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
              min={0.1}
              max={2}
              step={0.1}
              className="w-full"
              disabled={transitionType === "none"}
            />
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={handleApply} 
              className="flex-1"
              disabled={transitionType === "none" && !!currentTransition}
            >
              {transitionType === "none" ? "Remove" : "Apply"}
            </Button>
            {currentTransition && transitionType !== "none" && (
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
