export interface TransitionType {
  id: string;
  name: string;
  defaultDuration: number;
}

export const TRANSITIONS: TransitionType[] = [
  { id: "fade", name: "Fade", defaultDuration: 1.0 },
  { id: "dissolve", name: "Dissolve", defaultDuration: 1.0 },
  { id: "fadeblack", name: "Fade Black", defaultDuration: 1.0 },
  { id: "fadewhite", name: "Fade White", defaultDuration: 1.0 },
  { id: "wipeleft", name: "Wipe Left", defaultDuration: 0.8 },
  { id: "wiperight", name: "Wipe Right", defaultDuration: 0.8 },
  { id: "wipeup", name: "Wipe Up", defaultDuration: 0.8 },
  { id: "wipedown", name: "Wipe Down", defaultDuration: 0.8 },
  { id: "slideleft", name: "Slide Left", defaultDuration: 1.0 },
  { id: "slideright", name: "Slide Right", defaultDuration: 1.0 },
  { id: "circleopen", name: "Circle Open", defaultDuration: 1.2 },
  { id: "circleclose", name: "Circle Close", defaultDuration: 1.2 },
];
