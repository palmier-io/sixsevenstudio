import { VideoSettings } from '@/components/VideoSettings';

export const SORA_MODELS = ["sora-2", "sora-2-pro"] as const
export type Model = typeof SORA_MODELS[number]
export const RESOLUTIONS_BY_MODEL: Record<
  Model,
  ReadonlyArray<{ value: string; isLandscape: boolean }>
> = {
  "sora-2": [
    { value: "1280x720", isLandscape: true },
    { value: "720x1280", isLandscape: false },
  ],
  "sora-2-pro": [
    { value: "1280x720", isLandscape: true },
    { value: "720x1280", isLandscape: false },
    { value: "1792x1024", isLandscape: true },
    { value: "1024x1792", isLandscape: false },
  ],
}
export const DURATIONS = [4, 8, 12] as const

export const DEFAULT_VIDEO_SETTINGS: VideoSettings = {
  model: 'sora-2',
  resolution: '1280x720',
  duration: 12,
  samples: 1,
};

export const STARTING_FRAME_FILENAME = 'starting_frame.png';
