import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { TimelineClip } from "@/types/video-editor";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createProjectNameFromPrompt(
  prompt: string,
  fallbackPrefix: string,
  existingProjects: string[]
): string {
  const baseName = prompt
    .slice(0, 50)
    .trim()
    .replace(/[^a-zA-Z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .toLowerCase() || `${fallbackPrefix}-${Date.now()}`;

  // Check for collisions and append suffix if needed
  let finalName = baseName;
  let suffix = 2;
  while (existingProjects.includes(finalName)) {
    finalName = `${baseName}-${suffix}`;
    suffix++;
  }

  return finalName;
}

/**
 * Calculate the total duration of clips accounting for transitions.
 * Transitions cause clips to overlap, reducing the total video length.
 *
 * Example: 3 clips of 8s, 6s, 5s with 1s transitions = 17s (not 19s)
 * - Clip 1: 8s with 1s transition = 8s - 1s overlap
 * - Clip 2: 6s with 1s transition = 6s - 1s overlap
 * - Clip 3: 5s (no transition after) = 5s
 * Total: 8 + 6 + 5 - 1 - 1 = 17s
 */
export function calculateTotalDuration(clips: TimelineClip[]): number {
  if (clips.length === 0) return 0;

  let duration = 0;
  clips.forEach((clip, index) => {
    duration += clip.duration;

    // Subtract transition duration from total (clips overlap during transition)
    if (index < clips.length - 1 && clip.transitionDuration) {
      duration -= clip.transitionDuration;
    }
  });

  return duration;
}