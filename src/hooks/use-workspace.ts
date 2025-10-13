import { invoke } from "@tauri-apps/api/core";

export interface ProjectSummary {
  name: string;
  path: string;
  video_count: number;
}

export interface ProjectMeta {
  videos: VideoMeta[];
}

export interface VideoMeta {
  id: string;
  prompt: string;
  model: string;
  resolution: string;
  duration: number;
  file_path: string;
  created_at: number;
}

export function useWorkspaceApi() {
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

  const renameProject = async (
    oldName: string,
    newName: string
  ): Promise<ProjectSummary> => {
    return await invoke<ProjectSummary>("rename_project", {
      oldName,
      newName,
    });
  };

  const deleteProject = async (
    name: string,
    mode?: "trash" | "delete"
  ): Promise<void> => {
    await invoke("delete_project", { name, mode });
  };


  const getProjectMeta = async (projectName: string): Promise<ProjectMeta> => {
    return await invoke<ProjectMeta>("get_project_meta", { projectName });
  };

  const listProjectVideos = async (projectName: string): Promise<VideoMeta[]> => {
    return await invoke<VideoMeta[]>("list_project_videos", { projectName });
  };

  return {
    getWorkspaceDir,
    ensureWorkspaceExists,
    listProjects,
    createProject,
    renameProject,
    deleteProject,
    getProjectMeta,
    listProjectVideos,
  };
}


