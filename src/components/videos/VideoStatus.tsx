import { useState, useEffect } from "react";
import { VideoStatus as OpenAIVideoStatus } from "@/lib/openai/video";
import { AnimatedCat } from "@/components/AnimatedCat";
import { AlertCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface VideoStatusProps {
  status: OpenAIVideoStatus;
  progress: number;
  size?: "small" | "large";
}

const messages = [
  "cooking...",
  "meowing...",
  "six seven...",
  "almost there...",
];

export function VideoStatus({ status, progress, size = "small" }: VideoStatusProps) {
  const [messageIndex, setMessageIndex] = useState(0);

  const isGenerating = status === OpenAIVideoStatus.QUEUED || status === OpenAIVideoStatus.IN_PROGRESS;
  const hasFailed = status === OpenAIVideoStatus.FAILED;
  const isQueued = status === OpenAIVideoStatus.QUEUED;
  const showProgress = status === OpenAIVideoStatus.IN_PROGRESS;

  // Rotate messages
  useEffect(() => {
    if (!isGenerating) return;
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % messages.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [isGenerating]);

  if (!isGenerating && !hasFailed) {
    return null;
  }

  const isSmall = size === "small";
  const sizeClass = isSmall ? "text-[8px] leading-tight" : "text-sm";

  // Failed state
  if (hasFailed) {
    return (
      <div className="absolute inset-0 bg-red-950/80 flex flex-col items-center justify-center gap-2 text-red-200 rounded-lg z-10">
        <AlertCircle className={isSmall ? "size-4" : "size-8"} />
        <span className={isSmall ? "text-[10px]" : "text-sm"}>
          {isSmall ? "Failed" : "Video Generation Failed"}
        </span>
        {!isSmall && (
          <span className="text-xs">Please try creating a new video</span>
        )}
      </div>
    );
  }

  // Generating state
  return (
    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3 text-white rounded-lg z-10">
      <div className="flex items-center gap-4">
        <AnimatedCat className={sizeClass} animate={isGenerating} />
        <span className={`${sizeClass} font-medium`}>
          {isQueued ? "queued..." : messages[messageIndex]}
        </span>
      </div>
      {showProgress && (
        <div className={isSmall ? "w-3/4 space-y-0.5" : "w-2/3 space-y-2"}>
          <div className={`flex justify-between ${isSmall ? "text-[9px]" : "text-xs"}`}>
            <span>Progress</span>
            <span>{progress}%</span>
          </div>
          <Progress
            value={progress}
            className={`${isSmall ? "h-0.5" : "h-1"} bg-white/20`}
          />
        </div>
      )}
    </div>
  );
}
