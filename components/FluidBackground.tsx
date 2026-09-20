"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

interface FluidBackgroundProps {
  totalLoss: number;
}

export default function FluidBackground({ totalLoss }: FluidBackgroundProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  // Derive intensity from totalLoss.
  // Using a logarithmic-like approach to handle both small and very large numbers smoothly.
  const safeLoss = Math.max(0, totalLoss);
  const intensityLevel = Math.log10(safeLoss + 1); // 0 -> 0, 100 -> ~2, 10000 -> 4, 1000000 -> 6

  const dropCount = Math.min(25, Math.floor(3 + intensityLevel * 3));
  const speedMultiplier = 1 + (intensityLevel * 0.5);

  const drops = Array.from({ length: dropCount });

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        backgroundColor: "var(--tinta, #0e1113)",
        zIndex: -1,
        overflow: "hidden",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          filter: "blur(40px)",
          opacity: 0.8,
        }}
      >
        {drops.map((_, i) => {
          const isCore = i % 3 === 0;
          const baseSize = isCore ? 400 : 150;
          const size = baseSize + Math.random() * 200 * (1 + intensityLevel * 0.2);
          
          const startX = Math.random() * 100;
          const startY = Math.random() * 100;

          const moveRange = 10 + intensityLevel * 5;

          return (
            <motion.div
              key={i}
              initial={{
                x: `${startX}vw`,
                y: `${startY}vh`,
                scale: 0.8,
                opacity: 0,
              }}
              animate={{
                x: [
                  `${startX}vw`,
                  `${startX + (Math.random() * moveRange - moveRange / 2) * speedMultiplier}vw`,
                  `${startX}vw`,
                ],
                y: [
                  `${startY}vh`,
                  `${startY + (Math.random() * moveRange - moveRange / 2) * speedMultiplier}vh`,
                  `${startY}vh`,
                ],
                scale: [0.8, 1 + intensityLevel * 0.1, 0.8],
                opacity: [0.3, 0.5 + Math.min(0.4, intensityLevel * 0.1), 0.3],
              }}
              transition={{
                duration: (15 + Math.random() * 10) / speedMultiplier,
                repeat: Infinity,
                ease: "easeInOut",
                delay: Math.random() * 2,
              }}
              style={{
                position: "absolute",
                width: size,
                height: size,
                borderRadius: "50%",
                background: isCore 
                  ? "radial-gradient(circle, rgba(90, 0, 0, 1) 0%, rgba(90, 0, 0, 0) 70%)"
                  : "radial-gradient(circle, rgba(180, 0, 0, 0.8) 0%, rgba(180, 0, 0, 0) 70%)",
                left: "-10vw",
                top: "-10vh",
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
