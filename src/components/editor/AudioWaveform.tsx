import { memo } from 'react';
import { Loader2 } from 'lucide-react';
import { convertFileSrc } from '@tauri-apps/api/core';
import type { TimelineClip } from '@/types/video-editor';

interface AudioWaveformProps {
  clip: TimelineClip;
  position: number;
  pixelsPerSecond: number;
  waveformPath: string | null;
  isLoading: boolean;
}

export const AudioWaveform = memo(function AudioWaveform({
  clip,
  position,
  pixelsPerSecond,
  waveformPath,
  isLoading,
}: AudioWaveformProps) {
  const leftPx = position * pixelsPerSecond;
  const widthPx = clip.duration * pixelsPerSecond;

  if (isLoading) {
    return (
      <div
        className="absolute flex items-center justify-center bg-muted/30 border border-border rounded-b z-0"
        style={{
          left: `${leftPx}px`,
          width: `${widthPx}px`,
          top: '60%',
          height: '40%',
        }}
      >
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!waveformPath) {
    return null;
  }

  const waveformSrc = convertFileSrc(waveformPath);

  return (
    <div
      className="absolute border border-border rounded-b overflow-hidden bg-transparent z-[1] pointer-events-none"
      style={{
        left: `${leftPx}px`,
        width: `${widthPx}px`,
        top: '66.666%',
        height: '33.333%',
      }}
    >
      <img
        src={waveformSrc}
        alt={`Waveform for ${clip.name}`}
        className="w-full h-full object-cover opacity-70 invert dark:invert-0"
      />
    </div>
  );
});
