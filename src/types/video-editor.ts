export interface VideoClip {
  id: string;
  name: string;
  videoPath: string;
  thumbnail?: string;
  originalDuration: number;
  createdAt: number;
  sceneNumber?: number;
  sceneTitle?: string;
}

export interface TimelineClip extends VideoClip {
  position: number;
  trimStart: number;
  trimEnd: number;
  duration: number;
}

export interface EditorState {
  clips: TimelineClip[];
  selectedClipId: string | null;
  previewVideoPath: string | null;
}
