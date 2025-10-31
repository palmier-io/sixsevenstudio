import { cn } from "@/lib/utils";
import type { TimelineClip as TimelineClipType } from "@/types/video-editor";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AudioWaveform } from "./AudioWaveform";
import { VideoSprite } from "./VideoSprite";

interface TimelineClipProps {
  clip: TimelineClipType;
  isSelected: boolean;
  onClick: () => void;
  position: number; // Position in seconds from timeline start
  pixelsPerSecond: number;
  waveformPath?: string | null;
  spritePath?: string | null;
  isWaveformLoading?: boolean;
  isSpriteLoading?: boolean;
}

export function TimelineClip({
  clip,
  isSelected,
  onClick,
  position,
  pixelsPerSecond,
  waveformPath,
  spritePath,
  isWaveformLoading = false,
  isSpriteLoading = false,
}: TimelineClipProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: clip.id });

  const leftPx = position * pixelsPerSecond;
  const widthPx = clip.duration * pixelsPerSecond;

  const style = {
    left: `${leftPx}px`,
    width: `${widthPx}px`,
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <>
      {spritePath !== undefined && (
        <VideoSprite
          clip={clip}
          position={position}
          pixelsPerSecond={pixelsPerSecond}
          spritePath={spritePath}
          isLoading={isSpriteLoading}
        />
      )}
      {waveformPath !== undefined && (
        <AudioWaveform
          clip={clip}
          position={position}
          pixelsPerSecond={pixelsPerSecond}
          waveformPath={waveformPath}
          isLoading={isWaveformLoading}
        />
      )}
      <div
        ref={setNodeRef}
        className={cn(
          "absolute top-0 h-full p-1.5 border rounded cursor-grab active:cursor-grabbing transition-colors overflow-hidden flex flex-col z-10 pointer-events-auto bg-transparent",
          isSelected
            ? "border-primary"
            : "border-border hover:border-primary/50"
        )}
        style={style}
        onClick={onClick}
        {...attributes}
        {...listeners}
      >
        <div className="text-[10px] font-medium truncate drop-shadow-lg text-white">
          {clip.name}
        </div>
        <div className="text-[10px] text-white/90 drop-shadow-lg">
          {clip.duration.toFixed(1)}s
        </div>
      </div>
    </>
  );
}
