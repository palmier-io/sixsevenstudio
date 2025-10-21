import { AlertCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { OpenAIVideoJobStatus } from "@/types/openai";
import { GeneratingStatus } from "./GeneratingStatus";

interface VideoStatusProps {
  status: OpenAIVideoJobStatus;
  progress: number;
  size?: "small" | "large";
}

export function VideoStatus({ status, progress, size = "small" }: VideoStatusProps) {
  const isGenerating = status === OpenAIVideoJobStatus.QUEUED || status === OpenAIVideoJobStatus.IN_PROGRESS;
  const hasFailed = status === OpenAIVideoJobStatus.FAILED;

  if (!isGenerating && !hasFailed) {
    return null;
  }

  const isSmall = size === "small";
  const sizeClass = isSmall ? "text-[8px] leading-tight" : "text-xs";

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
    <GeneratingStatus
      isGenerating={isGenerating}
      message={status === OpenAIVideoJobStatus.QUEUED ? "queued..." : undefined}
      className={sizeClass}
    >
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
    </GeneratingStatus>
  );
}
