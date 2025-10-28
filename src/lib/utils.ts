import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

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