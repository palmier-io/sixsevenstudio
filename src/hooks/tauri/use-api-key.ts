import { invoke } from "@tauri-apps/api/core";
import { useState, useCallback } from "react";

export interface UseApiKeyReturn {
  // API Key management
  saveApiKey: (apiKey: string) => Promise<void>;
  getApiKey: () => Promise<string | null>;
  removeApiKey: () => Promise<void>;

  // State
  error: string | null;
}

/**
 * Hook for managing OpenAI API keys.
 */
export function useApiKey(): UseApiKeyReturn {
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

  return {
    saveApiKey,
    getApiKey,
    removeApiKey,
    error,
  };
}
