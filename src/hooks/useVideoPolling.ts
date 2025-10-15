import { useEffect, useRef, useCallback } from 'react';
import { useVideos } from '@/hooks/tauri/use-videos';
import { useVideoStatusStore } from '@/stores/useVideoStatusStore';
import { OpenAIVideoJobStatus } from '@/types/openai';
import { convertFileSrc } from '@tauri-apps/api/core';
import { toast } from 'sonner';

interface UseVideoPollingOptions {
  videoId: string;
  projectPath: string;
}

export const useVideoPolling = ({ videoId, projectPath }: UseVideoPollingOptions) => {
  const { getVideoStatus, downloadVideo } = useVideos();
  const { setStatus, getStatus, startPolling } = useVideoStatusStore();
  const isMountedRef = useRef(true);
  const hasDownloadedRef = useRef(false);

  // Shared download handler
  const handleDownload = useCallback(async (status: OpenAIVideoJobStatus, progress: number) => {
    const savePath = `${projectPath}/${videoId}.mp4`;

    // Only download once, but always update status
    if (!hasDownloadedRef.current) {
      hasDownloadedRef.current = true;

      try {
        await downloadVideo(videoId, savePath); // Idempotent
      } catch (error) {
        console.error('Failed to download video:', error);
        toast.error('Failed to download video', {
          description: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Always update status (this triggers polling to stop)
    if (isMountedRef.current) {
      setStatus(videoId, {
        status,
        progress,
        videoSrc: convertFileSrc(savePath),
      });
    }
  }, [videoId, projectPath, downloadVideo, setStatus]);

  // Handle already-completed videos on mount
  const currentStatus = getStatus(videoId);
  useEffect(() => {
    if (!currentStatus) return;
    if (currentStatus.status !== OpenAIVideoJobStatus.COMPLETED) return;

    handleDownload(currentStatus.status, currentStatus.progress);
  }, [currentStatus?.status, handleDownload]);

  const poll = useCallback(async () => {
    try {
      const res = await getVideoStatus(videoId);
      if (!res?.status || !isMountedRef.current) return;

      const progress = res.progress ?? 0;

      // Download if completed
      if (res.status === OpenAIVideoJobStatus.COMPLETED) {
        await handleDownload(res.status, progress);
      } else {
        // For non-completed statuses, just update status and progress
        setStatus(videoId, {
          status: res.status,
          progress,
        });
      }
    } catch (error) {
      console.error('Failed to poll status for video:', error);
    }
  }, [videoId, getVideoStatus, handleDownload, getStatus, setStatus]);

  useEffect(() => {
    isMountedRef.current = true;
    startPolling(videoId, poll);

    return () => {
      isMountedRef.current = false;
      // Don't stop polling on unmount - let other components continue using it
    };
  }, [videoId, poll, startPolling]);

  return getStatus(videoId);
};
