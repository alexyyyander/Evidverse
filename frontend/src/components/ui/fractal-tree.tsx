"use client";

import { memo, useMemo } from "react";
import { cn } from "@/lib/cn";

type Segment = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  depth: number;
  branchWidth: number;
};

const MIN_SEGMENTS = 200;
const DEFAULT_MAX_SEGMENTS = 2800;

type RandomFn = () => number;

function createSeededRandom(seedInput: string): RandomFn {
  let hash = 2166136261;
  for (let i = 0; i < seedInput.length; i += 1) {
    hash ^= seedInput.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  let state = (hash >>> 0) || 1;
  return () => {
    state = Math.imul(state, 1664525) + 1013904223;
    return ((state >>> 0) & 0x7fffffff) / 0x80000000;
  };
}

function buildTreeSegments(
  x: number,
  y: number,
  length: number,
  angle: number,
  depth: number,
  maxDepth: number,
  baseWidth: number,
  out: Segment[],
  maxSegments: number
) {
  if (depth <= 0 || length < 1.5 || out.length >= maxSegments) return;

  const x2 = x + Math.cos(angle) * length;
  const y2 = y - Math.sin(angle) * length;

  const widthRatio = depth / maxDepth;
  const branchWidth = Math.max(0.3, baseWidth * widthRatio);

  out.push({ x1: x, y1: y, x2, y2, depth, branchWidth });

  const branchScale = depth > maxDepth * 0.45 ? 0.73 : 0.69;
  const nextLength = length * branchScale;
  const swing = 0.36 + (maxDepth - depth) * 0.013;

  buildTreeSegments(x2, y2, nextLength, angle + swing, depth - 1, maxDepth, baseWidth, out, maxSegments);
  buildTreeSegments(x2, y2, nextLength, angle - swing, depth - 1, maxDepth, baseWidth, out, maxSegments);

  if (depth % 2 === 0 && out.length < maxSegments) {
    buildTreeSegments(
      x2,
      y2,
      nextLength * 0.9,
      angle,
      depth - 1,
      maxDepth,
      baseWidth * 0.85,
      out,
      maxSegments,
    );
  }

  if (depth > 2 && depth % 3 === 0 && out.length < maxSegments) {
    buildTreeSegments(
      x2,
      y2,
      nextLength * 0.6,
      angle + swing * 1.5,
      depth - 2,
      maxDepth,
      baseWidth * 0.5,
      out,
      maxSegments,
    );
    buildTreeSegments(
      x2,
      y2,
      nextLength * 0.6,
      angle - swing * 1.5,
      depth - 2,
      maxDepth,
      baseWidth * 0.5,
      out,
      maxSegments,
    );
  }
}

function buildVines(
  x: number,
  y: number,
  length: number,
  angle: number,
  depth: number,
  maxDepth: number,
  out: Segment[],
  maxSegments: number,
  random: RandomFn
) {
  if (depth <= 0 || length < 2 || out.length >= maxSegments) return;

  const x2 = x + Math.cos(angle) * length;
  const y2 = y - Math.sin(angle) * length;

  out.push({ x1: x, y1: y, x2, y2, depth, branchWidth: 0.3 + (depth / maxDepth) * 0.4 });

  const nextLength = length * 0.65;
  const swing = 0.4 + random() * 0.2;

  buildVines(x2, y2, nextLength, angle + swing, depth - 1, maxDepth, out, maxSegments, random);
  buildVines(x2, y2, nextLength, angle - swing, depth - 1, maxDepth, out, maxSegments, random);

  if (depth > 1 && random() > 0.5 && out.length < maxSegments) {
    buildVines(x2, y2, nextLength * 0.8, angle + swing * 0.7, depth - 2, maxDepth, out, maxSegments, random);
  }
}

function FractalTree({
  className,
  depth = 8,
  stroke = "rgba(168, 255, 244, 0.34)",
  glow = "rgba(168, 255, 244, 0.08)",
  thickness = 1,
  showVines = false,
  vineCount = 0,
  maxSegments = DEFAULT_MAX_SEGMENTS,
}: {
  className?: string;
  depth?: number;
  stroke?: string;
  glow?: string;
  thickness?: number;
  showVines?: boolean;
  vineCount?: number;
  maxSegments?: number;
}) {
  const width = 600;
  const height = 700;
  const segmentLimit = Math.max(MIN_SEGMENTS, Math.floor(maxSegments));
  const segments = useMemo(() => {
    const out: Segment[] = [];
    const random = createSeededRandom(
      `${depth}|${thickness}|${showVines ? 1 : 0}|${vineCount}|${segmentLimit}`,
    );

    buildTreeSegments(
      width / 2,
      height - 30,
      120 * thickness,
      Math.PI / 2,
      depth,
      depth,
      2.5 * thickness,
      out,
      segmentLimit,
    );

    if (showVines) {
      for (let i = 0; i < vineCount; i += 1) {
        if (out.length >= segmentLimit) break;
        const startX = width / 2 + (random() - 0.5) * 100;
        const startY = height - 100 - random() * 200;
        const startAngle = Math.PI / 2 + (random() - 0.5) * 0.8;
        buildVines(startX, startY, 30 + random() * 40, startAngle, 4, 4, out, segmentLimit, random);
      }
    }

    return out;
  }, [depth, segmentLimit, showVines, thickness, vineCount]);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={cn("fractal-tree", className)}
      fill="none"
      aria-hidden="true"
    >
      <circle cx={width / 2} cy={height * 0.65} r={width * 0.4} fill={glow} />

      <g>
        {segments.map((seg, i) => {
          const ratio = seg.depth / depth;
          const lineWidth = seg.branchWidth || Math.max(0.5, ratio * 2.5 * thickness);
          const opacity = 0.15 + ratio * 0.55;
          return (
            <line
              key={`${i}-${seg.x1}-${seg.y1}`}
              x1={seg.x1}
              y1={seg.y1}
              x2={seg.x2}
              y2={seg.y2}
              stroke={stroke}
              strokeOpacity={opacity}
              strokeWidth={lineWidth}
              strokeLinecap="round"
            />
          );
        })}
      </g>
    </svg>
  );
}

export default memo(FractalTree);
