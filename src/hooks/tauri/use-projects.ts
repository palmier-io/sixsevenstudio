import { invoke } from "@tauri-apps/api/core";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface ProjectSummary {
  name: string;
  path: string;
  created_at: number;
}

export interface VideoMeta {
  id: string;
  prompt: string;
  model: string;
  resolution: string;
  duration: number;
  created_at: number;
}

export interface ProjectMeta {
  path: string;
  videos: VideoMeta[];
  created_at: number;
  storyboard_response_id?: string;
}

export interface Scene {
  id: string;
  title: string;
  description: string;
  duration: string;
}

export interface StoryboardData {
  scenes: Scene[];
  global_style: string;
}

// Query keys
const PROJECTS_QUERY_KEY = ["projects"];

// API functions
const getWorkspaceDir = async (): Promise<string | null> => {
  return await invoke<string | null>("get_workspace_dir");
};

const ensureWorkspaceExists = async (): Promise<void> => {
  await invoke("ensure_workspace_exists");
};

const listProjects = async (): Promise<ProjectSummary[]> => {
  return await invoke<ProjectSummary[]>("list_projects");
};

const createProjectAPI = async (name: string): Promise<ProjectSummary> => {
  return await invoke<ProjectSummary>("create_project", { name });
};

const deleteProjectAPI = async (
  name: string,
  mode?: "trash" | "delete"
): Promise<void> => {
  await invoke("delete_project", { name, mode });
};

const getProject = async (projectName: string): Promise<ProjectMeta> => {
  return await invoke<ProjectMeta>("get_project", { name: projectName });
};

const addVideosToProject = async (projectName: string, videosMeta: VideoMeta[]): Promise<void> => {
  await invoke("add_videos_to_project", { projectName, videosMeta });
};

const deleteVideoFromProject = async (projectName: string, videoId: string): Promise<void> => {
  await invoke("delete_video_from_project", { projectName, videoId });
};

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
    model: model ?? "gpt-4o",
  });
};

const getPromptFromStoryboard = async (
  projectName: string,
): Promise<string> => {
  return await invoke<string>("get_prompt_from_storyboard", {
    projectName,
  });
};

// React Query hook
export function useProjects() {
  const queryClient = useQueryClient();

  // Query for listing projects
  const projectsQuery = useQuery({
    queryKey: PROJECTS_QUERY_KEY,
    queryFn: async () => {
      const ws = await getWorkspaceDir();
      if (ws) {
        return await listProjects();
      }
      return [] as ProjectSummary[];
    },
  });

  // Mutation for creating a project
  const createProjectMutation = useMutation({
    mutationFn: createProjectAPI,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROJECTS_QUERY_KEY });
    },
  });

  // Mutation for deleting a project
  const deleteProjectMutation = useMutation({
    mutationFn: ({ name, mode }: { name: string; mode: "trash" | "delete" }) =>
      deleteProjectAPI(name, mode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROJECTS_QUERY_KEY });
    },
  });

  return {
    // Query data
    projects: projectsQuery.data ?? [],
    isLoading: projectsQuery.isLoading,
    error: projectsQuery.error,
    refetch: projectsQuery.refetch,

    // Mutations
    createProject: createProjectMutation.mutateAsync,
    deleteProject: (name: string, mode: "trash" | "delete" = "trash") =>
      deleteProjectMutation.mutateAsync({ name, mode }),

    // Non-reactive API calls
    ensureWorkspaceExists,
    getProject,
    addVideosToProject,
    deleteVideoFromProject,

    // Storyboard API calls
    getStoryboard,
    saveStoryboard,
    deleteStoryboard,
    generateStoryboard,
    getPromptFromStoryboard,
  };
}


