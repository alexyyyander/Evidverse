"use client";

import React, { useEffect, useRef, useState } from "react";
import { Timeline, TimelineState } from "@xzdarcy/react-timeline-editor";
import { Pause, Play, Save } from "lucide-react";
import { useEditorStore } from "@/store/editorStore";

export default function TimelineEditor() {
  const editorData = useEditorStore((s) => s.workspace.timeline.editorData);
  const effects = useEditorStore((s) => s.workspace.timeline.effects);
  const updateTimelineData = useEditorStore((s) => s.updateTimelineData);
  const saveToBackend = useEditorStore((s) => s.saveToBackend);
  const selectFromTimelineTime = useEditorStore((s) => s.selectFromTimelineTime);
  const playheadTime = useEditorStore((s) => s.playheadTime);
  const isPlaying = useEditorStore((s) => s.isPlaying);
  const setIsPlaying = useEditorStore((s) => s.setIsPlaying);
  const dirty = useEditorStore((s) => s.dirty);
  const timelineRef = useRef<TimelineState>(null);
  
  // Prevent hydration mismatch and ensure browser env
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isPlaying) return;
    const interval = window.setInterval(() => {
      const t = timelineRef.current?.getTime?.();
      if (typeof t !== "number") return;
      selectFromTimelineTime(t);
    }, 50);
    return () => window.clearInterval(interval);
  }, [isPlaying, selectFromTimelineTime]);

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!dirty.data && !dirty.ui) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty.data, dirty.ui]);

  useEffect(() => {
    if (!mounted) return;
    if (!timelineRef.current) return;
    if (isPlaying) return;
    if (typeof (timelineRef.current as any).setTime !== "function") return;
    const current = timelineRef.current.getTime();
    if (Math.abs(current - playheadTime) < 0.02) return;
    (timelineRef.current as any).setTime(playheadTime);
  }, [isPlaying, mounted, playheadTime]);

  const handlePlayOrPause = () => {
    if (!timelineRef.current) return;
    if (isPlaying) {
      timelineRef.current.pause();
      setIsPlaying(false);
    } else {
      timelineRef.current.play({ autoEnd: true });
      setIsPlaying(true);
    }
  };

  if (!mounted) return <div className="w-full h-full bg-gray-100 dark:bg-zinc-900 animate-pulse flex items-center justify-center text-gray-500">Loading Timeline...</div>;

  return (
    <div className="w-full h-full bg-zinc-900 text-white overflow-hidden flex flex-col">
      <div className="p-2 border-b border-zinc-700 bg-zinc-800 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <button onClick={handlePlayOrPause} className="p-1 rounded hover:bg-zinc-700 text-white">
            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
          </button>
          <span className="text-sm font-semibold">Playhead: {playheadTime.toFixed(2)}s</span>
        </div>
        <button
          onClick={() => saveToBackend({ silent: false })}
          className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-600 rounded hover:bg-blue-700 transition-colors"
        >
          <Save size={12} /> Save
        </button>
      </div>
      <div className="flex-1 min-h-0">
        <Timeline
          ref={timelineRef}
          editorData={editorData}
          effects={effects}
          onChange={(data) => {
            updateTimelineData(data);
          }}
          autoScroll={true}
          onCursorDrag={(time) => selectFromTimelineTime(time)}
          onClickTimeArea={(time) => {
            selectFromTimelineTime(time);
            return true;
          }}
          style={{ height: "100%", width: "100%" }}
        />
      </div>
    </div>
  );
}
