"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18nContext";
import { Sparkles, GitGraph, Globe, Play, Zap, ArrowRight, Layers, Workflow, Film } from "lucide-react";
import { GlassGrid } from "@/components/ui/glass-grid";
import FractalTree from "@/components/ui/fractal-tree";

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
              
              // Reduce flicker frequency: only change 30% of the time
              if (Math.random() > 0.3) {
                // Keep previous char if available, or just space
                return prev[index] || " ";
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
      <GlassGrid />
      <div className="pointer-events-none absolute inset-0 -z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_14%,rgba(153,255,234,0.08),transparent_36%),radial-gradient(circle_at_82%_84%,rgba(137,196,255,0.07),transparent_34%)]" />
        <FractalTree className="absolute -right-16 -top-12 opacity-60" />
        <FractalTree
          className="absolute -bottom-20 -left-20 opacity-40 [animation-duration:22s] -scale-x-100"
          stroke="rgba(191, 231, 255, 0.32)"
          glow="rgba(191, 231, 255, 0.08)"
          depth={7}
        />
        <FractalTree
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[55%] w-[800px] h-[800px] opacity-35"
          depth={14}
          thickness={2.5}
          showVines={true}
          vineCount={20}
          stroke="rgba(168, 255, 244, 0.3)"
          glow="rgba(168, 255, 244, 0.08)"
        />
      </div>

      <main className="relative z-10 flex flex-col items-center justify-center pt-24 pb-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* 徽章 */}
          <div className="inline-flex items-center gap-2 rounded-none border border-white/10 bg-white/5 px-4 py-1.5 text-sm text-indigo-300 mb-8 backdrop-blur-md shadow-[0_0_15px_rgba(255,255,255,0.05)] animate-float">
            <Sparkles size={14} className="text-indigo-400" />
            <span className="font-light tracking-widest uppercase text-xs">{t("home.badge")}</span>
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
              className="group relative inline-flex h-14 items-center justify-center overflow-hidden rounded-none border border-white/20 bg-white/5 backdrop-blur-md px-10 font-bold text-white transition-all duration-500 hover:bg-white/10 hover:border-white/40 hover:shadow-[0_0_30px_rgba(255,255,255,0.1)] focus:outline-none focus:ring-1 focus:ring-white"
            >
              {/* 磨砂玻璃质感增强：内部高光与阴影 */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-50 pointer-events-none" />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
              <span className="mr-3 tracking-widest uppercase text-sm relative z-10 text-shadow-sm">{t("home.cta.create")}</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1 relative z-10" />
            </Link>
            <Link
              href="/discover"
              className="group relative inline-flex h-14 items-center justify-center overflow-hidden rounded-none border border-white/5 bg-black/20 backdrop-blur-sm px-10 font-medium text-slate-400 transition-all duration-300 hover:text-white hover:bg-black/40 hover:border-white/10"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-30 pointer-events-none" />
              <Globe className="mr-3 h-4 w-4 group-hover:text-white transition-colors relative z-10" />
              <span className="tracking-widest uppercase text-sm relative z-10">
                {t("home.cta.discover")}
                <span className="absolute left-0 -bottom-1 w-0 h-[1px] bg-white transition-all duration-300 group-hover:w-full"></span>
              </span>
            </Link>
          </div>

          {/* 特性卡片 */}
          <div className="mt-32 grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
            {[
              { 
                title: t("home.feature1.title"), 
                desc: t("home.feature1.desc"), 
                icon: <Film className="w-5 h-5 text-white/90" />,
              },
              { 
                title: t("home.feature2.title"), 
                desc: t("home.feature2.desc"), 
                icon: <Workflow className="w-5 h-5 text-white/90" />,
              },
              { 
                title: t("home.feature3.title"), 
                desc: t("home.feature3.desc"), 
                icon: <Layers className="w-5 h-5 text-white/90" />,
              },
            ].map((feature, i) => (
              <div key={i} className={`group relative flex flex-col items-start gap-4 rounded-none border border-white/5 bg-zinc-900/20 backdrop-blur-sm p-8 transition-all duration-500 hover:-translate-y-1 hover:bg-zinc-900/40 hover:border-white/10 hover:shadow-2xl`}>
                {/* 极简角标 */}
                <div className="absolute top-0 right-0 h-[1px] w-4 bg-white/10 group-hover:w-8 group-hover:bg-white/30 transition-all duration-500" />
                <div className="absolute top-0 right-0 w-[1px] h-4 bg-white/10 group-hover:h-8 group-hover:bg-white/30 transition-all duration-500" />
                
                {/* 图标容器：无框悬浮感 */}
                <div className="mb-2 inline-flex items-center justify-center rounded-sm bg-white/5 p-3 text-white ring-1 ring-white/10 transition-all duration-300 group-hover:bg-white/10 group-hover:ring-white/20 group-hover:scale-105">
                  {feature.icon}
                </div>
                
                <div className="space-y-2">
                  <div className="text-lg font-medium text-white tracking-wide group-hover:text-white transition-colors">{feature.title}</div>
                  <div className="text-sm text-zinc-500 leading-relaxed font-light group-hover:text-zinc-400 transition-colors">
                    {feature.desc}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
