import { useState, useEffect } from "react";

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

interface AnimatedCatProps {
  className?: string;
  animate?: boolean;
}

export function AnimatedCat({ className = "text-sm", animate = true }: AnimatedCatProps) {
  const [catFrame, setCatFrame] = useState(0);

  useEffect(() => {
    if (!animate) return;
    const interval = setInterval(() => {
      setCatFrame((prev) => (prev + 1) % catFrames.length);
    }, 500);
    return () => clearInterval(interval);
  }, [animate]);

  return (
    <pre className={`${className} font-mono select-none`}>
      {catFrames[catFrame]}
    </pre>
  );
}
