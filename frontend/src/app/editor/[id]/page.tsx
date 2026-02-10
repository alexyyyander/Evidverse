"use client";

import { useState } from "react";
import { Play, Pause, Plus, Image as ImageIcon, Film, FileText, Settings } from "lucide-react";
import api from "@/lib/api";

export default function EditorPage({ params }: { params: { id: string } }) {
  const [activeTab, setActiveTab] = useState("script");
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [clips, setClips] = useState<any[]>([]);
  const [currentClip, setCurrentClip] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt) return;
    setIsGenerating(true);
    try {
      // 1. Trigger generation
      const res = await api.post("/generate/clip", { topic: prompt });
      const taskId = res.data.task_id;
      
      // 2. Poll for status (Simplified for MVP, ideally use WebSocket or SWR)
      // For now, we just simulate a wait or user has to refresh/check status
      // In real app: Implementation of polling logic here
      console.log("Task started:", taskId);
      
      // Mock result for demo immediately
      setTimeout(() => {
        const newClips = [
          { id: 1, type: "video", url: "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4", thumbnail: "/placeholder.png" },
          { id: 2, type: "video", url: "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4", thumbnail: "/placeholder.png" }
        ];
        setClips([...clips, ...newClips]);
        setIsGenerating(false);
      }, 3000);

    } catch (error) {
      console.error("Generation failed", error);
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
        >
          <FileText size={20} />
        </button>
        <button
          onClick={() => setActiveTab("assets")}
          className={`p-3 mb-2 rounded-xl transition-colors ${activeTab === "assets" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white hover:bg-gray-800"}`}
        >
          <ImageIcon size={20} />
        </button>
        <div className="mt-auto">
          <button className="p-3 text-gray-400 hover:text-white">
            <Settings size={20} />
          </button>
        </div>
      </div>

      {/* Panel (Script/Assets) */}
      <div className="w-80 bg-gray-900 border-r border-gray-800 flex flex-col">
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
                  {/* Thumbnail would go here */}
                  <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs">
                    Clip {idx + 1}
                  </div>
                </div>
              ))}
              {clips.length === 0 && (
                <div className="col-span-2 text-center text-gray-500 text-sm py-10">
                  No assets generated yet.
                </div>
              )}
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
        <div className="h-64 bg-gray-900 border-t border-gray-800 flex flex-col">
          <div className="h-10 border-b border-gray-800 flex items-center px-4 justify-between">
            <div className="flex items-center gap-4">
              <button className="text-gray-400 hover:text-white"><Play size={16} /></button>
              <span className="text-xs text-gray-500">00:00 / 00:00</span>
            </div>
            <div className="flex items-center gap-2">
               <span className="text-xs text-gray-500">Scale</span>
               {/* Zoom slider */}
            </div>
          </div>
          
          <div className="flex-1 p-4 overflow-x-auto whitespace-nowrap relative">
            {/* Tracks */}
            <div className="flex gap-1 h-24">
               {clips.map((clip, idx) => (
                 <div 
                   key={idx}
                   className="h-full min-w-[120px] bg-blue-900/30 border border-blue-800 rounded-md relative group cursor-pointer"
                   onClick={() => setCurrentClip(clip.url)}
                 >
                    <div className="absolute inset-0 flex items-center justify-center text-xs text-blue-200">
                      Clip {idx + 1}
                    </div>
                 </div>
               ))}
               
               <div className="h-full min-w-[120px] border-2 border-dashed border-gray-700 rounded-md flex items-center justify-center text-gray-600 hover:border-gray-500 hover:text-gray-400 cursor-pointer transition-colors">
                 <Plus size={24} />
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
