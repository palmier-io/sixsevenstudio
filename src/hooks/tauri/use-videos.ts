import { useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";

export interface OpenAIVideoJobResponse {
  id: string;
  completed_at?: number;
  created_at?: number;
  error?: any | null;
  expires_at?: number;
  model?: string;
  object?: string;
  progress?: number;
  remixed_from_video_id?: string | null;
  seconds?: string;
  size?: string;
  status?: string;
}

export interface OpenAIVideoRequestParams {
  model: string;
  prompt: string;
  size?: string;
  seconds?: string;
}

export function useVideos() {

  const createVideo = useCallback(
    async (params: OpenAIVideoRequestParams): Promise<string> => {
      try {
        const videoId = await invoke<string>("create_video", {
          model: params.model,
          prompt: params.prompt,
          size: params.size,
          seconds: params.seconds,
        });

        return videoId;
      } catch (error) {
        throw error;
      }
    },
    []
  );

  const downloadVideo = useCallback(
    async (
      videoId: string,
      savePath: string,
    ): Promise<void> => {

      await invoke("download_video", {
        videoId,
        savePath,
      });
    },
    []
  );

  const getVideoStatus = useCallback(async (videoId: string): Promise<OpenAIVideoJobResponse> => {
    return await invoke<OpenAIVideoJobResponse>("get_video_status", { videoId });
  }, []);

  const fileExists = useCallback(async (filePath: string): Promise<boolean> => {
    return await invoke<boolean>("file_exists", { filePath });
  }, []);

  return {
    createVideo,
    downloadVideo,
    getVideoStatus,
    fileExists,
  };
}
