"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Play, Plus, Image as ImageIcon, Film, FileText, Settings, GitBranch } from "lucide-react";
import { generationApi } from "@/lib/api";
import GitGraph from "@/components/GitGraph";
import { useTimelineStore } from "@/store/timelineStore";
import { toast } from "@/components/ui/toast";

const TimelineEditor = dynamic(() => import("@/components/TimelineEditor"), { ssr: false });

export default function EditorPage({ params }: { params: { id: string } }) {
  const [activeTab, setActiveTab] = useState("script");
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [clips, setClips] = useState<any[]>([]);
  const [currentClip, setCurrentClip] = useState<string | null>(null);
  
  const { setProjectId, loadFromBackend } = useTimelineStore();
  const projectId = Number(params.id);

  useEffect(() => {
    if (!Number.isFinite(projectId)) return;
    setProjectId(projectId);
    loadFromBackend();
  }, [projectId, setProjectId, loadFromBackend]);

  if (!Number.isFinite(projectId)) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4">
        <div className="max-w-md w-full rounded-xl border border-slate-800 bg-slate-900 p-6 text-center">
          <h1 className="text-xl font-semibold text-white">Invalid Project</h1>
          <p className="mt-2 text-sm text-slate-400">The project id in the URL is not valid.</p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <a
              href="/editor/new"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
            >
              Create Project
            </a>
            <a
              href="/projects"
              className="rounded-lg border border-slate-800 bg-slate-950 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-900"
            >
              Back to Projects
            </a>
          </div>
        </div>
      </div>
    );
  }

  const handleGenerate = async () => {
    if (!prompt) return;
    setIsGenerating(true);
    try {
      const { task_id } = await generationApi.generateClip({ topic: prompt });
      toast({ title: "Task started", description: `Task: ${task_id}`, variant: "success" });
      
      // Mock result
      setTimeout(() => {
        const newClips = [
          { id: Date.now(), type: "video", url: "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4", thumbnail: "/placeholder.png" }
        ];
        setClips([...clips, ...newClips]);
        setIsGenerating(false);
      }, 3000);

    } catch (error) {
      const message = error instanceof Error ? error.message : "Generation failed";
      toast({ title: "Generation failed", description: message, variant: "destructive" });
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-900 text-white overflow-hidden">
      {/* Sidebar */}
      <div className="w-16 flex flex-col items-center py-4 bg-gray-950 border-r border-gray-800">
        <div className="mb-8 font-bold text-xl text-blue-500">V</div>
        <button
          onClick={() => setActiveTab("script")}
          className={`p-3 mb-2 rounded-xl transition-colors ${activeTab === "script" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white hover:bg-gray-800"}`}
          title="Script"
        >
          <FileText size={20} />
        </button>
        <button
          onClick={() => setActiveTab("assets")}
          className={`p-3 mb-2 rounded-xl transition-colors ${activeTab === "assets" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white hover:bg-gray-800"}`}
          title="Assets"
        >
          <ImageIcon size={20} />
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`p-3 mb-2 rounded-xl transition-colors ${activeTab === "history" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white hover:bg-gray-800"}`}
          title="History / Git Graph"
        >
          <GitBranch size={20} />
        </button>
        <div className="mt-auto">
          <button className="p-3 text-gray-400 hover:text-white">
            <Settings size={20} />
          </button>
        </div>
      </div>

      {/* Panel (Script/Assets/History) */}
      <div className={`${activeTab === "history" ? "w-[600px]" : "w-80"} bg-gray-900 border-r border-gray-800 flex flex-col transition-all duration-300`}>
        <div className="p-4 border-b border-gray-800">
          <h2 className="font-semibold text-lg capitalize">{activeTab}</h2>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === "script" && (
            <div className="flex flex-col h-full">
              <label className="text-sm text-gray-400 mb-2">Topic / Prompt</label>
              <textarea
                className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-sm focus:outline-none focus:border-blue-500 min-h-[150px] mb-4"
                placeholder="Describe your video story..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                {isGenerating ? "Generating..." : (
                  <>
                    <Film size={18} />
                    Generate Video
                  </>
                )}
              </button>
            </div>
          )}

          {activeTab === "assets" && (
            <div className="grid grid-cols-2 gap-3">
              {clips.map((clip, idx) => (
                <div 
                  key={idx} 
                  className="aspect-video bg-gray-800 rounded-lg overflow-hidden cursor-pointer hover:ring-2 ring-blue-500"
                  onClick={() => setCurrentClip(clip.url)}
                >
                  <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs">
                    Clip {idx + 1}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === "history" && (
             <div className="h-full">
                <GitGraph projectId={projectId} />
             </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Preview Area */}
        <div className="flex-1 bg-black flex items-center justify-center relative">
          {currentClip ? (
            <video 
              src={currentClip} 
              controls 
              className="max-h-full max-w-full"
              autoPlay
            />
          ) : (
            <div className="text-gray-600">Select a clip to preview</div>
          )}
        </div>

        {/* Timeline Area */}
        <div className="h-[340px] bg-zinc-900 border-t border-gray-800 flex flex-col relative z-0">
           <TimelineEditor />
        </div>
      </div>
    </div>
  );
}
