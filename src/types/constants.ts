import { VideoSettings } from '@/components/VideoSettings';

export const SORA_MODELS = ["sora-2", "sora-2-pro"] as const
export type Model = typeof SORA_MODELS[number]

export const LLM_MODELS = ["gpt-4.1-mini", "gpt-5-mini", "gpt-5"] as const
export type LLMModel = typeof LLM_MODELS[number]

export const DEFAULT_LLM_MODEL: LLMModel = 'gpt-4.1-mini';

export const LLM_MODEL_LABELS: Record<LLMModel, { label: string; icon: string; }> = {
  "gpt-4.1-mini": { label: "Fast", icon: "Zap" },
  "gpt-5-mini": { label: "Auto", icon: "Sparkles" },
  "gpt-5": { label: "Thinking", icon: "Brain" },
}

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
