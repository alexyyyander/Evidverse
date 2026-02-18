"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

export const GlassGrid = () => {
  const [particles, setParticles] = useState<Array<{
    id: number;
    left: number;
    top: number;
    size: number;
    scale: number;
    blur: number;
    opacity: number;
    driftX: number;
    driftY: number;
    delay: number;
    duration: number;
  }>>([]);

  useEffect(() => {
    const rows = 10;
    const cols = 16;
    const items: Array<{
      id: number;
      left: number;
      top: number;
      size: number;
      scale: number;
      blur: number;
      opacity: number;
      driftX: number;
      driftY: number;
      delay: number;
      duration: number;
    }> = [];

    let id = 0;
    for (let y = 0; y < rows; y += 1) {
      for (let x = 0; x < cols; x += 1) {
        const keep = Math.random() > 0.35;
        if (!keep) continue;

        const baseLeft = ((x + 0.5) / cols) * 100;
        const baseTop = ((y + 0.5) / rows) * 100;
        const jitterX = (Math.random() - 0.5) * 2.2;
        const jitterY = (Math.random() - 0.5) * 2.2;

        const wave = (Math.sin(x * 0.55 + y * 0.35) + 1) / 2;
        const depth = Math.min(1, Math.max(0, wave * 0.85 + Math.random() * 0.15));
        const scale = 0.52 + depth * 0.78;
        const blur = (1 - depth) * 2.4;
        const opacity = 0.05 + depth * 0.14;
        const size = 12 + Math.round(depth * 44);

        const driftX = (Math.sin((x + y) * 0.4) * 10 + (Math.random() - 0.5) * 6) * (0.35 + depth * 0.65);
        const driftY = (-12 - depth * 26) * (0.6 + Math.random() * 0.6);
        const delay = ((x + y) % 9) * 0.25 + Math.random() * 0.35;
        const duration = 10 + (1 - depth) * 10 + Math.random() * 6;

        items.push({
          id,
          left: baseLeft + jitterX,
          top: baseTop + jitterY,
          size,
          scale,
          blur,
          opacity,
          driftX,
          driftY,
          delay,
          duration,
        });
        id += 1;
      }
    }

    setParticles(items);
  }, []);

  return (
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
      <div className="absolute inset-0">
        <div className="absolute inset-0 opacity-0 animate-breathe-blue bg-[radial-gradient(circle_at_30%_40%,rgba(59,130,246,0.35),transparent_55%)]" />
        <div className="absolute inset-0 opacity-0 animate-breathe-purple bg-[radial-gradient(circle_at_70%_35%,rgba(168,85,247,0.32),transparent_55%)]" />
        <div className="absolute inset-0 opacity-0 animate-breathe-orange bg-[radial-gradient(circle_at_55%_70%,rgba(249,115,22,0.25),transparent_60%)]" />
      </div>

      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-[0.08] [mask-image:radial-gradient(ellipse_at_center,black_38%,transparent_72%)]" />

      <div className="absolute inset-0">
        {particles.map((p) => (
          <div
            key={p.id}
            className="absolute"
            style={{
              left: `${p.left}%`,
              top: `${p.top}%`,
              opacity: p.opacity,
              transform: `translate(-50%, -50%) scale(${p.scale})`,
            }}
          >
            <div
              className={cn(
                "rounded-sm border border-white/10 bg-white/5 backdrop-blur-md shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_10px_40px_rgba(0,0,0,0.35)]",
                "animate-chip-float"
              )}
              style={
                {
                  width: `${p.size}px`,
                  height: `${p.size}px`,
                  filter: `blur(${p.blur}px)`,
                  animationDelay: `${p.delay}s`,
                  animationDuration: `${p.duration}s`,
                  ["--dx" as any]: `${p.driftX}px`,
                  ["--dy" as any]: `${p.driftY}px`,
                } as any
              }
            />
          </div>
        ))}
      </div>

      <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/90 via-transparent to-zinc-950/90 pointer-events-none" />
    </div>
  );
};
