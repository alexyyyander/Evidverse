"use client";

import { useEffect, useMemo, useRef } from "react";
import { useEditorStore } from "@/store/editorStore";
import { cn } from "@/lib/cn";
import { Sparkles, Users, Image as ImageIcon, GitBranch, BookOpen } from "lucide-react";
import IconButton from "@/components/ui/icon-button";
import CreatePanel from "@/components/editor/CreatePanel";
import CharactersPanel from "@/components/editor/CharactersPanel";
import AssetsGrid from "@/components/editor/AssetsGrid";
import VNImportPanel from "@/components/editor/VNImportPanel";
import dynamic from "next/dynamic";
import Spinner from "@/components/ui/spinner";
import Button from "@/components/ui/button";
import { useI18n } from "@/lib/i18nContext";
import type { StoryAssetsImageFilter } from "@/lib/editor/types";
import { useAuthToken } from "@/lib/auth/useAuthToken";
import {
  hasAuthToken,
  resolveCollabActionAvailability,
  resolveCollabActionReasonI18nKey,
  resolveCollabReasonBannerClass,
  type ProjectCollabAccessSnapshot,
} from "@/lib/projectCollaboration";

const GitGraph = dynamic(() => import("@/components/GitGraph"), {
  ssr: false,
  loading: () => (
    <div className="min-h-[240px] flex items-center justify-center">
      <Spinner size={20} />
    </div>
  ),
});

interface LeftSidebarProps {
  projectId: string;
  branchName: string;
  assetsProps?: any;
  collabAccess?: ProjectCollabAccessSnapshot;
}

export default function LeftSidebar({ projectId, branchName, assetsProps, collabAccess }: LeftSidebarProps) {
  const activeTab = useEditorStore((state) => state.layout.activeLeftTab);
  const updateLayout = useEditorStore((state) => state.updateLayout);
  const assets = useEditorStore((state) => state.data.assets);
  const beats = useEditorStore((state) => state.data.beats);
  const workflow = useEditorStore((state) => state.data.storyWorkflow);
  const selectedStoryNodeId = useEditorStore((state) => state.selection.selectedStoryNodeId);
  const selectedCharacterId = useEditorStore((state) => state.selection.selectedCharacterId);
  const selectedAssetId = useEditorStore((state) => state.selection.selectedAssetId);
  const selectAsset = useEditorStore((state) => state.selectAsset);
  const updateStoryUi = useEditorStore((state) => state.updateStoryUi);
  const lastStep2AutoNodeIdRef = useRef<string | null>(null);
  const { t } = useI18n();
  const token = useAuthToken();
  const isAuthed = hasAuthToken(token) || !!collabAccess?.viewerId;
  const canMoveBoundaryFromCommit = collabAccess?.canMoveBoundaryFromCommit ?? true;
  const canForkFromCommit = collabAccess?.canForkFromCommit ?? true;
  const moveBoundaryPermissionReasonKey =
    resolveCollabActionReasonI18nKey({
      action: "move_boundary",
      reasonType: "permission",
      surface: "editor_history",
    }) || "project.preview.collab.branchRequiresPublic";
  const moveBoundaryAuthReasonKey =
    resolveCollabActionReasonI18nKey({
      action: "move_boundary",
      reasonType: "auth",
      surface: "editor_history",
    }) || "graph.menu.authRequiredBoundary";
  const moveBoundaryActionAvailability = useMemo(
    () =>
      resolveCollabActionAvailability({
        canUseAction: canMoveBoundaryFromCommit,
        isAuthed,
        authReason: t(moveBoundaryAuthReasonKey),
        permissionReason: t(moveBoundaryPermissionReasonKey),
      }),
    [canMoveBoundaryFromCommit, isAuthed, moveBoundaryAuthReasonKey, moveBoundaryPermissionReasonKey, t],
  );
  const imageFilter: StoryAssetsImageFilter = workflow?.ui?.assetsImageFilter || "all";
  const imageAssets = useMemo(
    () =>
      Object.values(assets)
        .filter((asset) => asset.type === "image")
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
    [assets],
  );
  const selectedNode = useMemo(() => {
    if (!workflow) return null;
    const nodeId = selectedStoryNodeId || workflow.selectedNodeId;
    if (!nodeId) return null;
    return workflow.nodes.find((node) => node.id === nodeId) || null;
  }, [selectedStoryNodeId, workflow]);
  const nodeBeatIds = useMemo(() => new Set(selectedNode?.beatIds || []), [selectedNode]);
  const nodeCharacterIds = useMemo(() => {
    const ids = new Set<string>();
    if (!selectedNode) return ids;
    for (const beatId of selectedNode.beatIds) {
      const beat = beats[beatId];
      if (!beat) continue;
      for (const characterId of beat.characterIds) ids.add(characterId);
    }
    return ids;
  }, [beats, selectedNode]);
  const nodeMappedAssetIds = useMemo(() => {
    const ids = new Set<string>();
    if (!selectedNode) return ids;
    for (const assetId of Object.values(selectedNode.step3.characterAssetMap || {})) {
      if (assetId) ids.add(assetId);
    }
    for (const assetId of Object.values(selectedNode.step4.assetBindings.characterAssetIds || {})) {
      if (assetId) ids.add(assetId);
    }
    if (selectedNode.step4.assetBindings.backgroundAssetId) ids.add(selectedNode.step4.assetBindings.backgroundAssetId);
    if (selectedNode.step4.assetBindings.startImageAssetId) ids.add(selectedNode.step4.assetBindings.startImageAssetId);
    if (selectedNode.step4.assetBindings.endImageAssetId) ids.add(selectedNode.step4.assetBindings.endImageAssetId);
    return ids;
  }, [selectedNode]);
  const filteredImageAssets = useMemo(() => {
    if (imageFilter === "all") return imageAssets;
    if (imageFilter === "node") {
      if (!selectedNode) return [];
      return imageAssets.filter((asset) => {
        if (nodeMappedAssetIds.has(asset.id)) return true;
        if (asset.relatedBeatId && nodeBeatIds.has(asset.relatedBeatId)) return true;
        if (asset.relatedCharacterId && nodeCharacterIds.has(asset.relatedCharacterId)) return true;
        return false;
      });
    }
    if (!selectedCharacterId) return [];
    return imageAssets.filter((asset) => {
      if (asset.relatedCharacterId === selectedCharacterId) return true;
      if (!selectedNode) return false;
      const step3AssetId = selectedNode.step3.characterAssetMap?.[selectedCharacterId];
      const step4AssetId = selectedNode.step4.assetBindings.characterAssetIds?.[selectedCharacterId];
      return asset.id === step3AssetId || asset.id === step4AssetId;
    });
  }, [
    imageAssets,
    imageFilter,
    nodeBeatIds,
    nodeCharacterIds,
    nodeMappedAssetIds,
    selectedCharacterId,
    selectedNode,
  ]);

  const setImageFilter = (next: StoryAssetsImageFilter) => {
    if (!workflow) return;
    if (imageFilter === next) return;
    updateStoryUi({ assetsImageFilter: next });
  };

  useEffect(() => {
    if (imageFilter === "node" && !selectedNode) {
      setImageFilter("all");
      return;
    }
    if (imageFilter === "character" && !selectedCharacterId) {
      setImageFilter("all");
    }
  }, [imageFilter, selectedCharacterId, selectedNode]);

  useEffect(() => {
    if (activeTab !== "assets") return;
    if (workflow?.activeStep !== "step2") return;
    const currentNodeId = selectedNode?.id || null;
    if (!currentNodeId) return;
    if (lastStep2AutoNodeIdRef.current === currentNodeId) return;
    lastStep2AutoNodeIdRef.current = currentNodeId;
    setImageFilter("node");
  }, [activeTab, selectedNode?.id, workflow?.activeStep]);

  const tabs = [
    { id: "create", icon: Sparkles, label: t("editor.left.create") },
    { id: "vn", icon: BookOpen, label: t("editor.left.vn") },
    { id: "characters", icon: Users, label: t("editor.left.characters") },
    { id: "assets", icon: ImageIcon, label: t("editor.left.assets") },
    { id: "history", icon: GitBranch, label: t("editor.left.history") },
  ] as const;

  return (
    <div className="h-full flex flex-col bg-background border-r border-border overflow-hidden">
      <div className="flex items-center border-b border-border p-2 gap-1 overflow-x-auto">
        {tabs.map((tab) => (
          <IconButton
            key={tab.id}
            onClick={() => updateLayout({ activeLeftTab: tab.id })}
            className={cn(
              "flex-shrink-0 w-8 h-8",
              activeTab === tab.id ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:text-foreground"
            )}
            title={tab.label}
          >
            <tab.icon size={16} />
          </IconButton>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeTab === "create" || activeTab === "script" ? <CreatePanel /> : null}
        {activeTab === "vn" ? <VNImportPanel projectId={projectId} branchName={branchName} /> : null}
        {activeTab === "characters" ? <CharactersPanel /> : null}
        {activeTab === "assets" && (
          <div className="h-full p-4">
            {assetsProps ? <AssetsGrid {...assetsProps} /> : <div className="text-sm text-muted-foreground">{t("editor.left.assets.empty")}</div>}
            <div className="mt-4 border-t border-border/60 pt-3">
              <div className="mb-2 text-xs font-semibold text-muted-foreground">{t("editor.left.assets.images.title")}</div>
              <div className="mb-2 flex flex-wrap gap-1">
                <Button
                  size="sm"
                  variant={imageFilter === "all" ? "primary" : "secondary"}
                  onClick={() => setImageFilter("all")}
                >
                  {t("editor.left.assets.images.filter.all")}
                </Button>
                <Button
                  size="sm"
                  variant={imageFilter === "node" ? "primary" : "secondary"}
                  onClick={() => setImageFilter("node")}
                  disabled={!selectedNode}
                >
                  {t("editor.left.assets.images.filter.node")}
                </Button>
                <Button
                  size="sm"
                  variant={imageFilter === "character" ? "primary" : "secondary"}
                  onClick={() => setImageFilter("character")}
                  disabled={!selectedCharacterId}
                >
                  {t("editor.left.assets.images.filter.character")}
                </Button>
              </div>
              {filteredImageAssets.length === 0 ? (
                <div className="text-xs text-muted-foreground">{t("editor.left.assets.images.empty")}</div>
              ) : (
                <div className="space-y-2">
                  {filteredImageAssets.map((asset) => (
                    <div
                      key={asset.id}
                      className={cn(
                        "rounded-md border border-border/70 bg-muted/20 p-2",
                        selectedAssetId === asset.id ? "border-ring ring-1 ring-ring/60" : "",
                      )}
                    >
                      <button
                        type="button"
                        className="w-full text-left"
                        onClick={() => selectAsset(asset.id, "story")}
                        aria-label={asset.id}
                      >
                        <div className="text-[11px] text-muted-foreground">{asset.id}</div>
                        <img
                          src={asset.url}
                          alt={asset.id}
                          className="mt-1 h-20 w-full rounded border border-border/50 object-cover"
                        />
                      </button>
                      <a
                        href={asset.url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-flex h-7 items-center justify-center border border-border px-2 text-[11px] text-muted-foreground hover:text-foreground"
                      >
                        {t("common.view")}
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
        {activeTab === "history" && (
          <div className="h-full p-4">
            {moveBoundaryActionAvailability.disabled && moveBoundaryActionAvailability.reason ? (
              <div
                className={`mb-3 rounded-md border px-2.5 py-1.5 text-[11px] leading-snug ${resolveCollabReasonBannerClass(
                  moveBoundaryActionAvailability.reasonType,
                )}`}
              >
                {moveBoundaryActionAvailability.reason}
              </div>
            ) : null}
            <GitGraph
              projectId={projectId}
              canForkFromCommit={canForkFromCommit}
              canMoveBoundaryFromCommit={canMoveBoundaryFromCommit}
              moveBoundaryDeniedReason={
                canMoveBoundaryFromCommit ? undefined : t(moveBoundaryPermissionReasonKey)
              }
              actionSurface="editor_history"
              accessSnapshot={collabAccess}
            />
          </div>
        )}
      </div>
    </div>
  );
}
