import { cn } from "@/lib/utils";
import type { TimelineClip as TimelineClipType } from "@/types/video-editor";

interface TimelineClipProps {
  clip: TimelineClipType;
  isSelected: boolean;
  onClick: () => void;
  position: number; // Position in seconds from timeline start
  pixelsPerSecond: number;
}

export function TimelineClip({
  clip,
  isSelected,
  onClick,
  position,
  pixelsPerSecond
}: TimelineClipProps) {
  // Calculate position and width in pixels
  const leftPx = position * pixelsPerSecond;
  const widthPx = clip.duration * pixelsPerSecond;

  return (
    <div
      className={cn(
        "absolute top-0 h-full p-2 border rounded cursor-pointer transition-colors overflow-hidden",
        isSelected
          ? "border-primary bg-primary/40"
          : "border-border bg-card hover:bg-accent"
      )}
      style={{
        left: `${leftPx}px`,
        width: `${widthPx}px`,
      }}
      onClick={onClick}
    >
      <div className="text-xs font-medium truncate">{clip.name}</div>
      <div className="text-xs text-muted-foreground">
        {clip.duration.toFixed(1)}s
      </div>
    </div>
  );
}
