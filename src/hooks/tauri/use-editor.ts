import { invoke } from "@tauri-apps/api/core";
import { useCallback } from "react";
import type { TimelineClip } from "@/types/video-editor";
import type { VideoClip } from "@/types/video-editor";

export function useEditor() {
  const createPreviewVideo = useCallback(
    async (
      clips: TimelineClip[],
      projectName: string
    ): Promise<string> => {
      try {
        const previewPath = await invoke<string>("create_preview_video", {
          clips,
          projectName,
        });
        return previewPath;
      } catch (error) {
        console.error("Failed to create preview video:", error);
        throw error;
      }
    },
    []
  );

  const exportVideo = useCallback(
    async (previewPath: string): Promise<string> => {
      try {
        const exportPath = await invoke<string>("export_video", {
          previewPath,
        });
        return exportPath;
      } catch (error) {
        console.error("Failed to export video:", error);
        throw error;
      }
    },
    []
  );

  const importVideo = useCallback(
    async (projectName: string): Promise<VideoClip> => {
      try {
        const metadata = await invoke<any>("import_video", {
          projectName,
          filePath: null,
        });
        return {
          id: metadata.id,
          name: metadata.name,
          videoPath: metadata.videoPath,
          originalDuration: metadata.originalDuration,
          createdAt: metadata.createdAt,
        };
      } catch (error) {
        console.error("Failed to import video:", error);
        throw error;
      }
    },
    []
  );

  const listImportedVideos = useCallback(
    async (projectName: string): Promise<VideoClip[]> => {
      try {
        const videos = await invoke<any[]>("list_imported_videos", {
          projectName,
        });
        return videos.map((v) => ({
          id: v.id,
          name: v.name,
          videoPath: v.videoPath,
          originalDuration: v.originalDuration,
          createdAt: v.createdAt,
        }));
      } catch (error) {
        console.error("Failed to list imported videos:", error);
        throw error;
      }
    },
    []
  );

  const deleteImportedVideo = useCallback(
    async (projectName: string, videoId: string): Promise<void> => {
      try {
        await invoke("delete_imported_video", {
          projectName,
          videoId,
        });
      } catch (error) {
        console.error("Failed to delete imported video:", error);
        throw error;
      }
    },
    []
  );

  return {
    createPreviewVideo,
    exportVideo,
    importVideo,
    listImportedVideos,
    deleteImportedVideo,
  };
}
