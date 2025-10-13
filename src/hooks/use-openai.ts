import { invoke } from "@tauri-apps/api/core";
import { useState, useCallback } from "react";

export interface VideoGenerationOptions {
  model: string;
  prompt: string;
  resolution?: string;
  duration?: string;
}

export interface VideoGenerationStatus {
  id: string;
  status: "pending" | "processing" | "completed" | "failed";
  output?: string[];
  error?: string;
}

export interface UseOpenAIReturn {
  // API Key management
  saveApiKey: (apiKey: string) => Promise<void>;
  getApiKey: () => Promise<string | null>;
  removeApiKey: () => Promise<void>;

  // Video generation
  generateVideo: (options: VideoGenerationOptions) => Promise<string>;
  checkVideoStatus: (generationId: string) => Promise<VideoGenerationStatus>;

  // State
  isGenerating: boolean;
  error: string | null;
}

export function useOpenAI(): UseOpenAIReturn {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saveApiKey = useCallback(async (apiKey: string) => {
    try {
      await invoke("save_api_key", { apiKey });
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  const getApiKey = useCallback(async (): Promise<string | null> => {
    try {
      const key = await invoke<string | null>("get_api_key");
      setError(null);
      return key;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  const removeApiKey = useCallback(async () => {
    try {
      await invoke("remove_api_key");
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  const generateVideo = useCallback(
    async (options: VideoGenerationOptions): Promise<string> => {
      setIsGenerating(true);
      setError(null);
      try {
        const generationId = await invoke<string>("generate_video", {
          model: options.model,
          prompt: options.prompt,
          resolution: options.resolution || null,
          duration: options.duration || null,
        });
        return generationId;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        setError(errorMessage);
        throw new Error(errorMessage);
      } finally {
        setIsGenerating(false);
      }
    },
    []
  );

  const checkVideoStatus = useCallback(
    async (generationId: string): Promise<VideoGenerationStatus> => {
      try {
        const status = await invoke<VideoGenerationStatus>("check_video_status", {
          generationId,
        });
        setError(null);
        return status;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        setError(errorMessage);
        throw new Error(errorMessage);
      }
    },
    []
  );

  return {
    saveApiKey,
    getApiKey,
    removeApiKey,
    generateVideo,
    checkVideoStatus,
    isGenerating,
    error,
  };
}
