"use client";

import React, { useEffect, useMemo, useState, useRef } from 'react';
import { Timeline, TimelineState } from '@xzdarcy/react-timeline-editor';
import { useTimelineStore } from '@/store/timelineStore';
import { useEditorStore } from '@/store/editorStore';
import { Save, Play, Pause, Undo2, Redo2, Plus, Magnet, Layers, ChevronDown, ChevronRight, AlignLeft, Lock, Unlock } from 'lucide-react';
import { useI18n } from "@/lib/i18nContext";

export default function TimelineEditor() {
  const { t } = useI18n();
  const { editorData, effects, setEditorData, setCurrentTime, projectId } = useTimelineStore();
  const {
    selectTimelineItem,
    selection,
    layout,
    updateLayout,
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
    layout: state.layout,
    updateLayout: state.updateLayout,
    saveProject: state.saveProject,
    syncTimelineFromRows: state.syncTimelineFromRows,
    beginHistoryGroup: state.beginHistoryGroup,
    endHistoryGroup: state.endHistoryGroup,
    undo: state.undo,
    redo: state.redo,
    canUndo: state.canUndo,
    canRedo: state.canRedo,
  }));
  const editorModel = useEditorStore((s) => s.data);
  const timelineRef = useRef<TimelineState>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const miniMapRef = useRef<HTMLDivElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [dirty, setDirty] = useState(false);
  const saveTimerRef = useRef<number | null>(null);
  const [scaleWidth, setScaleWidth] = useState(160);
  const [scale, setScale] = useState(1);
  const startLeft = 20;
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [markersEnabled, setMarkersEnabled] = useState(true);
  const [tracksOpen, setTracksOpen] = useState(false);
  const [collapsedRowIds, setCollapsedRowIds] = useState<string[]>([]);
  const collapsedRowSet = useMemo(() => new Set(collapsedRowIds), [collapsedRowIds]);
  const [scrollState, setScrollState] = useState({ left: 0, top: 0, viewportWidth: 0 });
  const scrollRafRef = useRef<number | null>(null);
  const pendingScrollRef = useRef<{ scrollLeft: number; scrollTop: number } | null>(null);
  const miniMapDragRef = useRef<{ dragging: boolean; startX: number; startScrollLeft: number }>({
    dragging: false,
    startX: 0,
    startScrollLeft: 0,
  });
  const [multiSelectedActionIds, setMultiSelectedActionIds] = useState<string[]>([]);
  const multiSelectedSet = useMemo(() => new Set(multiSelectedActionIds), [multiSelectedActionIds]);
  const selectedSet = useMemo(() => {
    const s = new Set<string>();
    if (selection.selectedTimelineItemId) s.add(selection.selectedTimelineItemId);
    for (const id of multiSelectedActionIds) s.add(id);
    return s;
  }, [selection.selectedTimelineItemId, multiSelectedActionIds]);

  const markers = useMemo(() => {
    const items = Object.values(editorModel.timelineItems).sort((a, b) => a.startTime - b.startTime);
    return items
      .map((item) => {
        if (!item.linkedBeatId) return null;
        const beat = editorModel.beats[item.linkedBeatId];
        if (!beat) return null;
        const scene = editorModel.scenes[beat.sceneId];
        const title = scene?.title ? `${scene.title} / Beat ${beat.order + 1}` : `Beat ${beat.order + 1}`;
        return { id: item.id, time: item.startTime, title };
      })
      .filter(Boolean) as Array<{ id: string; time: number; title: string }>;
  }, [editorModel.timelineItems, editorModel.beats, editorModel.scenes]);

  const markerActions = useMemo(() => {
    if (!markersEnabled) return [];
    return markers.map((m) => ({
      id: `__marker_action__${m.id}`,
      start: m.time,
      end: m.time + 0.01,
      effectId: `__marker_effect__${m.id}`,
      movable: false,
      flexible: false,
      disable: true,
    }));
  }, [markers, markersEnabled]);

  const timelineEffects = useMemo(() => {
    if (!markersEnabled) return effects;
    const next: Record<string, any> = { ...(effects as any) };
    for (const m of markers) {
      next[`__marker_effect__${m.id}`] = { id: `__marker_effect__${m.id}`, name: m.title };
    }
    return next;
  }, [effects, markers, markersEnabled]);

  const displayEditorData = useMemo(() => {
    const baseRows = editorData.map((row) => {
      const decorated = {
        ...row,
        actions: row.actions.map((a) => ({ ...a, selected: selectedSet.has(a.id) })),
      };
      if (!collapsedRowSet.has(row.id)) return decorated;
      return { ...decorated, actions: [], rowHeight: 14, classNames: [...(row.classNames || []), "is-collapsed"] };
    });
    if (!markersEnabled) return baseRows;
    return [
      { id: "__markers__", rowHeight: 12, actions: markerActions, classNames: ["marker-row"] },
      ...baseRows,
    ] as any;
  }, [editorData, collapsedRowSet, markersEnabled, markerActions, selectedSet]);

  const maxTime = useMemo(() => {
    let max = 0;
    for (const row of editorData) {
      for (const a of row.actions) max = Math.max(max, a.end);
    }
    return max;
  }, [editorData]);

  const contentWidth = useMemo(() => startLeft + (maxTime / scale) * scaleWidth + 300, [maxTime, scale, scaleWidth]);

  const visibleMarkers = useMemo(() => {
    if (!markersEnabled) return [];
    const leftTime = (Math.max(0, scrollState.left - startLeft) / scaleWidth) * scale;
    const rightTime = ((Math.max(0, scrollState.left - startLeft) + scrollState.viewportWidth) / scaleWidth) * scale;
    return markers.filter((m) => m.time >= leftTime - 1 && m.time <= rightTime + 1);
  }, [markersEnabled, markers, scrollState.left, scrollState.viewportWidth, startLeft, scaleWidth, scale]);

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

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setScrollState((s) => ({ ...s, viewportWidth: el.clientWidth }));
    update();
    const ro = new ResizeObserver(() => update());
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    return () => {
      if (scrollRafRef.current) window.cancelAnimationFrame(scrollRafRef.current);
    };
  }, []);

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

  const alignTimeline = () => {
    beginHistoryGroup();
    const getBeatKey = (actionId: string) => {
      const item = editorModel.timelineItems[actionId];
      if (!item || !item.linkedBeatId) return null;
      const beat = editorModel.beats[item.linkedBeatId];
      if (!beat) return null;
      const scene = editorModel.scenes[beat.sceneId];
      return { sceneOrder: scene?.order ?? 0, beatOrder: beat.order };
    };
    const nextRows = editorData.map((row) => {
      const sorted = [...row.actions].sort((a, b) => {
        const ka = getBeatKey(a.id);
        const kb = getBeatKey(b.id);
        if (ka && kb) {
          if (ka.sceneOrder !== kb.sceneOrder) return ka.sceneOrder - kb.sceneOrder;
          if (ka.beatOrder !== kb.beatOrder) return ka.beatOrder - kb.beatOrder;
        } else if (ka && !kb) return -1;
        else if (!ka && kb) return 1;
        return a.start - b.start;
      });
      let t = 0;
      const nextById = new Map<string, { start: number; end: number }>();
      for (const a of sorted) {
        const item = editorModel.timelineItems[a.id];
        const beat = item?.linkedBeatId ? editorModel.beats[item.linkedBeatId] : null;
        const duration = beat?.suggestedDuration ?? Math.max(0, a.end - a.start);
        nextById.set(a.id, { start: t, end: t + duration });
        t += duration;
      }
      return {
        ...row,
        actions: row.actions.map((a) => {
          const next = nextById.get(a.id);
          if (!next) return a;
          return { ...a, start: next.start, end: next.end };
        }),
      };
    });
    setEditorData(nextRows as any);
    syncTimelineFromRows(nextRows as any);
    setDirty(true);
    endHistoryGroup();
  };

  if (!mounted) return <div className="w-full h-full bg-gray-100 dark:bg-zinc-900 animate-pulse flex items-center justify-center text-gray-500">Loading Timeline...</div>;

  return (
    <div
      ref={containerRef}
      className="w-full h-full bg-zinc-900 text-white overflow-hidden border-t border-zinc-700 relative"
      onWheel={(e) => {
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          const next = Math.max(40, Math.min(280, scaleWidth + (e.deltaY > 0 ? -10 : 10)));
          setScaleWidth(next);
          return;
        }
        if (e.shiftKey && timelineRef.current) {
          e.preventDefault();
          timelineRef.current.setScrollLeft(Math.max(0, scrollState.left + e.deltaY));
        }
      }}
    >
      <div className="p-2 border-b border-zinc-700 bg-zinc-800 flex justify-between items-center gap-2">
         <div className="flex items-center gap-2 flex-wrap">
            <button 
              onClick={handlePlayOrPause}
              className="p-1 rounded hover:bg-zinc-700 text-white"
              title={isPlaying ? t("timeline.pause") : t("timeline.play")}
            >
               {isPlaying ? <Pause size={16} /> : <Play size={16} />}
            </button>
            <button
              onClick={() => undo()}
              disabled={!canUndo()}
              className="p-1 rounded hover:bg-zinc-700 text-white disabled:opacity-40"
              title={t("timeline.undo")}
            >
              <Undo2 size={16} />
            </button>
            <button
              onClick={() => redo()}
              disabled={!canRedo()}
              className="p-1 rounded hover:bg-zinc-700 text-white disabled:opacity-40"
              title={t("timeline.redo")}
            >
              <Redo2 size={16} />
            </button>
            <span className="text-sm font-semibold">{t("timeline.title")}</span>
            <button
              onClick={() => setSnapEnabled((v) => !v)}
              className={`p-1 rounded hover:bg-zinc-700 text-white ${snapEnabled ? "bg-zinc-700" : ""}`}
              aria-label={t("timeline.snap")}
              title={t("timeline.snap")}
              type="button"
            >
              <Magnet size={16} />
            </button>
            <button
              onClick={() => setMarkersEnabled((v) => !v)}
              className={`p-1 rounded hover:bg-zinc-700 text-white ${markersEnabled ? "bg-zinc-700" : ""}`}
              aria-label={t("timeline.markers")}
              title={t("timeline.markers")}
              type="button"
            >
              <ChevronDown size={16} />
            </button>
            <button
              onClick={() => setTracksOpen((v) => !v)}
              className={`p-1 rounded hover:bg-zinc-700 text-white ${tracksOpen ? "bg-zinc-700" : ""}`}
              aria-label={t("timeline.tracks")}
              title={t("timeline.tracks")}
              type="button"
            >
              <Layers size={16} />
            </button>
            <button
              onClick={alignTimeline}
              className="p-1 rounded hover:bg-zinc-700 text-white"
              aria-label={t("timeline.align")}
              title={t("timeline.align")}
              type="button"
            >
              <AlignLeft size={16} />
            </button>
            <button
              onClick={() => updateLayout({ followSelection: !layout.followSelection })}
              className={`p-1 rounded hover:bg-zinc-700 text-white ${layout.followSelection ? "bg-zinc-700" : ""}`}
              aria-label={t("timeline.follow")}
              title={t("timeline.follow")}
              type="button"
            >
              {layout.followSelection ? <Lock size={16} /> : <Unlock size={16} />}
            </button>
            <button
              onClick={() => {
                beginHistoryGroup();
                const nextRows = [...editorData, { id: String(Date.now()), actions: [] }];
                setEditorData(nextRows as any);
                endHistoryGroup();
                setDirty(true);
              }}
              className="p-1 rounded hover:bg-zinc-700 text-white"
              aria-label={t("timeline.addTrack")}
              title={t("timeline.addTrack")}
              type="button"
            >
              <Plus size={16} />
            </button>
         </div>
         <div className="flex items-center gap-2 mr-14">
            <span className="text-xs text-gray-400 hidden md:inline">{t("timeline.help")}</span>
            <button 
              onClick={() => {
                if(projectId) saveProject(projectId, { silent: false }).finally(() => setDirty(false));
              }} 
              className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-600 rounded hover:bg-blue-700 transition-colors"
            >
              <Save size={12} /> {t("timeline.save")}
            </button>
         </div>
      </div>

      <div
        ref={miniMapRef}
        className="h-7 border-b border-zinc-700 bg-zinc-900 relative"
        onMouseDown={(e) => {
          if (!timelineRef.current || !miniMapRef.current) return;
          const rect = miniMapRef.current.getBoundingClientRect();
          const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
          const target = Math.max(0, (x / rect.width) * contentWidth - scrollState.viewportWidth / 2);
          timelineRef.current.setScrollLeft(target);
          miniMapDragRef.current = { dragging: true, startX: e.clientX, startScrollLeft: target };
        }}
        onMouseMove={(e) => {
          if (!timelineRef.current || !miniMapRef.current) return;
          if (!miniMapDragRef.current.dragging) return;
          const rect = miniMapRef.current.getBoundingClientRect();
          const dx = e.clientX - miniMapDragRef.current.startX;
          const next = miniMapDragRef.current.startScrollLeft + (dx / rect.width) * contentWidth;
          timelineRef.current.setScrollLeft(Math.max(0, next));
        }}
        onMouseUp={() => {
          miniMapDragRef.current.dragging = false;
        }}
        onMouseLeave={() => {
          miniMapDragRef.current.dragging = false;
        }}
      >
        <div className="absolute inset-0 opacity-60 bg-gradient-to-r from-zinc-800 to-zinc-900" />
        <div
          className="absolute top-1 bottom-1 rounded bg-blue-500/40 border border-blue-400/40"
          style={{
            left: `${Math.min(100, (scrollState.left / contentWidth) * 100)}%`,
            width: `${Math.max(3, Math.min(100, (scrollState.viewportWidth / contentWidth) * 100))}%`,
          }}
        />
      </div>

      {tracksOpen ? (
        <div className="absolute top-[68px] left-2 z-30 w-64 rounded-lg border border-zinc-700 bg-zinc-900 shadow-lg p-2">
          <div className="text-xs text-zinc-300 px-1 py-1">Tracks</div>
          <div className="mt-1 max-h-56 overflow-auto">
            {editorData.map((row) => {
              const collapsed = collapsedRowSet.has(row.id);
              return (
                <button
                  key={row.id}
                  type="button"
                  className="w-full flex items-center justify-between gap-2 px-2 py-1 rounded hover:bg-zinc-800 text-sm"
                  onClick={() => {
                    setCollapsedRowIds((prev) => {
                      const set = new Set(prev);
                      if (set.has(row.id)) set.delete(row.id);
                      else set.add(row.id);
                      return Array.from(set);
                    });
                  }}
                >
                  <span className="truncate">Track {row.id}</span>
                  <span className={`text-xs ${collapsed ? "text-zinc-400" : "text-zinc-200"}`}>
                    {collapsed ? "Collapsed" : "Visible"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <Timeline
        ref={timelineRef}
        editorData={displayEditorData}
        effects={timelineEffects as any}
        scale={scale}
        scaleWidth={scaleWidth}
        startLeft={startLeft}
        gridSnap={snapEnabled}
        dragLine={snapEnabled}
        enableRowDrag={true}
        getAssistDragLineActionIds={({ action, editorData }) => {
          const ids: string[] = [];
          for (const row of editorData) {
            for (const a of row.actions) {
              if (a.id === action.id) continue;
              ids.push(a.id);
            }
          }
          return ids;
        }}
        onChange={(data) => {
          const nextRows = (data as any[]).filter((r) => r.id !== "__markers__");
          const merged = nextRows.map((row) => {
            const original = editorData.find((r) => r.id === row.id);
            if (!original) return row;
            const base = { ...row, rowHeight: original.rowHeight, classNames: original.classNames };
            if (!collapsedRowSet.has(row.id)) return base;
            return { ...base, actions: original.actions };
          });
          setEditorData(merged as any);
          syncTimelineFromRows(merged as any);
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
          if (action.id.startsWith("__marker_action__")) return;
          const isMulti = e.shiftKey || e.metaKey || e.ctrlKey;
          if (isMulti) {
            setMultiSelectedActionIds((prev) => {
              const set = new Set(prev);
              if (set.has(action.id)) set.delete(action.id);
              else set.add(action.id);
              return Array.from(set);
            });
            selectTimelineItem(action.id, 'timeline');
            return;
          }
          setMultiSelectedActionIds([]);
          selectTimelineItem(action.id, 'timeline');
        }}
        onScroll={(p) => {
          pendingScrollRef.current = { scrollLeft: p.scrollLeft, scrollTop: p.scrollTop };
          if (scrollRafRef.current) return;
          scrollRafRef.current = window.requestAnimationFrame(() => {
            scrollRafRef.current = null;
            const pending = pendingScrollRef.current;
            if (!pending) return;
            setScrollState((s) => ({ ...s, left: pending.scrollLeft, top: pending.scrollTop }));
          });
        }}
        style={{ height: 'calc(100% - 68px)', width: '100%' }}
      />

      {markersEnabled && markers.length > 0 ? (
        <>
          <div className="pointer-events-none absolute top-[68px] left-0 right-0 bottom-0 z-10">
            {visibleMarkers.map((m) => {
              const left = startLeft + (m.time / scale) * scaleWidth - scrollState.left;
              if (left < 0 || left > scrollState.viewportWidth) return null;
              return (
                <div
                  key={m.id}
                  className="absolute top-0 bottom-0 w-px bg-yellow-400/50"
                  style={{ left }}
                  title={m.title}
                />
              );
            })}
          </div>
          <div className="absolute bottom-2 left-2 right-2 z-20 flex gap-2 overflow-x-auto">
            {markers.slice(0, 20).map((m) => (
              <button
                key={m.id}
                type="button"
                className="px-2 py-1 rounded-md bg-black/50 text-xs text-white whitespace-nowrap hover:bg-black/70 flex items-center gap-1"
                onClick={() => {
                  selectTimelineItem(m.id, "timeline");
                  if (timelineRef.current) {
                    timelineRef.current.setTime(m.time);
                    const scrollLeft = Math.max(0, (m.time / scale) * scaleWidth - 200);
                    timelineRef.current.setScrollLeft(scrollLeft);
                  }
                }}
              >
                <ChevronRight size={12} />
                {m.title}
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
