import { invoke } from "@tauri-apps/api/core";
import { useQuery } from "@tanstack/react-query";

export interface SceneSummary {
  id: string;
  title: string;
  duration: string;
  hasReferenceImage: boolean;
  order: number;
}

export interface SceneDetails extends SceneSummary {
  description: string;
}

export type Scene = SceneDetails;

export interface StoryboardState {
  scenes: Scene[];
  globalContext: string;
}

// Query key
const STORYBOARD_QUERY_KEY = (projectName: string) => ["storyboard", projectName];

// Scene-based API functions
const readContext = async (projectName: string): Promise<string> => {
  return await invoke<string>("read_context", { projectName });
};

const writeContext = async (projectName: string, content: string): Promise<void> => {
  await invoke("write_context", { projectName, content });
};

const listScenes = async (projectName: string): Promise<SceneSummary[]> => {
  return await invoke<SceneSummary[]>("list_scenes", { projectName });
};

const readScene = async (projectName: string, sceneId: string): Promise<SceneDetails> => {
  return await invoke<SceneDetails>("read_scene", { projectName, sceneId });
};

const writeScene = async (
  projectName: string,
  sceneId: string,
  title: string,
  description: string,
  duration: string,
  order?: number
): Promise<void> => {
  await invoke("write_scene", { projectName, sceneId, title, description, duration, order });
};

const deleteSceneAPI = async (projectName: string, sceneId: string): Promise<void> => {
  await invoke("delete_scene", { projectName, sceneId });
};

const reorderScenes = async (projectName: string, orderedIds: string[]): Promise<void> => {
  await invoke("reorder_scenes", { projectName, orderedIds });
};

const saveSceneReferenceImage = async (
  projectName: string,
  sceneId: string,
  imageData: string
): Promise<string> => {
  const imageName = getSceneReferenceImageName(sceneId);
  return await invoke<string>("save_image", { projectName, imageName, imageData });
};

const getSceneReferenceImage = async (
  projectName: string,
  sceneId: string
): Promise<string | null> => {
  const imageName = getSceneReferenceImageName(sceneId);
  return await invoke<string | null>("get_image", { projectName, imageName });
};

const deleteSceneReferenceImage = async (
  projectName: string,
  sceneId: string
): Promise<void> => {
  const imageName = getSceneReferenceImageName(sceneId);
  await invoke("delete_image", { projectName, imageName });
};

// Helper function to generate scene reference image name
const getSceneReferenceImageName = (sceneId: string): string => {
  return `scene_${sceneId}_reference.jpg`;
};


// React Query hook
export function useStoryboard(projectName: string) {
  // Query for fetching storyboard
  const storyboardQuery = useQuery({
    queryKey: STORYBOARD_QUERY_KEY(projectName),
    queryFn: async () => {
      const [context, sceneSummaries] = await Promise.all([
        readContext(projectName),
        listScenes(projectName),
      ]);

      // Read full scene data for each scene
      const scenePromises = sceneSummaries.map(summary => readScene(projectName, summary.id));
      const sceneDetails = await Promise.all(scenePromises);

      // Ensure scenes are sorted by the order from summaries/index
      const sceneMap = new Map(sceneDetails.map(scene => [scene.id, scene] as const));
      const scenes: Scene[] = sceneSummaries
        .map(summary => {
          const scene = sceneMap.get(summary.id);
          if (!scene) return null;
          return scene;
        })
        .filter((scene): scene is Scene => scene !== null);

      return {
        scenes,
        globalContext: context,
      } satisfies StoryboardState;
    },
    enabled: !!projectName,
  });

  return {
    // Query data
    storyboard: storyboardQuery.data,
    isLoading: storyboardQuery.isLoading,
    error: storyboardQuery.error,
    refetch: storyboardQuery.refetch,

    // Scene-based API calls
    readContext: () => readContext(projectName),
    writeContext: (content: string) => writeContext(projectName, content),
    listScenes: () => listScenes(projectName),
    readScene: (sceneId: string) => readScene(projectName, sceneId),
    writeScene: (
      sceneId: string,
      title: string,
      description: string,
      duration: string,
      order?: number
    ) => writeScene(projectName, sceneId, title, description, duration, order),
    deleteScene: (sceneId: string) => deleteSceneAPI(projectName, sceneId),
    reorderScenes: (orderedIds: string[]) => reorderScenes(projectName, orderedIds),
    saveSceneReferenceImage: (sceneId: string, imageData: string) =>
      saveSceneReferenceImage(projectName, sceneId, imageData),
    getSceneReferenceImage: (sceneId: string) => getSceneReferenceImage(projectName, sceneId),
    deleteSceneReferenceImage: (sceneId: string) => deleteSceneReferenceImage(projectName, sceneId),
  };
}
