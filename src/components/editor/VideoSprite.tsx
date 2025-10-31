import { memo } from 'react';
import { Loader2 } from 'lucide-react';
import { convertFileSrc } from '@tauri-apps/api/core';
import type { TimelineClip } from '@/types/video-editor';

interface VideoSpriteProps {
  clip: TimelineClip;
  position: number;
  pixelsPerSecond: number;
  spritePath: string | null;
  isLoading: boolean;
}

export const VideoSprite = memo(function VideoSprite({
  clip,
  position,
  pixelsPerSecond,
  spritePath,
  isLoading,
}: VideoSpriteProps) {
  const leftPx = position * pixelsPerSecond;
  const widthPx = clip.duration * pixelsPerSecond;

  if (isLoading) {
    return (
      <div
        className="absolute top-0 flex items-center justify-center bg-muted/30 border border-border rounded-t z-0"
        style={{
          left: `${leftPx}px`,
          width: `${widthPx}px`,
          height: '60%',
        }}
      >
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!spritePath) {
    return null;
  }

  const spriteSrc = convertFileSrc(spritePath);

  return (
    <div
      className="absolute top-0 border border-border rounded-t overflow-hidden bg-background z-0"
      style={{
        left: `${leftPx}px`,
        width: `${widthPx}px`,
        height: '60%',
      }}
    >
      <img
        src={spriteSrc}
        alt={`Sprite for ${clip.name}`}
        className="w-full h-full"
        style={{ objectFit: 'fill' }}
      />
    </div>
  );
});

