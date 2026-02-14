"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18nContext";

export default function Home() {
  const { t } = useI18n();
  return (
    <div className="relative overflow-hidden min-h-[calc(100vh-64px)]">
      <div className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute -top-24 left-1/2 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-gradient-to-r from-indigo-600/20 via-sky-500/10 to-fuchsia-500/20 blur-3xl" />
        <div className="absolute -bottom-28 right-[-120px] h-[420px] w-[520px] rounded-full bg-gradient-to-tr from-emerald-500/10 to-indigo-500/10 blur-3xl" />
      </div>

      <main className="relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/60 px-3 py-1 text-xs text-slate-300">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
              {t("home.badge")}
            </div>

            <h1 className="mt-6 text-4xl sm:text-6xl font-semibold tracking-tight text-white">
              Vidgit
              <span className="block text-slate-300 mt-3 text-2xl sm:text-3xl font-medium">
                {t("home.tagline")}
              </span>
            </h1>

            <p className="mt-6 text-base sm:text-lg text-slate-400">
              {t("home.subtitle")}
            </p>

            <div className="mt-10 flex flex-col sm:flex-row gap-3">
              <Link
                href="/editor/new"
                className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-5 py-3 text-sm font-medium text-white hover:bg-indigo-500"
              >
                {t("home.cta.create")}
              </Link>
              <Link
                href="/discover"
                className="inline-flex items-center justify-center rounded-lg border border-slate-800 bg-slate-950 px-5 py-3 text-sm font-medium text-slate-200 hover:bg-slate-900"
              >
                {t("home.cta.discover")}
              </Link>
              <Link
                href="/projects"
                className="inline-flex items-center justify-center rounded-lg border border-slate-800 bg-slate-950 px-5 py-3 text-sm font-medium text-slate-200 hover:bg-slate-900"
              >
                {t("home.cta.projects")}
              </Link>
            </div>
          </div>

          <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
              <div className="text-sm font-medium text-white">{t("home.feature1.title")}</div>
              <div className="mt-2 text-sm text-slate-400">
                {t("home.feature1.desc")}
              </div>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
              <div className="text-sm font-medium text-white">{t("home.feature2.title")}</div>
              <div className="mt-2 text-sm text-slate-400">
                {t("home.feature2.desc")}
              </div>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
              <div className="text-sm font-medium text-white">{t("home.feature3.title")}</div>
              <div className="mt-2 text-sm text-slate-400">
                {t("home.feature3.desc")}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
