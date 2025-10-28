import { useState, useCallback, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { debug, error as logError } from '@tauri-apps/plugin-log';
import type { TimelineClip, VideoClip, EditorState } from '@/types/video-editor';
import { generateId } from '@/lib/utils';

export function useEditorState(projectName: string, previewVideoPath: string | null = null) {
  const [clips, setClips] = useState<TimelineClip[]>([]);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [currentPlaybackTime, setCurrentPlaybackTime] = useState<number | null>(null);

  const [isLoaded, setIsLoaded] = useState(false);

  // Load saved state when component mounts or project changes
  useEffect(() => {
    debug(`[EditorState] Loading state for project: ${projectName}`);
    setIsLoaded(false);

    invoke<EditorState | null>('load_editor_state', { projectName })
      .then(savedState => {
        if (savedState) {
          setClips(savedState.clips);
          setSelectedClipId(savedState.selectedClipId);
          setCurrentPlaybackTime(savedState.clips.length > 0 ? 0 : null);
        } else {
          setCurrentPlaybackTime(null);
        }
        setIsLoaded(true);
      })
      .catch(err => {
        logError(`[EditorState] Failed to load state: ${err}`);
        console.error(err);
        setIsLoaded(true);
      });
  }, [projectName]);

  // Auto-save whenever state changes (after initial load)
  useEffect(() => {
    if (!isLoaded) return;

    const state: EditorState = {
      clips,
      selectedClipId,
      previewVideoPath,
    };
  
    invoke('save_editor_state', { projectName, state })
      .then(() => {
        debug(`[EditorState] Successfully saved state for project: ${projectName}`);
      })
      .catch(err => {
        logError(`[EditorState] Failed to save state: ${err}`);
        console.error(err);
      });
  }, [clips, selectedClipId, previewVideoPath, projectName, isLoaded]);

  // Calculate total duration
  const totalDuration = clips.length > 0
    ? Math.max(...clips.map(c => c.position + c.duration))
    : 0;

  // Add clip to end of timeline
  const addClip = useCallback((clip: VideoClip, position: number) => {
    const timelineClip: TimelineClip = {
      ...clip,
      id: generateId('clip'),
      position,
      trimStart: 0,
      trimEnd: clip.originalDuration,
      duration: clip.originalDuration,
    };
    setClips(prev => [...prev, timelineClip]);
    setSelectedClipId(timelineClip.id);
  }, []);

  const removeClip = useCallback((clipId: string) => {
    setClips(prev => prev.filter(c => c.id !== clipId));
    setSelectedClipId(prev => prev === clipId ? null : prev);
  }, []);

  const selectClip = useCallback((clipId: string | null) => {
    setSelectedClipId(clipId);
  }, []);

  // Split clip at a given time (relative to the timeline)
  const splitClip = useCallback((clipId: string, splitTimelinePosition: number) => {
    setClips(prev => {
      const clipIndex = prev.findIndex(c => c.id === clipId);
      if (clipIndex === -1) return prev;

      const clip = prev[clipIndex];

      // Calculate where the split occurs within this clip
      const clipStartTime = prev.slice(0, clipIndex).reduce((sum, c) => sum + c.duration, 0);
      const clipEndTime = clipStartTime + clip.duration;

      // Check if split time is within this clip
      if (splitTimelinePosition <= clipStartTime || splitTimelinePosition >= clipEndTime) {
        return prev;
      }

      // Calculate split point relative to the clip's start
      const splitPointInClip = splitTimelinePosition - clipStartTime;

      // Create first clip (before split)
      const firstClip: TimelineClip = {
        ...clip,
        id: generateId('clip'),
        duration: splitPointInClip,
        trimEnd: clip.trimStart + splitPointInClip,
      };

      // Create second clip (after split)
      const secondClip: TimelineClip = {
        ...clip,
        id: generateId('clip'),
        position: clip.position + splitPointInClip,
        duration: clip.duration - splitPointInClip,
        trimStart: clip.trimStart + splitPointInClip,
      };

      // Replace the original clip with the two new clips
      const newClips = [...prev];
      newClips.splice(clipIndex, 1, firstClip, secondClip);

      return newClips;
    });

    // Deselect after split
    setSelectedClipId(null);
  }, []);

  // Reorder clips for drag and drop
  const reorderClips = useCallback((newClips: TimelineClip[]) => {
    setClips(newClips);
  }, []);

  return {
    clips,
    selectedClipId,
    currentPlaybackTime,
    setCurrentPlaybackTime,
    totalDuration,
    addClip,
    removeClip,
    selectClip,
    splitClip,
    reorderClips,
  };
}
