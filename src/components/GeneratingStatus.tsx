import { useState, useEffect, ReactNode } from "react";
import { AnimatedCat } from "@/components/AnimatedCat";

interface GeneratingStatusProps {
  isGenerating: boolean;
  message?: string;
  children?: ReactNode;
  className?: string;
}

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
  const [messageIndex, setMessageIndex] = useState(0);

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
        <AnimatedCat className={className} animate={isGenerating} />
        <span className={`${className} font-medium`}>
          {message || messages[messageIndex]}
        </span>
      </div>
      {children}
    </div>
  );
}
