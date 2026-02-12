"use client";

import React, { useEffect, useState, useRef } from 'react';
import { Timeline, TimelineState } from '@xzdarcy/react-timeline-editor';
import { useTimelineStore } from '@/store/timelineStore';
import { useEditorStore } from '@/store/editorStore';
import { Save, Play, Pause, Undo2, Redo2 } from 'lucide-react';

export default function TimelineEditor() {
  const { editorData, effects, setEditorData, setCurrentTime, projectId } = useTimelineStore();
  const {
    selectTimelineItem,
    selection,
    saveProject,
    syncTimelineFromRows,
    beginHistoryGroup,
    endHistoryGroup,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useEditorStore(state => ({
    selectTimelineItem: state.selectTimelineItem,
    selection: state.selection,
    saveProject: state.saveProject,
    syncTimelineFromRows: state.syncTimelineFromRows,
    beginHistoryGroup: state.beginHistoryGroup,
    endHistoryGroup: state.endHistoryGroup,
    undo: state.undo,
    redo: state.redo,
    canUndo: state.canUndo,
    canRedo: state.canRedo,
  }));
  const timelineRef = useRef<TimelineState>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [dirty, setDirty] = useState(false);
  const saveTimerRef = useRef<number | null>(null);
  const [scaleWidth, setScaleWidth] = useState(160);
  const [scale, setScale] = useState(1);
  const startLeft = 20;

  useEffect(() => {
    if (selection.source === 'timeline') return;
    if (!selection.selectedTimelineItemId) return;

    for (const row of editorData) {
      const action = row.actions.find(a => a.id === selection.selectedTimelineItemId);
      if (action) {
        setCurrentTime(action.start);
        if (timelineRef.current) {
            timelineRef.current.setTime(action.start);
            const scrollLeft = Math.max(0, (action.start / scale) * scaleWidth - 200);
            timelineRef.current.setScrollLeft(scrollLeft);
        }
        break;
      }
    }
  }, [selection.selectedTimelineItemId, selection.source, editorData, setCurrentTime, scale, scaleWidth]);
  
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

  useEffect(() => {
    if (!dirty) return;
    if (!projectId) return;
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => {
      saveProject(projectId, { silent: true }).finally(() => {
        setDirty(false);
      });
    }, 800);
    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  }, [dirty, effects, editorData, saveProject, projectId]);

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!dirty) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

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
    <div
      ref={containerRef}
      className="w-full h-full bg-zinc-900 text-white overflow-hidden border-t border-zinc-700"
      onWheel={(e) => {
        if (!e.ctrlKey && !e.metaKey) return;
        e.preventDefault();
        const next = Math.max(40, Math.min(280, scaleWidth + (e.deltaY > 0 ? -10 : 10)));
        setScaleWidth(next);
      }}
    >
      <div className="p-2 border-b border-zinc-700 bg-zinc-800 flex justify-between items-center">
         <div className="flex items-center gap-2">
            <button 
              onClick={handlePlayOrPause}
              className="p-1 rounded hover:bg-zinc-700 text-white"
            >
               {isPlaying ? <Pause size={16} /> : <Play size={16} />}
            </button>
            <button
              onClick={() => undo()}
              disabled={!canUndo()}
              className="p-1 rounded hover:bg-zinc-700 text-white disabled:opacity-40"
            >
              <Undo2 size={16} />
            </button>
            <button
              onClick={() => redo()}
              disabled={!canRedo()}
              className="p-1 rounded hover:bg-zinc-700 text-white disabled:opacity-40"
            >
              <Redo2 size={16} />
            </button>
            <span className="text-sm font-semibold">Timeline</span>
         </div>
         <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 hidden md:inline">Drag clips or use context menu to add</span>
            <button 
              onClick={() => {
                if(projectId) saveProject(projectId, { silent: false }).finally(() => setDirty(false));
              }} 
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
        scale={scale}
        scaleWidth={scaleWidth}
        startLeft={startLeft}
        onChange={(data) => {
          setEditorData(data);
          syncTimelineFromRows(data as any);
          setDirty(true);
        }}
        autoScroll={true}
        onActionMoveStart={() => beginHistoryGroup()}
        onActionMoveEnd={() => endHistoryGroup()}
        onActionResizeStart={() => beginHistoryGroup()}
        onActionResizeEnd={() => endHistoryGroup()}
        onCursorDrag={(time) => setCurrentTime(time)}
        onClickTimeArea={(time) => { setCurrentTime(time); return true; }}
        onClickActionOnly={(e, { action }) => {
          selectTimelineItem(action.id, 'timeline');
        }}
        style={{ height: 'calc(100% - 40px)', width: '100%' }}
      />
    </div>
  );
}
