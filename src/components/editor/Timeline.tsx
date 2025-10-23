import { useState, useRef, useEffect, useMemo, useCallback, memo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, Scissors, Download, Loader2 } from "lucide-react";
import { TimelineClip } from "./TimelineClip";
import type { TimelineClip as TimelineClipType } from "@/types/video-editor";

interface TimelineProps {
  clips: TimelineClipType[];
  selectedClipId: string | null;
  onClipSelect: (clipId: string | null) => void;
  onClipDelete: () => void;
  onClipSplit?: (clipId: string, splitTime: number) => void;
  currentTime?: number; // Current playback position in timeline seconds
  onTimelineClick?: (time: number) => void;
  onExport?: () => void;
  isExporting?: boolean;
  canExport?: boolean;
}

export const Timeline = memo(function Timeline({
  clips, selectedClipId, onClipSelect, onClipDelete, onClipSplit, currentTime, onTimelineClick, onExport, isExporting, canExport,
}: TimelineProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [containerWidth, setContainerWidth] = useState(0);
  const timelineRef = useRef<HTMLDivElement>(null);

  const totalDuration = useMemo(() =>
    clips.reduce((sum, clip) => sum + clip.duration, 0), [clips]);

  const pixelsPerSecond = useMemo(() => {
    if (!totalDuration || !containerWidth) return 100;
    const scale = (containerWidth * 0.9) / totalDuration;
    return Math.max(50, Math.min(200, scale)); // Min 50px/s, Max 200px/s
  }, [totalDuration, containerWidth]);

  useEffect(() => {
    if (!timelineRef.current) return;
    const updateWidth = () => timelineRef.current && setContainerWidth(timelineRef.current.clientWidth);
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(timelineRef.current);
    return () => observer.disconnect();
  }, [clips.length]);

  const timeMarkers = useMemo(() => {
    if (!totalDuration) return [];
    const intervals = [1, 2, 5, 10, 15, 30, 60];
    const interval = intervals.find(i => i >= Math.ceil(60 / pixelsPerSecond)) || 60;
    return Array.from({ length: Math.ceil(totalDuration / interval) + 1 }, (_, i) => i * interval);
  }, [totalDuration, pixelsPerSecond]);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;

  const pixelToTime = useCallback((clientX: number) => {
    if (!timelineRef.current) return 0;
    return Math.max(0, (clientX - timelineRef.current.getBoundingClientRect().left) / pixelsPerSecond);
  }, [pixelsPerSecond]);

  const handleTimelineClick = useCallback((e: React.MouseEvent<HTMLDivElement>) =>
    onTimelineClick?.(pixelToTime(e.clientX)), [onTimelineClick, pixelToTime]);

  const handlePlayheadMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation(); e.preventDefault(); setIsDragging(true);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) =>
    onTimelineClick?.(pixelToTime(e.clientX)), [onTimelineClick, pixelToTime]);

  const handleMouseUp = useCallback(() => setIsDragging(false), []);

  useEffect(() => {
    if (!isDragging) return;
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'ew-resize';
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const canSplit = useMemo(() => {
    if (!selectedClipId || currentTime === undefined) return false;
    let time = 0;
    for (const clip of clips) {
      if (clip.id === selectedClipId) {
        return currentTime > time && currentTime < time + clip.duration;
      }
      time += clip.duration;
    }
    return false;
  }, [selectedClipId, currentTime, clips]);

  const handleSplit = useCallback(() => {
    if (canSplit && onClipSplit && selectedClipId && currentTime !== undefined) {
      onClipSplit(selectedClipId, currentTime);
    }
  }, [canSplit, onClipSplit, selectedClipId, currentTime]);

  const Playhead = ({ showHandle = false }: { showHandle?: boolean }) => {
    if (currentTime === undefined || currentTime === null) return null;
    return (
      <div
        className="absolute top-0 bottom-0 w-1 bg-red-500 z-10 cursor-ew-resize -translate-x-1/2"
        style={{ left: `${currentTime * pixelsPerSecond}px` }}
        onMouseDown={handlePlayheadMouseDown}
      >
        {showHandle && (
          <>
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-red-500 rounded-full" />
            {canSplit && (
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-background border border-border rounded px-2 py-1 text-xs whitespace-nowrap pointer-events-none shadow-md">
                Split here
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="border-b px-2">
        <div className="flex items-center justify-between">
          <CardTitle>Timeline</CardTitle>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleSplit}
              disabled={!canSplit}
              title="Split clip at playhead position"
            >
              <Scissors className="h-4 w-4 mr-2" />
              Split
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onClipDelete}
              disabled={!selectedClipId}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
            {onExport && (
              <Button
                size="sm"
                variant="default"
                onClick={onExport}
                disabled={!canExport || isExporting}
              >
                {isExporting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-auto p-4">
        {clips.length === 0 ? (
          <div className="h-full flex items-center justify-center text-center">
            <div>
              <p className="text-sm text-muted-foreground">No clips on timeline</p>
              <p className="text-xs text-muted-foreground mt-1">Add clips from the library</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4" ref={timelineRef}>
            <div className="relative h-6 border-b border-border cursor-pointer" onClick={handleTimelineClick}>
              {timeMarkers.map((time) => (
                <div key={time} className="absolute top-0 flex flex-col items-center" style={{ left: `${time * pixelsPerSecond}px` }}>
                  <div className="w-px h-3 bg-border" />
                  <span className="text-xs text-muted-foreground mt-1">{formatTime(time)}</span>
                </div>
              ))}
              <Playhead showHandle />
            </div>
            <div className="relative h-16">
              {clips.map((clip, index) => (
                <TimelineClip
                  key={clip.id}
                  clip={clip}
                  isSelected={selectedClipId === clip.id}
                  onClick={() => onClipSelect(clip.id)}
                  position={clips.slice(0, index).reduce((sum, c) => sum + c.duration, 0)}
                  pixelsPerSecond={pixelsPerSecond}
                />
              ))}
              <Playhead />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
});
