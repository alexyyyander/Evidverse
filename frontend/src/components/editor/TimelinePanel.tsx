"use client";

import dynamic from "next/dynamic";

const TimelineEditor = dynamic(() => import("@/components/TimelineEditor"), { ssr: false });

export default function TimelinePanel() {
  return (
    <div className="h-full w-full bg-zinc-900 border-t border-border flex flex-col relative z-0">
      <TimelineEditor />
    </div>
  );
}
