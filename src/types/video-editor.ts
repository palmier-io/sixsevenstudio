// Video clip in the library or on timeline
export interface VideoClip {
  id: string;
  name: string;
  videoPath: string; // Path to the video file
  thumbnail?: string; // Optional thumbnail URL
  originalDuration: number; // Duration of the original video in seconds
  createdAt: number;
  sceneNumber?: number; // Optional scene number if this is a scene video
  sceneTitle?: string; // Optional scene title if this is a scene video
}

// Clip on the timeline (extends VideoClip with editing information)
export interface TimelineClip extends VideoClip {
  position: number; // Position on timeline in seconds
  trimStart: number; // Trim start time in seconds (relative to original video)
  trimEnd: number; // Trim end time in seconds (relative to original video)
  duration: number; // Effective duration after trim (trimEnd - trimStart)
}

// Editor state that gets persisted to disk
export interface EditorState {
  clips: TimelineClip[];
  selectedClipId: string | null;
  currentPlaybackTime: number | null;
  previewVideoPath: string | null;
}
