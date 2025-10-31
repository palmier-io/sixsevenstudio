import { useState, useEffect, useCallback, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { TimelineClip } from '@/types/video-editor';

const MIN_WAVEFORM_WIDTH = 300; // pixels
const WAVEFORM_HEIGHT = 60; // pixels
const MIN_SPRITE_WIDTH = 100; // pixels
const TIMELINE_CLIP_HEIGHT = 64; // pixels
const SPRITE_HEIGHT_RATIO = 0.6; // ratio of sprite height to timeline clip height (60%)

type Cache = Record<string, string | null>;
type LoadingState = Record<string, boolean>;

function getCacheKey(clipId: string, width: number): string {
  return `${clipId}_${width}`;
}

export function useWaveformCache(
  projectName: string,
  clips: TimelineClip[],
  pixelsPerSecond: number
) {
  const [waveforms, setWaveforms] = useState<Cache>({});
  const [loading, setLoading] = useState<LoadingState>({});
  const loadingRef = useRef<Set<string>>(new Set());
  const cacheWidthRef = useRef<Map<string, number>>(new Map());

  const loadWaveform = useCallback(async (clip: TimelineClip) => {
    const width = Math.max(MIN_WAVEFORM_WIDTH, Math.floor(clip.duration * pixelsPerSecond));
    const cacheKey = getCacheKey(clip.id, width);
    
    if (loadingRef.current.has(cacheKey)) return;
    const cachedWidth = cacheWidthRef.current.get(clip.id);
    if (cachedWidth === width && waveforms[clip.id] !== undefined) return;

    loadingRef.current.add(cacheKey);
    setLoading(prev => ({ ...prev, [clip.id]: true }));

    try {
      const path = await invoke<string | null>('generate_clip_waveform', {
        projectName,
        clipId: clip.id,
        width,
        height: WAVEFORM_HEIGHT,
      });
      setWaveforms(prev => ({ ...prev, [clip.id]: path || null }));
      cacheWidthRef.current.set(clip.id, width);
    } catch {
      setWaveforms(prev => ({ ...prev, [clip.id]: null }));
    } finally {
      setLoading(prev => ({ ...prev, [clip.id]: false }));
      loadingRef.current.delete(cacheKey);
    }
  }, [projectName, pixelsPerSecond, waveforms]);

  useEffect(() => {
    clips.forEach(clip => {
      const width = Math.max(MIN_WAVEFORM_WIDTH, Math.floor(clip.duration * pixelsPerSecond));
      const cacheKey = getCacheKey(clip.id, width);
      const cachedWidth = cacheWidthRef.current.get(clip.id);
      
      if ((waveforms[clip.id] === undefined || cachedWidth !== width) && !loadingRef.current.has(cacheKey)) {
        loadWaveform(clip);
      }
    });
  }, [clips, pixelsPerSecond, waveforms, loadWaveform]);

  return {
    waveforms,
    loading,
    getWaveform: (clipId: string) => waveforms[clipId] || null,
    isLoading: (clipId: string) => loading[clipId] || false,
  };
}

export function useSpriteCache(
  projectName: string,
  clips: TimelineClip[],
  pixelsPerSecond: number
) {
  const [sprites, setSprites] = useState<Cache>({});
  const [loading, setLoading] = useState<LoadingState>({});
  const loadingRef = useRef<Set<string>>(new Set());
  const cacheWidthRef = useRef<Map<string, number>>(new Map());

  const loadSprite = useCallback(async (clip: TimelineClip) => {
    const width = Math.max(MIN_SPRITE_WIDTH, Math.floor(clip.duration * pixelsPerSecond));
    const cacheKey = getCacheKey(clip.id, width);
    
    if (loadingRef.current.has(cacheKey)) return;
    const cachedWidth = cacheWidthRef.current.get(clip.id);
    if (cachedWidth === width && sprites[clip.id] !== undefined) return;

    loadingRef.current.add(cacheKey);
    setLoading(prev => ({ ...prev, [clip.id]: true }));

    try {
      const path = await invoke<string | null>('generate_clip_sprite', {
        projectName,
        clipId: clip.id,
        width,
        height: Math.round(TIMELINE_CLIP_HEIGHT * SPRITE_HEIGHT_RATIO),
      });
      setSprites(prev => ({ ...prev, [clip.id]: path || null }));
      cacheWidthRef.current.set(clip.id, width);
    } catch {
      setSprites(prev => ({ ...prev, [clip.id]: null }));
    } finally {
      setLoading(prev => ({ ...prev, [clip.id]: false }));
      loadingRef.current.delete(cacheKey);
    }
  }, [projectName, pixelsPerSecond, sprites]);

  useEffect(() => {
    clips.forEach(clip => {
      const width = Math.max(MIN_SPRITE_WIDTH, Math.floor(clip.duration * pixelsPerSecond));
      const cacheKey = getCacheKey(clip.id, width);
      const cachedWidth = cacheWidthRef.current.get(clip.id);
      
      if ((sprites[clip.id] === undefined || cachedWidth !== width) && !loadingRef.current.has(cacheKey)) {
        loadSprite(clip);
      }
    });
  }, [clips, pixelsPerSecond, sprites, loadSprite]);

  return {
    sprites,
    loading,
    getSprite: (clipId: string) => sprites[clipId] || null,
    isLoading: (clipId: string) => loading[clipId] || false,
  };
}
