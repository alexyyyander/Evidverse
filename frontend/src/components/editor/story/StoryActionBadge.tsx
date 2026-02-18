"use client";

import { cn } from "@/lib/cn";
import { useI18n } from "@/lib/i18nContext";
import { resolveStoryActionBadgeClass, type StoryNodeRecommendedAction } from "@/lib/editor/storyProgress";

export default function StoryActionBadge({
  action,
  tone = "solid",
  withLabel = true,
  className,
}: {
  action: StoryNodeRecommendedAction;
  tone?: "solid" | "soft";
  withLabel?: boolean;
  className?: string;
}) {
  const { t } = useI18n();
  const badgeClass = resolveStoryActionBadgeClass(action, tone);

  return (
    <span className={cn("inline-flex items-center rounded border px-1 py-0.5 text-[10px]", badgeClass, className)}>
      {withLabel ? `${t("story.nextAction.label")}: ${t(`story.nextAction.${action}`)}` : t(`story.nextAction.${action}`)}
    </span>
  );
}
