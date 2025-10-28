import { useEffect, useRef, useCallback } from 'react';
import { useVideos } from '@/hooks/use-videos';
import { useVideoStatusStore } from '@/stores/useVideoStatusStore';
import { convertFileSrc } from '@tauri-apps/api/core';
import { toast } from 'sonner';
import { VideoStatus } from '@/lib/openai/video';

interface UseVideoPollingOptions {
  videoId: string;
  projectPath: string;
}

export const useVideoPolling = ({ videoId, projectPath }: UseVideoPollingOptions) => {
  const { getVideoStatus, downloadVideo, fileExists } = useVideos();
  const { setStatus, getStatus, startPolling } = useVideoStatusStore();
  const isMountedRef = useRef(true);
  const hasDownloadedRef = useRef(false);
  const hasCheckedLocalRef = useRef(false);

  // Shared download handler
  const handleDownload = useCallback(async (status: VideoStatus, progress: number) => {
    const savePath = `${projectPath}/videos/${videoId}.mp4`;

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
        status: status,
        progress,
        videoSrc: convertFileSrc(savePath),
      });
    }
  }, [videoId, projectPath, downloadVideo, setStatus]);

  // Check if video exists locally before polling
  useEffect(() => {
    if (hasCheckedLocalRef.current) return;
    hasCheckedLocalRef.current = true;

    const checkLocalVideo = async () => {
      const savePath = `${projectPath}/videos/${videoId}.mp4`;
      const exists = await fileExists(savePath);

      if (exists && isMountedRef.current) {
        // Video already exists locally, set status to completed and skip polling
        setStatus(videoId, {
          status: VideoStatus.COMPLETED,
          progress: 100,
          videoSrc: convertFileSrc(savePath),
        });
        hasDownloadedRef.current = true; // Mark as already downloaded to skip download logic
      }
    };

    checkLocalVideo();
  }, [videoId, projectPath, fileExists, setStatus]);

  // Handle already-completed videos on mount
  const currentStatus = getStatus(videoId);
  useEffect(() => {
    if (!currentStatus) return;
    if (currentStatus.status !== VideoStatus.COMPLETED) return;

    handleDownload(currentStatus.status, currentStatus.progress);
  }, [currentStatus?.status, handleDownload]);

  const poll = useCallback(async () => {
    try {
      const res = await getVideoStatus(videoId);
      if (!res?.status || !isMountedRef.current) return;

      const progress = res.progress ?? 0;

      // Download if completed
      if (res.status === 'completed') {
        await handleDownload(res.status as VideoStatus, progress);
      } else {
        // For non-completed statuses, just update status and progress
        setStatus(videoId, {
          status: res.status as VideoStatus,
          progress,
        });
      }
    } catch (error) {
      console.error('Failed to poll status for video:', error);
    }
  }, [videoId, getVideoStatus, handleDownload, getStatus, setStatus]);

  useEffect(() => {
    isMountedRef.current = true;

    // Only start polling if the video doesn't already exist locally (completed)
    const status = getStatus(videoId);
    if (!status || status.status !== VideoStatus.COMPLETED) {
      startPolling(videoId, poll);
    }

    return () => {
      isMountedRef.current = false;
      // Don't stop polling on unmount - let other components continue using it
    };
  }, [videoId, poll, startPolling, getStatus]);

  return getStatus(videoId);
};
