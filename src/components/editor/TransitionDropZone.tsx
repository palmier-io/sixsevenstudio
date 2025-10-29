import { useState } from "react";
import { Film, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { TransitionType } from "@/types/transitions";

interface TransitionDropZoneProps {
  position: number;
  pixelsPerSecond: number;
  currentTransition?: { type: string; duration: number };
  onTransitionDrop: (transition: TransitionType) => void;
  onTransitionRemove: () => void;
}

export function TransitionDropZone({
  position,
  pixelsPerSecond,
  currentTransition,
  onTransitionDrop,
  onTransitionRemove,
}: TransitionDropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    try {
      const data = e.dataTransfer.getData("application/transition");
      if (data) {
        const transition: TransitionType = JSON.parse(data);
        onTransitionDrop(transition);
      }
    } catch (error) {
      console.error("Failed to parse transition data:", error);
    }
  };

  return (
    <div
      className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-20"
      style={{ left: `${position * pixelsPerSecond}px` }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div
        className={cn(
          "flex items-center justify-center rounded-full shadow-md border-2 transition-all",
          isDragOver
            ? "h-12 w-12 bg-primary border-primary scale-110"
            : currentTransition
            ? "h-8 w-8 bg-primary border-primary/50"
            : "h-8 w-8 bg-background border-border hover:border-primary/50 hover:scale-110"
        )}
      >
        {currentTransition ? (
          <div className="relative group">
            <Film className="h-4 w-4 text-primary-foreground" />
            <button
              onClick={(e) => {
                e.stopPropagation();
                onTransitionRemove();
              }}
              className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
              title="Remove transition"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <Film
            className={cn(
              "h-4 w-4 transition-colors",
              isDragOver ? "text-primary-foreground" : "text-muted-foreground"
            )}
          />
        )}
      </div>
      {isDragOver && (
        <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 text-xs whitespace-nowrap bg-primary text-primary-foreground px-2 py-1 rounded">
          Drop to add transition
        </div>
      )}
      {currentTransition && !isDragOver && (
        <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 text-xs whitespace-nowrap bg-background border border-border px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          {currentTransition.type} ({currentTransition.duration}s)
        </div>
      )}
    </div>
  );
}
