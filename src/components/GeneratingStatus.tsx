import { useState, useEffect, ReactNode } from "react";

interface GeneratingStatusProps {
  isGenerating: boolean;
  message?: string;
  children?: ReactNode;
  className?: string;
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

export function GeneratingStatus({
  isGenerating,
  message,
  children,
  className = "text-sm"
}: GeneratingStatusProps) {
  const [catFrame, setCatFrame] = useState(0);
  const [messageIndex, setMessageIndex] = useState(0);

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

  if (!isGenerating) {
    return null;
  }

  return (
    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3 text-white rounded-lg z-10">
      <div className="flex items-center gap-4">
        <pre className={`${className} font-mono select-none`}>
          {catFrames[catFrame]}
        </pre>
        <span className={`${className} font-medium`}>
          {message || messages[messageIndex]}
        </span>
      </div>
      {children}
    </div>
  );
}
