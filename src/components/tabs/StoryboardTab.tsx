import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { useProjects } from '@/hooks/tauri/use-projects';
import { useStoryboard, type Scene } from '@/hooks/tauri/use-storyboard';
import { useVideos } from '@/hooks/tauri/use-videos';
import { type VideoSettings } from '@/components/VideoSettings';
import { DEFAULT_VIDEO_SETTINGS, STARTING_FRAME_FILENAME } from '@/types/constants';
import { StartingFramePanel } from '@/components/storyboard/StartingFramePanel';
import { StoryboardEditor } from '@/components/storyboard/StoryboardEditor';
import { ActionBar } from '@/components/storyboard/ActionBar';

const SAVE_AFTER_IDLE_SECONDS = 5000; // 5 seconds

interface StoryboardTabProps {
  projectName: string;
}

export function StoryboardTab({ projectName }: StoryboardTabProps) {
  const location = useLocation();
  const { getProject, addVideosToProject, saveImage, getImage, deleteImage } = useProjects();
  const { storyboard, isLoading: isLoadingStoryboard, generateStoryboard, saveStoryboard } = useStoryboard(projectName);
  const { createVideo } = useVideos();

  const [scenes, setScenes] = useState<Scene[]>([]);
  const [globalContext, setGlobalContext] = useState('');
  const [responseId, setResponseId] = useState<string | null>(null);
  const [videoSettings, setVideoSettings] = useState<VideoSettings>(DEFAULT_VIDEO_SETTINGS);
  const [isRefining, setIsRefining] = useState(false);

  // Sync storyboard data from query to local state
  useEffect(() => {
    if (storyboard) {
      setScenes(storyboard.scenes);
      setGlobalContext(storyboard.global_context);
    } else if (!isLoadingStoryboard) {
      // Initialize with default first scene if no data exists
      setScenes([{
        id: '1',
        title: 'Scene 1',
        description: '',
        duration: '3s',
      }]);
      setGlobalContext('');
    }
  }, [storyboard, isLoadingStoryboard]);

  // Load response_id from project metadata
  useEffect(() => {
    const loadResponseId = async () => {
      if (!projectName) return;
      try {
        const projectMeta = await getProject(projectName);
        setResponseId(projectMeta.storyboard_response_id ?? null);
      } catch (err) {
        console.error('Failed to load project metadata:', err);
      }
    };
    loadResponseId();
  }, [projectName, getProject]);

  // Auto-save storyboard when scenes or global context changes
  useEffect(() => {
    if (!projectName || isLoadingStoryboard) return;

    const saveData = async () => {
      try {
        await saveStoryboard({
          scenes,
          global_context: globalContext,
        });
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        console.error('Failed to save storyboard:', errMsg);
      }
    };

    // Debounce save to avoid too many writes
    const timeoutId = setTimeout(saveData, SAVE_AFTER_IDLE_SECONDS);
    return () => clearTimeout(timeoutId);
  }, [scenes, globalContext, projectName, isLoadingStoryboard, saveStoryboard]);

  const addScene = () => {
    const newScene: Scene = {
      id: String(scenes.length + 1),
      title: `Scene ${scenes.length + 1}`,
      description: '',
      duration: '4s',
    };
    setScenes([...scenes, newScene]);
  };

  const deleteScene = (id: string) => {
    setScenes(scenes.filter(scene => scene.id !== id));
  };

  const updateScene = (id: string, field: keyof Scene, value: string) => {
    setScenes(scenes.map(scene =>
      scene.id === id ? { ...scene, [field]: value } : scene
    ));
  };

  // Calculate total seconds from all scenes
  const calculateTotalSeconds = () => {
    return scenes.reduce((total, scene) => {
      const match = scene.duration.match(/(\d+)s/);
      const seconds = match ? parseInt(match[1], 10) : 0;
      return total + seconds;
    }, 0);
  };

  // Show generating state when:
  // 1. Coming from Home.tsx and generation is in progress (prompt in state but no storyboard)
  // 2. Actively refining the storyboard
  const isGenerating = (!!location.state?.prompt && !storyboard) || isRefining;

  return (
    <div className="h-full w-full flex flex-col overflow-hidden">
      <ResizablePanelGroup direction="vertical">
        {/* Main Content */}
        <ResizablePanel defaultSize={75} minSize={40}>
          <div className="h-full p-6">
            <ResizablePanelGroup direction="horizontal" className="gap-6">
              <ResizablePanel defaultSize={30} minSize={15}>
                <StartingFramePanel
                  projectName={projectName}
                  onImageUpload={async (base64Data) => {
                    return await saveImage(projectName, STARTING_FRAME_FILENAME, base64Data);
                  }}
                  onImageDelete={async () => {
                    await deleteImage(projectName, STARTING_FRAME_FILENAME);
                  }}
                  onImageLoad={async () => {
                    try {
                      return await getImage(projectName, STARTING_FRAME_FILENAME);
                    } catch (err) {
                      console.error('Failed to load image:', err);
                      return null;
                    }
                  }}
                />
              </ResizablePanel>
              <ResizableHandle />
              <ResizablePanel defaultSize={70} minSize={50}>
                <StoryboardEditor
                  scenes={scenes}
                  globalContext={globalContext}
                  totalSeconds={calculateTotalSeconds()}
                  videoSettings={videoSettings}
                  onGlobalContextChange={setGlobalContext}
                  onAddScene={addScene}
                  onDeleteScene={deleteScene}
                  onUpdateScene={updateScene}
                  isGenerating={isGenerating}
                />
              </ResizablePanel>
            </ResizablePanelGroup>
          </div>
        </ResizablePanel>

        <ResizableHandle />

        <ResizablePanel defaultSize={10} minSize={10}>
          <ActionBar
            responseId={responseId}
            scenes={scenes}
            videoSettings={videoSettings}
            onVideoSettingsChange={setVideoSettings}
            onRefiningChange={setIsRefining}
            onRefineStoryboard={async (feedback: string) => {
              const refinedData = await generateStoryboard({ prompt: feedback });
              setScenes(refinedData.scenes);
              setGlobalContext(refinedData.global_context);
            }}
            onGenerateVideo={async (settings: VideoSettings) => {
              const projectMeta = await getProject(projectName);
              const imagePath = projectMeta.image_path ? await getImage(projectName, STARTING_FRAME_FILENAME) : undefined;

              // Create parallel API calls for each scene
              const videoPromises = scenes.map(async (scene, index) => {
                const scenePrompt = `${globalContext}\n\n${scene.description}`;

                const sceneDuration = parseInt(scene.duration.replace('s', ''), 10);

                const videoId = await createVideo({
                  model: settings.model,
                  prompt: scenePrompt,
                  size: settings.resolution,
                  seconds: String(sceneDuration),
                  inputReferencePath: imagePath || undefined,
                });

                return {
                  id: videoId,
                  prompt: scenePrompt,
                  model: settings.model,
                  resolution: settings.resolution,
                  duration: sceneDuration,
                  created_at: Date.now(),
                  scene_number: index + 1,
                  scene_title: scene.title,
                };
              });

              const videosMeta = await Promise.all(videoPromises);
              await addVideosToProject(projectName, videosMeta);
            }}
          />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
