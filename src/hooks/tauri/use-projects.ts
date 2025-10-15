import { invoke } from "@tauri-apps/api/core";

export interface ProjectSummary {
  name: string;
  path: string;
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
}

export function useProjects() {
  const getWorkspaceDir = async (): Promise<string | null> => {
    return await invoke<string | null>("get_workspace_dir");
  };

  const ensureWorkspaceExists = async (): Promise<void> => {
    await invoke("ensure_workspace_exists");
  };

  const listProjects = async (): Promise<ProjectSummary[]> => {
    return await invoke<ProjectSummary[]>("list_projects");
  };

  const createProject = async (name: string): Promise<ProjectSummary> => {
    return await invoke<ProjectSummary>("create_project", { name });
  };

  const deleteProject = async (
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

  return {
    getWorkspaceDir,
    ensureWorkspaceExists,
    listProjects,
    createProject,
    deleteProject,
    getProject,
    addVideosToProject,
    deleteVideoFromProject,
  };
}


