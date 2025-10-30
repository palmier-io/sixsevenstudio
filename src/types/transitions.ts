export interface TransitionType {
  id: string;
  name: string;
  defaultDuration: number;
}

export const TRANSITIONS: TransitionType[] = [
  { id: "fade", name: "Cross Fade", defaultDuration: 1.0 },
  { id: "fadeblack", name: "Fade to Black", defaultDuration: 1.0 },
  { id: "wiperight", name: "Wipe Right", defaultDuration: 0.8 },
  { id: "slideleft", name: "Slide Left", defaultDuration: 1.0 },
  { id: "circleopen", name: "Circle Open", defaultDuration: 1.2 },
];
