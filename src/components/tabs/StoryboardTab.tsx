import { useState, useEffect } from 'react';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { useProjects } from '@/hooks/tauri/use-projects';
import { useStoryboard, type Scene } from '@/hooks/tauri/use-storyboard';
import { useVideos } from '@/hooks/use-videos';
import { type VideoSettings } from '@/components/VideoSettings';
import { DEFAULT_VIDEO_SETTINGS } from '@/types/constants';
import { SceneList, type SelectedView } from '@/components/storyboard/SceneList';
import { OverviewCard } from '@/components/storyboard/OverviewCard';
import { SceneDetailCard } from '@/components/storyboard/SceneDetailCard';
import openai from 'openai';
import { generateId } from '@/lib/utils';

const SAVE_AFTER_IDLE_SECONDS = 5000; // 5 seconds

interface StoryboardTabProps {
  projectName: string;
}

export function StoryboardTab({ projectName }: StoryboardTabProps) {
  const { addVideosToProject } = useProjects();
  const {
    storyboard,
    isLoading: isLoadingStoryboard,
    writeScene,
    writeContext,
    deleteScene: deleteSceneAPI,
    reorderScenes,
    getSceneReferenceImage,
  } = useStoryboard(projectName);
  const { createVideo } = useVideos();

  const [scenes, setScenes] = useState<Scene[]>([]);
  const [globalContext, setGlobalContext] = useState('');
  const [videoSettings, setVideoSettings] = useState<VideoSettings>(DEFAULT_VIDEO_SETTINGS);
  const [selectedView, setSelectedView] = useState<SelectedView>('overview');

  // Sync storyboard data from query to local state
  useEffect(() => {
    if (storyboard) {
      const orderedScenes = [...storyboard.scenes].sort((a, b) => a.order - b.order);
      setScenes(orderedScenes);
      setGlobalContext(storyboard.globalContext);
    } else if (!isLoadingStoryboard) {
      // Initialize with default first scene if no data exists
      const fallbackId = generateId('scene');
      setScenes([{
        id: fallbackId,
        title: 'Scene 1',
        description: '',
        duration: '4s',
        hasReferenceImage: false,
        order: 0,
      }]);
      setGlobalContext('');
    }
  }, [storyboard, isLoadingStoryboard]);

  // Auto-save storyboard when scenes or global context changes
  useEffect(() => {
    if (!projectName || isLoadingStoryboard) return;

    const saveData = async () => {
      try {
        await writeContext(globalContext);

        // Save all scenes individually
        for (const scene of scenes) {
          await writeScene(scene.id, scene.title, scene.description, scene.duration, scene.order);
        }
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        console.error('Failed to save storyboard:', errMsg);
      }
    };

    // Debounce save to avoid too many writes
    const timeoutId = setTimeout(saveData, SAVE_AFTER_IDLE_SECONDS);
    return () => clearTimeout(timeoutId);
  }, [scenes, globalContext, projectName, isLoadingStoryboard, writeContext, writeScene]);

  const reindexScenes = (nextScenes: Scene[]) =>
    nextScenes.map((scene, index) => ({ ...scene, order: index }));

  const addScene = () => {
    const nextOrder = scenes.length;
    const newScene: Scene = {
      id: generateId('scene'),
      title: `Scene ${nextOrder + 1}`,
      description: '',
      duration: '4s',
      hasReferenceImage: false,
      order: nextOrder,
    };
    setScenes(prev => [...prev, newScene]);
  };

  const deleteScene = async (id: string) => {
    const updatedScenes = reindexScenes(scenes.filter(scene => scene.id !== id));
    setScenes(updatedScenes);
    try {
      await deleteSceneAPI(id);
      await reorderScenes(updatedScenes.map(scene => scene.id));
    } catch (error) {
      console.error('Failed to delete scene:', error);
    }
  };

  const updateScene = (id: string, field: keyof Scene, value: Scene[keyof Scene]) => {
    setScenes(prev => prev.map(scene =>
      scene.id === id ? { ...scene, [field]: value } : scene
    ));
  };

  // Find the selected scene
  const selectedScene = typeof selectedView === 'object' && selectedView.type === 'scene'
    ? scenes.find(s => s.id === selectedView.sceneId)
    : null;

  const selectedSceneIndex = selectedScene
    ? scenes.findIndex(s => s.id === selectedScene.id)
    : -1;

  return (
    <div className="h-full w-full flex flex-col overflow-hidden">
      <div className="h-full p-6">
        <ResizablePanelGroup direction="horizontal" className="gap-6">
          {/* Scene List - Left Sidebar */}
          <ResizablePanel defaultSize={20} minSize={15} maxSize={30}>
            <SceneList
              scenes={scenes}
              selectedView={selectedView}
              onSelectView={setSelectedView}
              onAddScene={addScene}
            />
          </ResizablePanel>

          <ResizableHandle />

          {/* Detail Card - Right Panel */}
          <ResizablePanel defaultSize={80} minSize={50}>
            {selectedView === 'overview' ? (
              <OverviewCard
                globalContext={globalContext}
                scenes={scenes}
                videoSettings={videoSettings}
                onGlobalContextChange={setGlobalContext}
              />
            ) : selectedScene ? (
              <SceneDetailCard
                scene={selectedScene}
                sceneNumber={selectedSceneIndex + 1}
                videoSettings={videoSettings}
                projectName={projectName}
                onUpdateScene={updateScene}
                onDeleteScene={(id) => {
                  deleteScene(id);
                  setSelectedView('overview');
                }}
                onVideoSettingsChange={setVideoSettings}
                onGenerateVideo={async (scene: Scene) => {
                  const scenePrompt = `${globalContext}\n\n${scene.description}`;
                  const sceneDuration = parseInt(scene.duration.replace('s', ''), 10);
                  const referenceImagePath = scene.hasReferenceImage
                    ? await getSceneReferenceImage(scene.id)
                    : null;

                  const videoId = await createVideo({
                    model: videoSettings.model,
                    prompt: scenePrompt,
                    size: videoSettings.resolution as openai.Videos.VideoSize,
                    seconds: sceneDuration.toString() as openai.Videos.VideoSeconds,
                    ...(referenceImagePath && { input_reference: referenceImagePath as any }),
                  });

                  await addVideosToProject(projectName, [{
                    id: videoId,
                    prompt: scenePrompt,
                    model: videoSettings.model,
                    resolution: videoSettings.resolution,
                    duration: sceneDuration,
                    created_at: Date.now(),
                    scene_number: selectedSceneIndex + 1,
                    scene_title: scene.title,
                  }]);
                }}
              />
            ) : null}
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}
