import { create } from 'zustand';
import { VideoStatus as OpenAIVideoStatus } from '@/lib/openai/video';

interface VideoStatus {
  status: OpenAIVideoStatus;
  progress: number;
  videoSrc?: string;
  error?: string;
}

interface VideoStatusStore {
  statusMap: Record<string, VideoStatus>;
  setStatus: (videoId: string, status: VideoStatus) => void;
  getStatus: (videoId: string) => VideoStatus | undefined;
  startPolling: (videoId: string, pollFn: () => Promise<void>) => void;
  stopPolling: (videoId: string) => void;
}

// Store polling intervals outside of Zustand state
const pollingIntervals = new Map<string, number>();
const POLL_INTERVAL = 5000; // 5 seconds between poll cycles

function isTerminalState(status: OpenAIVideoStatus) {
  return status === OpenAIVideoStatus.COMPLETED || status === OpenAIVideoStatus.FAILED;
}

export const useVideoStatusStore = create<VideoStatusStore>((set, get) => ({
  statusMap: {},

  setStatus: (videoId, status) => {
    set((state) => ({
      statusMap: { ...state.statusMap, [videoId]: status },
    }));

    if (isTerminalState(status.status)) {
      get().stopPolling(videoId);
    }
  },

  getStatus: (videoId) => get().statusMap[videoId],

  startPolling: (videoId, pollFn) => {
    // Don't create duplicate intervals
    if (pollingIntervals.has(videoId)) {
      return;
    }

    // Don't poll if already in terminal state
    const currentStatus = get().statusMap[videoId];
    if (currentStatus && isTerminalState(currentStatus.status)) {
      return;
    }

    // Initial poll
    pollFn();

    // Start interval
    const interval = window.setInterval(pollFn, POLL_INTERVAL);
    pollingIntervals.set(videoId, interval);
  },

  stopPolling: (videoId) => {
    const interval = pollingIntervals.get(videoId);
    if (interval) {
      clearInterval(interval);
      pollingIntervals.delete(videoId);
    }
  },
}));
