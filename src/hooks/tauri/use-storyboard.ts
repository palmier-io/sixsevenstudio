import { invoke } from "@tauri-apps/api/core";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface Scene {
  id: string;
  title: string;
  description: string;
  duration: string;
}

export interface StoryboardData {
  scenes: Scene[];
  global_context: string;
}

// Query key
const STORYBOARD_QUERY_KEY = (projectName: string) => ["storyboard", projectName];

// API functions
const getStoryboard = async (projectName: string): Promise<StoryboardData | null> => {
  return await invoke<StoryboardData | null>("get_storyboard", { projectName });
};

const saveStoryboard = async (projectName: string, storyboardData: StoryboardData): Promise<void> => {
  await invoke("save_storyboard", { projectName, storyboardData });
};

const deleteStoryboard = async (projectName: string): Promise<void> => {
  await invoke("delete_storyboard", { projectName });
};

const generateStoryboard = async (
  projectName: string,
  prompt: string,
  model?: string
): Promise<StoryboardData> => {
  return await invoke<StoryboardData>("generate_storyboard", {
    projectName,
    prompt,
    model,
  });
};

const getPromptFromStoryboard = async (
  projectName: string,
): Promise<string> => {
  return await invoke<string>("get_prompt_from_storyboard", {
    projectName,
  });
};

// Export raw API function for use outside of React components (e.g., in Home.tsx)
export { generateStoryboard as generateStoryboardAPI };

// React Query hook
export function useStoryboard(projectName: string) {
  const queryClient = useQueryClient();

  // Query for fetching storyboard
  const storyboardQuery = useQuery({
    queryKey: STORYBOARD_QUERY_KEY(projectName),
    queryFn: () => getStoryboard(projectName),
    enabled: !!projectName,
  });

  // Mutation for generating storyboard
  const generateStoryboardMutation = useMutation({
    mutationFn: ({ prompt, model }: { prompt: string; model?: string }) =>
      generateStoryboard(projectName, prompt, model),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: STORYBOARD_QUERY_KEY(projectName) });
    },
  });

  return {
    // Query data
    storyboard: storyboardQuery.data,
    isLoading: storyboardQuery.isLoading,
    error: storyboardQuery.error,
    refetch: storyboardQuery.refetch,

    // Mutations
    generateStoryboard: generateStoryboardMutation.mutateAsync,
    isGenerating: generateStoryboardMutation.isPending,

    // Direct API calls
    saveStoryboard: (data: StoryboardData) => saveStoryboard(projectName, data),
    deleteStoryboard: () => deleteStoryboard(projectName),
    getPromptFromStoryboard: () => getPromptFromStoryboard(projectName),
  };
}
