import { useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { exists } from "@tauri-apps/plugin-fs";
import { OpenAIVideoRequestParams, OpenAIVideoJobResponse } from "@/types/openai";
import * as VideoClient from "@/lib/openai/video";

export function useVideos() {
  const getApiKey = useCallback(async (): Promise<string> => {
    const apiKey = await invoke<string | null>("get_api_key");
    if (!apiKey) {
      throw new Error("API key not found. Please set your OpenAI API key in settings.");
    }
    return apiKey;
  }, []);

  const createVideo = useCallback(
    async (params: OpenAIVideoRequestParams): Promise<string> => {
      const apiKey = await getApiKey();
      return await VideoClient.createVideo(apiKey, params);
    },
    [getApiKey]
  );

  const downloadVideo = useCallback(
    async (
      videoId: string,
      savePath: string,
    ): Promise<void> => {
      const apiKey = await getApiKey();
      await VideoClient.downloadVideo(apiKey, videoId, savePath);
    },
    [getApiKey]
  );

  const getVideoStatus = useCallback(async (videoId: string): Promise<OpenAIVideoJobResponse> => {
    const apiKey = await getApiKey();
    return await VideoClient.getVideoStatus(apiKey, videoId);
  }, [getApiKey]);

  const fileExists = useCallback(async (filePath: string): Promise<boolean> => {
    return await exists(filePath);
  }, []);

  const remixVideo = useCallback(
    async (videoId: string, remixPrompt: string): Promise<string> => {
      const apiKey = await getApiKey();
      return await VideoClient.remixVideo(apiKey, videoId, remixPrompt);
    },
    [getApiKey]
  );

  return {
    createVideo,
    downloadVideo,
    getVideoStatus,
    fileExists,
    remixVideo,
  };
}
