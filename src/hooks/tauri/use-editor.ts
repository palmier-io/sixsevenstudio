import { invoke } from "@tauri-apps/api/core";
import { useCallback } from "react";
import type { TimelineClip } from "@/types/video-editor";

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

  return {
    createPreviewVideo,
    exportVideo,
  };
}
