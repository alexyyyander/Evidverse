"use client";

import React, { useEffect, useState, useRef } from 'react';
import { Timeline, TimelineState } from '@xzdarcy/react-timeline-editor';
import { useTimelineStore } from '@/store/timelineStore';
import { Save, Play, Pause } from 'lucide-react';

export default function TimelineEditor() {
  const { editorData, effects, setEditorData, saveToBackend, setCurrentTime } = useTimelineStore();
  const timelineRef = useRef<TimelineState>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Prevent hydration mismatch and ensure browser env
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
        if (timelineRef.current) {
            setCurrentTime(timelineRef.current.getTime());
        }
    }, 50);
    return () => clearInterval(interval);
  }, [isPlaying, setCurrentTime]);

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

  if (!mounted) return <div className="w-full h-[300px] bg-gray-100 dark:bg-zinc-900 animate-pulse flex items-center justify-center text-gray-500">Loading Timeline...</div>;

  return (
    <div className="w-full h-[300px] bg-zinc-900 text-white overflow-hidden border-t border-zinc-700">
      <div className="p-2 border-b border-zinc-700 bg-zinc-800 flex justify-between items-center">
         <div className="flex items-center gap-2">
            <button 
              onClick={handlePlayOrPause}
              className="p-1 rounded hover:bg-zinc-700 text-white"
            >
               {isPlaying ? <Pause size={16} /> : <Play size={16} />}
            </button>
            <span className="text-sm font-semibold">Timeline</span>
         </div>
         <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 hidden md:inline">Drag clips or use context menu to add</span>
            <button 
              onClick={() => saveToBackend()} 
              className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-600 rounded hover:bg-blue-700 transition-colors"
            >
              <Save size={12} /> Save
            </button>
         </div>
      </div>
      <Timeline
        ref={timelineRef}
        editorData={editorData}
        effects={effects}
        onChange={(data) => setEditorData(data)}
        autoScroll={true}
        onCursorDrag={(time) => setCurrentTime(time)}
        onClickTimeArea={(time) => { setCurrentTime(time); return true; }}
        style={{ height: 'calc(100% - 40px)', width: '100%' }}
      />
    </div>
  );
}
