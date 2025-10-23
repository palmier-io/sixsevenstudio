import { invoke } from "@tauri-apps/api/core";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export const API_KEY_QUERY_KEY = ["api-key"];

async function fetchApiKey(): Promise<string | null> {
  try {
    return await invoke<string | null>("get_api_key");
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    throw new Error(errorMessage);
  }
}

async function saveApiKey(apiKey: string): Promise<void> {
  try {
    await invoke("save_api_key", { apiKey });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    throw new Error(errorMessage);
  }
}

async function removeApiKey(): Promise<void> {
  try {
    await invoke("remove_api_key");
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    throw new Error(errorMessage);
  }
}

export interface UseApiKeyReturn {
  // Query state
  apiKey: string | null;
  isLoading: boolean;
  error: Error | null;

  // Mutations
  saveApiKey: (apiKey: string) => Promise<void>;
  removeApiKey: () => Promise<void>;
}

export function useApiKey(): UseApiKeyReturn {
  const queryClient = useQueryClient();

  const { data: apiKey, isLoading, error } = useQuery<string | null, Error>({
    queryKey: API_KEY_QUERY_KEY,
    queryFn: fetchApiKey,
    staleTime: Infinity, // API key doesn't change often
  });

  const saveApiKeyMutation = useMutation({
    mutationFn: saveApiKey,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: API_KEY_QUERY_KEY });
    },
  });

  const removeApiKeyMutation = useMutation({
    mutationFn: removeApiKey,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: API_KEY_QUERY_KEY });
    },
  });

  return {
    apiKey: apiKey ?? null,
    isLoading,
    error: error as Error | null,
    saveApiKey: saveApiKeyMutation.mutateAsync,
    removeApiKey: removeApiKeyMutation.mutateAsync,
  };
}
