export enum OpenAIVideoJobStatus {
    QUEUED = "queued",
    IN_PROGRESS = "in_progress",
    COMPLETED = "completed",
    FAILED = "failed",
}

export interface OpenAIVideoJobResponse {
    id: string;
    completed_at?: number;
    created_at?: number;
    error?: any | null;
    expires_at?: number;
    model?: string;
    object?: string;
    progress?: number;
    remixed_from_video_id?: string | null;
    seconds?: string;
    size?: string;
    status?: OpenAIVideoJobStatus;
  }
  
  export interface OpenAIVideoRequestParams {
    model: string;
    prompt: string;
    size?: string;
    seconds?: string;
  }

