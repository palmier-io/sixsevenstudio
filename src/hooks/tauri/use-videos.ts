import { useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { OpenAIVideoRequestParams, OpenAIVideoJobResponse } from "@/types/openai";

export function useVideos() {

  const createVideo = useCallback(
    async (params: OpenAIVideoRequestParams): Promise<string> => {
      try {
        const videoId = await invoke<string>("create_video", {
          model: params.model,
          prompt: params.prompt,
          size: params.size,
          seconds: params.seconds,
          inputReferencePath: params.inputReferencePath,
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
