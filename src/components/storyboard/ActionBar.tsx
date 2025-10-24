import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowUp, Loader2, Video } from 'lucide-react';
import { toast } from 'sonner';
import { VideoSettingsButton, type VideoSettings } from '@/components/VideoSettings';
import { type Scene } from '@/hooks/tauri/use-storyboard';

interface ActionBarProps {
  responseId: string | null;
  scenes: Scene[];
  videoSettings: VideoSettings;
  onVideoSettingsChange: (settings: VideoSettings) => void;
  onRefineStoryboard: (feedback: string) => Promise<void>;
  onGenerateVideo: (settings: VideoSettings) => Promise<void>;
  onRefiningChange?: (isRefining: boolean) => void;
}

export function ActionBar({
  responseId,
  scenes,
  videoSettings,
  onVideoSettingsChange,
  onRefineStoryboard,
  onGenerateVideo,
  onRefiningChange,
}: ActionBarProps) {
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [isRefining, setIsRefining] = useState(false);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);

  // Notify parent when refining state changes
  useEffect(() => {
    onRefiningChange?.(isRefining);
  }, [isRefining, onRefiningChange]);

  const handleRefineClick = async () => {
    if (!feedbackMessage.trim() || isRefining) return;

    try {
      setIsRefining(true);
      await onRefineStoryboard(feedbackMessage);
      setFeedbackMessage('');
      toast.success('Storyboard refined successfully!');
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      toast.error('Failed to refine storyboard', { description: errMsg });
    } finally {
      setIsRefining(false);
    }
  };

  const handleGenerateClick = async () => {
    if (isGeneratingVideo) return;

    try {
      setIsGeneratingVideo(true);
      await onGenerateVideo(videoSettings);
      toast.success('Video generation started!');
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      toast.error('Failed to generate video', { description: errMsg });
    } finally {
      setIsGeneratingVideo(false);
    }
  };

  return (
    <div className="flex-shrink-0 border-t bg-background">
      <div className="px-6 py-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <div className="relative">
                <Input
                  value={feedbackMessage}
                  onChange={(e) => setFeedbackMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleRefineClick();
                    }
                  }}
                  className="w-full pr-12 h-11"
                  placeholder={
                    !responseId
                      ? "Generate a storyboard first to enable AI refinement..."
                      : "Type feedback to refine your storyboard (e.g., 'Make it more dramatic')"
                  }
                  disabled={isRefining || !responseId}
                />
                <Button
                  size="icon"
                  className="absolute right-1 top-1 h-9 w-9"
                  onClick={handleRefineClick}
                  disabled={isRefining || !feedbackMessage.trim() || !responseId}
                >
                  {isRefining ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowUp className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            <div className="flex items-center">
              <Button
                onClick={handleGenerateClick}
                disabled={isGeneratingVideo || scenes.length === 0}
                variant="default"
                className="gap-2 h-11 rounded-r-none border-r-0"
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
              <VideoSettingsButton
                settings={videoSettings}
                onSettingsChange={onVideoSettingsChange}
                variant="default"
                size="icon"
                showDuration={false}
                className="rounded-l-none h-11"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
