import { create } from 'zustand';
import type { TimelineRow, TimelineEffect } from '@xzdarcy/timeline-engine';
import { projectApi, type TimelineWorkspace } from '@/lib/api';
import { toast } from '@/components/ui/toast';

export interface TimelineState {
  editorData: TimelineRow[];
  effects: Record<string, TimelineEffect>;
  projectId: number | null;
  currentTime: number;
  addClip: (commitId: string, message: string, duration?: number) => void;
  setEditorData: (data: TimelineRow[]) => void;
  setProjectId: (id: number) => void;
  setCurrentTime: (time: number) => void;
  saveToBackend: () => Promise<void>;
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
    // For simplicity, add to the first row (id="0")
    // Find next available start time
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
  // Trigger save after adding clip
  get().saveToBackend();
  },

  setEditorData: (data) => {
      set({ editorData: data });
      // Debounce save or save immediately? Let's save immediately for now or let component handle it
      // For drag operations, it might trigger many updates.
      // We will rely on component to call save or just save here.
      // Let's not save here to avoid loop if loadFromBackend calls setEditorData
  },

  setProjectId: (id) => set({ projectId: id }),

  setCurrentTime: (time) => set({ currentTime: time }),

  saveToBackend: async () => {
    const { projectId, editorData, effects } = get();
    if (!projectId) return;
    try {
        const workspace: TimelineWorkspace = { editorData, effects };
        await projectApi.updateWorkspace(projectId, workspace);
        toast({ title: "Saved", description: "Timeline saved.", variant: "success" });
    } catch (e) {
        const message = e instanceof Error ? e.message : "Failed to save timeline";
        toast({ title: "Save failed", description: message, variant: "destructive" });
    }
  },

  loadFromBackend: async () => {
    const { projectId } = get();
    if (!projectId) return;
    try {
         const data = await projectApi.getWorkspace(projectId);
         if (data && data.editorData) {
             set({ editorData: data.editorData, effects: data.effects || {} });
         }
    } catch (e) {
        const message = e instanceof Error ? e.message : "Failed to load timeline";
        toast({ title: "Load failed", description: message, variant: "destructive" });
    }
  }
}));
