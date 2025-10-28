import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Upload, X, Video, Loader2 } from 'lucide-react';
import { TextEditor } from './TextEditor';
import { type Scene, useStoryboard } from '@/hooks/tauri/use-storyboard';
import { type VideoSettings, calculateCost, VideoSettingsButton } from '@/components/VideoSettings';
import { convertFileSrc } from '@tauri-apps/api/core';
import { toast } from 'sonner';

interface SceneDetailCardProps {
  scene: Scene;
  sceneNumber: number;
  videoSettings: VideoSettings;
  projectName: string;
  onUpdateScene: (id: string, field: keyof Scene, value: Scene[keyof Scene]) => void;
  onDeleteScene: (id: string) => void;
  onGenerateVideo?: (scene: Scene) => Promise<void>;
  onVideoSettingsChange?: (settings: VideoSettings) => void;
}

export function SceneDetailCard({
  scene,
  sceneNumber,
  videoSettings,
  projectName,
  onUpdateScene,
  onDeleteScene,
  onGenerateVideo,
  onVideoSettingsChange,
}: SceneDetailCardProps) {
  const { saveSceneReferenceImage, getSceneReferenceImage, deleteSceneReferenceImage } = useStoryboard(projectName);
  const [referenceImagePath, setReferenceImagePath] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);

  // Load reference image on mount
  useEffect(() => {
    const loadImage = async () => {
      const path = await getSceneReferenceImage(scene.id);
      setReferenceImagePath(path);
    };
    loadImage();
  }, [scene.id, getSceneReferenceImage]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingImage(true);
    try {
      // Convert to base64
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(',')[1];
        const path = await saveSceneReferenceImage(scene.id, base64);
        setReferenceImagePath(path);
        onUpdateScene(scene.id, 'hasReferenceImage', true);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Failed to upload image:', error);
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleRemoveImage = async () => {
    try {
      await deleteSceneReferenceImage(scene.id);
      setReferenceImagePath(null);
      onUpdateScene(scene.id, 'hasReferenceImage', false);
    } catch (error) {
      console.error('Failed to remove image:', error);
    }
  };

  const handleGenerateVideo = async () => {
    if (!onGenerateVideo || isGeneratingVideo) return;

    setIsGeneratingVideo(true);
    try {
      await onGenerateVideo(scene);
      toast.success('Video generation started!');
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      toast.error('Failed to generate video', { description: errMsg });
    } finally {
      setIsGeneratingVideo(false);
    }
  };

  const sceneDuration = parseInt(scene.duration.replace('s', ''), 10);
  const sceneCost = calculateCost({
    ...videoSettings,
    duration: sceneDuration,
  });

  return (
    <Card className="flex flex-col h-full p-6 overflow-hidden">
      <div className="flex-shrink-0 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-3">
            {/* Editable Title */}
            <div className="flex items-center gap-2">
              <span className="text-lg font-medium whitespace-nowrap">Scene {sceneNumber}: </span>
              <Input
                value={scene.title}
                onChange={(e) => onUpdateScene(scene.id, 'title', e.target.value)}
                placeholder="Scene title..."
                className="text-lg font-medium h-8 border-0 px-2 -ml-2 focus-visible:ring-1"
              />
            </div>

            {/* Duration and Cost */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <span>Duration:</span>
                <Select
                  value={scene.duration}
                  onValueChange={(value) => onUpdateScene(scene.id, 'duration', value)}
                >
                  <SelectTrigger className="w-15 h-6 text-xs border-0 px-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="4s">4s</SelectItem>
                    <SelectItem value="8s">8s</SelectItem>
                    <SelectItem value="12s">12s</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>Cost: ${sceneCost.toFixed(2)}</div>
            </div>
          </div>

          {/* Generate Video Button and Delete Button */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {onGenerateVideo && (
              <div className="flex items-center">
                <Button
                  onClick={handleGenerateVideo}
                  disabled={isGeneratingVideo}
                  variant="default"
                  size="sm"
                  className="gap-2 rounded-r-none border-r-0"
                >
                  {isGeneratingVideo ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Video className="h-4 w-4" />
                      Generate Video
                    </>
                  )}
                </Button>
                {onVideoSettingsChange && (
                  <VideoSettingsButton
                    settings={videoSettings}
                    onSettingsChange={onVideoSettingsChange}
                    variant="default"
                    size="icon-sm"
                    showDuration={false}
                    className="rounded-l-none h-8"
                  />
                )}
              </div>
            )}

            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDeleteScene(scene.id)}
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Reference Image */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-muted-foreground">Reference Image</Label>
        {referenceImagePath ? (
          <div className="relative group">
            <img
              src={convertFileSrc(referenceImagePath)}
              alt={`Reference for ${scene.title}`}
              className="w-full h-48 object-cover rounded-md border"
            />
            <Button
              variant="destructive"
              size="icon-sm"
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={handleRemoveImage}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={isUploadingImage}
              onClick={() => document.getElementById(`scene-${scene.id}-image-input`)?.click()}
            >
              <Upload className="h-4 w-4 mr-2" />
              {isUploadingImage ? 'Uploading...' : 'Upload Image'}
            </Button>
            <input
              id={`scene-${scene.id}-image-input`}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />
            <span className="text-xs text-muted-foreground">
              Optional starting frame for video generation
            </span>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-auto space-y-6">
        {/* Scene Description */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-muted-foreground">Description</Label>
          <TextEditor
            content={scene.description}
            onChange={(value) => onUpdateScene(scene.id, 'description', value)}
            placeholder="Describe what happens in this scene..."
          />
        </div>
      </div>
    </Card>
  );
}
