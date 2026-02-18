import { create } from 'zustand';
import type { TimelineRow, TimelineEffect } from '@xzdarcy/timeline-engine';
import { projectApi, type TimelineWorkspace } from '@/lib/api';
import { toast } from '@/components/ui/toast';
import { t as translate } from "@/lib/i18n";

function getRuntimeLang() {
  if (typeof window === "undefined") return "zh" as const;
  try {
    const raw = window.localStorage.getItem("lang");
    if (raw === "en" || raw === "zh" || raw === "ja") return raw;
  } catch {}
  return "zh" as const;
}

function i18nText(key: string) {
  return translate(getRuntimeLang(), key);
}

export interface TimelineState {
  editorData: TimelineRow[];
  effects: Record<string, TimelineEffect>;
  projectId: string | null;
  currentTime: number;
  addClip: (commitId: string, message: string, duration?: number) => void;
  setEditorData: (data: TimelineRow[]) => void;
  setProjectId: (id: string) => void;
  setCurrentTime: (time: number) => void;
  saveToBackend: (options?: { silent?: boolean }) => Promise<void>;
  loadFromBackend: () => Promise<void>;
}

export const useTimelineStore = create<TimelineState>((set, get) => ({
  editorData: [
    {
      id: "0",
      actions: [],
    },
  ],
  effects: {},
  projectId: null,
  currentTime: 0,
  
  addClip: (commitId, message, duration = 5) => {
    set((state) => {
    const row = state.editorData.find(r => r.id === "0") || { id: "0", actions: [] };
    const lastAction = row.actions[row.actions.length - 1];
    const startTime = lastAction ? lastAction.end : 0;
    
    const newAction = {
      id: `action-${Date.now()}`,
      start: startTime,
      end: startTime + duration,
      effectId: commitId,
    };
    
    const newEffect = {
      id: commitId,
      name: message || `Commit ${commitId.slice(0, 7)}`,
    };

    const newRows = state.editorData.map(r => {
      if (r.id === "0") {
        return { ...r, actions: [...r.actions, newAction] };
      }
      return r;
    });

    return {
      editorData: newRows,
      effects: { ...state.effects, [commitId]: newEffect }
    };
  });
  get().saveToBackend({ silent: true });
  },

  setEditorData: (data) => {
      set({ editorData: data });
  },

  setProjectId: (id) => set({ projectId: id }),

  setCurrentTime: (time) => set({ currentTime: time }),

  saveToBackend: async (options) => {
    const { projectId, editorData, effects } = get();
    if (typeof projectId !== "string" || projectId.length === 0) return;
    try {
        const existing = await projectApi.getWorkspace(projectId);
        const workspace: TimelineWorkspace = { ...(existing || {}), editorData, effects };
        await projectApi.updateWorkspace(projectId, workspace);
        if (!options?.silent) {
          toast({
            title: i18nText("timeline.toast.saved.title"),
            description: i18nText("timeline.toast.saved.desc"),
            variant: "success"
          });
        }
    } catch (e) {
        const message = e instanceof Error ? e.message : i18nText("timeline.toast.saveFailed.title");
        toast({ title: i18nText("timeline.toast.saveFailed.title"), description: message, variant: "destructive" });
    }
  },

  loadFromBackend: async () => {
    const { projectId } = get();
    if (typeof projectId !== "string" || projectId.length === 0) return;
    try {
         const data = await projectApi.getWorkspace(projectId);
         if (data && data.editorData) {
             set({ editorData: data.editorData, effects: data.effects || {} });
         }
    } catch (e) {
        const message = e instanceof Error ? e.message : i18nText("timeline.toast.loadFailed.title");
        toast({ title: i18nText("timeline.toast.loadFailed.title"), description: message, variant: "destructive" });
    }
  }
}));
