import { create } from "zustand";
import { persist } from "zustand/middleware";

export type LocalLLMProvider = "ollama" | "vllm" | "sglang" | "openai_compatible";

export type Pace = "slow" | "normal" | "fast";

export type AspectRatio = "16:9" | "9:16" | "1:1" | "4:3";

export type Resolution = "720p" | "1080p" | "1440p" | "4k";

export interface SettingsState {
  apiBaseUrl: string;
  cloudApiBaseUrl: string;

  localLlmProvider: LocalLLMProvider;
  llmOpenaiBaseUrl: string;
  llmOpenaiModel: string;
  ollamaHost: string;
  ollamaModel: string;

  defaultStyle: string;
  defaultAspectRatio: AspectRatio;
  defaultResolution: Resolution;
  defaultShotCount: number;
  defaultPace: Pace;
  defaultSegmentDuration: number;
  defaultSegmentDurationUnit: "sec" | "min";

  setApiBaseUrl: (value: string) => void;
  setCloudApiBaseUrl: (value: string) => void;
  setLocalLlmProvider: (value: LocalLLMProvider) => void;
  setLlmOpenaiBaseUrl: (value: string) => void;
  setLlmOpenaiModel: (value: string) => void;
  setOllamaHost: (value: string) => void;
  setOllamaModel: (value: string) => void;
  setDefaultStyle: (value: string) => void;
  setDefaultAspectRatio: (value: AspectRatio) => void;
  setDefaultResolution: (value: Resolution) => void;
  setDefaultShotCount: (value: number) => void;
  setDefaultPace: (value: Pace) => void;
  setDefaultSegmentDuration: (value: number) => void;
  setDefaultSegmentDurationUnit: (value: "sec" | "min") => void;

  reset: () => void;
}

function safeSetLocalStorage(key: string, value: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, value);
  } catch {}
}

function safeRemoveLocalStorage(key: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(key);
  } catch {}
}

function normalizeStoredUrl(value: string) {
  return String(value || "").trim();
}

const DEFAULTS: Omit<
  SettingsState,
  | "setApiBaseUrl"
  | "setCloudApiBaseUrl"
  | "setLocalLlmProvider"
  | "setLlmOpenaiBaseUrl"
  | "setLlmOpenaiModel"
  | "setOllamaHost"
  | "setOllamaModel"
  | "setDefaultStyle"
  | "setDefaultAspectRatio"
  | "setDefaultResolution"
  | "setDefaultShotCount"
  | "setDefaultPace"
  | "setDefaultSegmentDuration"
  | "setDefaultSegmentDurationUnit"
  | "reset"
> = {
  apiBaseUrl: "",
  cloudApiBaseUrl: "",

  localLlmProvider: "vllm",
  llmOpenaiBaseUrl: "http://localhost:8001",
  llmOpenaiModel: "Qwen/Qwen3-8B",
  ollamaHost: "http://localhost:11434",
  ollamaModel: "qwen3:8b",

  defaultStyle: "default",
  defaultAspectRatio: "16:9",
  defaultResolution: "1080p",
  defaultShotCount: 6,
  defaultPace: "normal",
  defaultSegmentDuration: 5,
  defaultSegmentDurationUnit: "sec",
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULTS,

      setApiBaseUrl: (value) => {
        const v = normalizeStoredUrl(value);
        set({ apiBaseUrl: v });
        if (v) safeSetLocalStorage("evidverse_api_base_url", v);
        else safeRemoveLocalStorage("evidverse_api_base_url");
      },
      setCloudApiBaseUrl: (value) => {
        const v = normalizeStoredUrl(value);
        set({ cloudApiBaseUrl: v });
        if (v) safeSetLocalStorage("evidverse_cloud_api_base_url", v);
        else safeRemoveLocalStorage("evidverse_cloud_api_base_url");
      },

      setLocalLlmProvider: (value) => set({ localLlmProvider: value }),
      setLlmOpenaiBaseUrl: (value) => set({ llmOpenaiBaseUrl: normalizeStoredUrl(value) }),
      setLlmOpenaiModel: (value) => set({ llmOpenaiModel: normalizeStoredUrl(value) }),
      setOllamaHost: (value) => set({ ollamaHost: normalizeStoredUrl(value) }),
      setOllamaModel: (value) => set({ ollamaModel: normalizeStoredUrl(value) }),

      setDefaultStyle: (value) => set({ defaultStyle: normalizeStoredUrl(value) || "default" }),
      setDefaultAspectRatio: (value) => set({ defaultAspectRatio: value }),
      setDefaultResolution: (value) => set({ defaultResolution: value }),
      setDefaultShotCount: (value) => set({ defaultShotCount: Math.max(1, Math.floor(value || 1)) }),
      setDefaultPace: (value) => set({ defaultPace: value }),
      setDefaultSegmentDuration: (value) => set({ defaultSegmentDuration: Math.max(1, Math.floor(value || 1)) }),
      setDefaultSegmentDurationUnit: (value) => set({ defaultSegmentDurationUnit: value }),

      reset: () => {
        set({ ...DEFAULTS });
        safeRemoveLocalStorage("evidverse_api_base_url");
        safeRemoveLocalStorage("evidverse_cloud_api_base_url");
      },
    }),
    {
      name: "evidverse_settings",
      version: 1,
      partialize: (state) => ({
        apiBaseUrl: state.apiBaseUrl,
        cloudApiBaseUrl: state.cloudApiBaseUrl,
        localLlmProvider: state.localLlmProvider,
        llmOpenaiBaseUrl: state.llmOpenaiBaseUrl,
        llmOpenaiModel: state.llmOpenaiModel,
        ollamaHost: state.ollamaHost,
        ollamaModel: state.ollamaModel,
        defaultStyle: state.defaultStyle,
        defaultAspectRatio: state.defaultAspectRatio,
        defaultResolution: state.defaultResolution,
        defaultShotCount: state.defaultShotCount,
        defaultPace: state.defaultPace,
        defaultSegmentDuration: state.defaultSegmentDuration,
        defaultSegmentDurationUnit: state.defaultSegmentDurationUnit,
      }),
    },
  ),
);

