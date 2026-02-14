"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18nContext";
import { Sparkles, GitGraph, Globe, Play, Zap, ArrowRight } from "lucide-react";

export default function Home() {
  const { t, lang } = useI18n();
  const [displayText, setDisplayText] = useState("异维 - Evidverse");
  const [opacity, setOpacity] = useState(1);
  const cnChars = "异维宇宙幻影未来科技数据核心";
  const jaChars = "異次元共創編集無限宇宙未来技術";
  const enChars = "Evidverse0123456789!@#$%^&*";

  useEffect(() => {
    // Define targets based on current language
    let currentTargets: string[];
    if (lang === "zh") {
      currentTargets = ["异维 - Evidverse", "合作 . 编辑", "无限 . 宇宙"];
    } else if (lang === "ja") {
      currentTargets = ["異次元 - Evidverse", "共創 . 編集", "無限 . 宇宙"];
    } else {
      currentTargets = ["Evidverse . Studio", "Collaborate . Edit", "Infinite . Universe"];
    }

    let currentIndex = 0;
    // Set initial text to match the language immediately to avoid flash of wrong language
    setDisplayText(currentTargets[0]);

    const interval = setInterval(() => {
      currentIndex = (currentIndex + 1) % currentTargets.length;
      const target = currentTargets[currentIndex];
      let iteration = 0;
      
      const scrambleInterval = setInterval(() => {
        setDisplayText(prev => 
          target.split("")
            .map((letter, index) => {
              if (index < iteration) {
                return target[index];
              }
              
              // Language specific random characters
              if (lang === "zh") {
                 const isChinese = /[\u4e00-\u9fa5]/.test(target[index]);
                 if (isChinese) return cnChars[Math.floor(Math.random() * cnChars.length)];
              } else if (lang === "ja") {
                 const isJapanese = /[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9fa5]/.test(target[index]);
                 if (isJapanese) return jaChars[Math.floor(Math.random() * jaChars.length)];
              }
              
              // Default to English chars for non-CJK or English mode
              if (target[index] === " ") return " ";
              return enChars[Math.floor(Math.random() * enChars.length)];
            })
            .join("")
        );

        // Calculate opacity based on iteration progress
        // Start transparent (0) and fade in to opaque (1)
        const progress = iteration / target.length;
        setOpacity(Math.min(1, Math.max(0.2, progress))); // Keep min opacity 0.2 to see glitches
        
        if (iteration >= target.length) {
          clearInterval(scrambleInterval);
          setOpacity(1); // Ensure fully visible at end
        }
        
        iteration += 1 / 5; 
      }, 50); 
      
    }, 6000); 

    return () => clearInterval(interval);
  }, [lang]);

  return (
    <div className="relative overflow-hidden min-h-[calc(100vh-64px)] bg-[#05050A]">
      {/* 迷幻背景层 */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <div className="absolute top-[-20%] left-[20%] w-[600px] h-[600px] bg-purple-600 rounded-full mix-blend-screen filter blur-[128px] opacity-40 animate-blob" />
        <div className="absolute top-[20%] right-[10%] w-[500px] h-[500px] bg-blue-600 rounded-full mix-blend-screen filter blur-[128px] opacity-40 animate-blob animation-delay-2000" />
        <div className="absolute bottom-[-10%] left-[30%] w-[600px] h-[600px] bg-indigo-600 rounded-full mix-blend-screen filter blur-[128px] opacity-40 animate-blob animation-delay-4000" />
        {/* 网格纹理 */}
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />
      </div>

      <main className="relative z-10 flex flex-col items-center justify-center pt-24 pb-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* 徽章 */}
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-sm text-indigo-300 mb-8 backdrop-blur-md shadow-glow animate-float">
            <Sparkles size={14} className="text-indigo-400" />
            <span className="font-medium tracking-wide">{t("home.badge")}</span>
          </div>

          {/* 主标题 */}
          <h1 
            className="h-[1.2em] text-6xl sm:text-8xl md:text-9xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white via-slate-200 to-slate-500 mb-6 drop-shadow-2xl select-none transition-all duration-300 ease-out font-mono"
            style={{ opacity: opacity }}
          >
            {displayText}
          </h1>
          
          {/* 副标题/标语 */}
          <div className="text-2xl sm:text-4xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent mb-8 animate-shimmer bg-[length:200%_auto]">
            {t("home.tagline")}
          </div>

          <p className="max-w-2xl mx-auto text-lg sm:text-xl text-slate-400 mb-12 leading-relaxed font-light">
            {t("home.subtitle")}
          </p>

          {/* 按钮组 */}
          <div className="flex flex-col sm:flex-row gap-5 justify-center items-center">
            <Link
              href="/editor/new"
              className="group relative inline-flex h-14 items-center justify-center overflow-hidden rounded-full bg-white px-8 font-bold text-slate-900 transition-all duration-300 hover:scale-105 hover:shadow-[0_0_40px_-10px_rgba(255,255,255,0.5)] focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 focus:ring-offset-slate-900"
            >
              <span className="mr-2">{t("home.cta.create")}</span>
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/discover"
              className="group inline-flex h-14 items-center justify-center rounded-full border border-slate-700 bg-slate-900/50 px-8 font-medium text-slate-200 transition-all hover:bg-slate-800 hover:border-slate-500 backdrop-blur-sm"
            >
              <Globe className="mr-2 h-5 w-5 text-slate-400 group-hover:text-white transition-colors" />
              {t("home.cta.discover")}
            </Link>
          </div>

          {/* 特性卡片 */}
          <div className="mt-32 grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
            {[
              { 
                title: t("home.feature1.title"), 
                desc: t("home.feature1.desc"), 
                icon: <Play className="w-8 h-8 text-indigo-400" />,
                gradient: "from-indigo-500/20 to-purple-500/20"
              },
              { 
                title: t("home.feature2.title"), 
                desc: t("home.feature2.desc"), 
                icon: <GitGraph className="w-8 h-8 text-cyan-400" />,
                gradient: "from-cyan-500/20 to-blue-500/20"
              },
              { 
                title: t("home.feature3.title"), 
                desc: t("home.feature3.desc"), 
                icon: <Zap className="w-8 h-8 text-purple-400" />,
                gradient: "from-purple-500/20 to-pink-500/20"
              },
            ].map((feature, i) => (
              <div key={i} className={`group relative rounded-3xl border border-white/5 bg-gradient-to-br ${feature.gradient} p-8 backdrop-blur-xl transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:shadow-indigo-500/20 hover:border-white/10`}>
                <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950/50 border border-white/10 shadow-inner group-hover:scale-110 transition-transform duration-300">
                  {feature.icon}
                </div>
                <div className="text-xl font-bold text-white mb-3 group-hover:text-indigo-200 transition-colors">{feature.title}</div>
                <div className="text-sm text-slate-300 leading-relaxed font-light opacity-80 group-hover:opacity-100">
                  {feature.desc}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
