import { cn } from "@/lib/utils";
import type { TimelineClip as TimelineClipType } from "@/types/video-editor";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

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
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: clip.id });

  // Calculate position and width in pixels
  const leftPx = position * pixelsPerSecond;
  const widthPx = clip.duration * pixelsPerSecond;

  const style = {
    left: `${leftPx}px`,
    width: `${widthPx}px`,
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "absolute top-0 h-full p-2 border rounded cursor-grab active:cursor-grabbing transition-colors overflow-hidden",
        isSelected
          ? "border-primary bg-primary/40"
          : "border-border bg-card hover:bg-accent"
      )}
      style={style}
      onClick={onClick}
      {...attributes}
      {...listeners}
    >
      <div className="text-xs font-medium truncate">{clip.name}</div>
      <div className="text-xs text-muted-foreground">
        {clip.duration.toFixed(1)}s
      </div>
    </div>
  );
}
