export type AppMode = "local" | "cloud";

export function getAppMode(): AppMode {
  const raw = String(process.env.NEXT_PUBLIC_APP_MODE || "").trim().toLowerCase();
  if (raw === "cloud") return "cloud";
  return "local";
}

