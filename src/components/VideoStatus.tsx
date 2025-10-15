import { useState, useEffect } from "react";
import { AlertCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { OpenAIVideoJobStatus } from "@/types/openai";

interface VideoStatusProps {
  status: OpenAIVideoJobStatus;
  progress: number;
  size?: "small" | "large";
}

const catFrames = [
  ` /\\_/\\
( o.o )
 > ^ < `,
  ` /\\_/\\
( ^.^ )
 > ^ < `,
  ` /\\_/\\
( -.o )
 > ^ < `,
];

const messages = [
  "cooking...",
  "meowing...",
  "six seven...",
  "almost there...",
];

export function VideoStatus({ status, progress, size = "small" }: VideoStatusProps) {
  const [catFrame, setCatFrame] = useState(0);
  const [messageIndex, setMessageIndex] = useState(0);
  const isGenerating = status === OpenAIVideoJobStatus.QUEUED || status === OpenAIVideoJobStatus.IN_PROGRESS;
  const hasFailed = status === OpenAIVideoJobStatus.FAILED;

  // Animate cat frames (blinking effect)
  useEffect(() => {
    if (!isGenerating) return;
    const interval = setInterval(() => {
      setCatFrame((prev) => (prev + 1) % catFrames.length);
    }, 500);
    return () => clearInterval(interval);
  }, [isGenerating]);

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

  // Failed state
  if (hasFailed) {
    return (
      <div className="absolute inset-0 bg-red-950/80 flex flex-col items-center justify-center gap-2 text-red-200">
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
    <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-2 text-white">
      <div className="flex items-center gap-3">
        <pre className={`${isSmall ? "text-[8px] leading-tight" : "text-xs"} font-mono select-none`}>
          {catFrames[catFrame]}
        </pre>
        <span className={`${isSmall ? "text-[10px]" : "text-sm"} font-medium`}>
          {status === OpenAIVideoJobStatus.QUEUED ? "queued..." : messages[messageIndex]}
        </span>
      </div>
      {status === OpenAIVideoJobStatus.IN_PROGRESS && (
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
