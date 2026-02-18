"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ReactFlow, {
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  MarkerType,
  ReactFlowInstance,
} from "reactflow";
import "reactflow/dist/style.css";

import { projectApi, type Commit } from "@/lib/api";
import CommitNode from "@/components/CommitNode";
import { getLayoutedElements } from "@/lib/layout";
import { useTimelineStore } from "@/store/timelineStore";
import { toast } from "@/components/ui/toast";
import { useProjectGraph } from "@/lib/queries/useProjectGraph";
import { useMutation } from "@tanstack/react-query";
import Input from "@/components/ui/input";
import IconButton from "@/components/ui/icon-button";
import Badge from "@/components/ui/badge";
import { LocateFixed, Search, ZoomIn, ZoomOut, Focus } from "lucide-react";
import GitGraphContextMenu from "@/components/GitGraphContextMenu";
import { useI18n } from "@/lib/i18nContext";
import { prepareWorkspaceForMovedBoundary } from "@/lib/editor/branchBoundary";
import { forkFromCommitBestEffort } from "@/lib/projectFork";
import { useAuthToken } from "@/lib/auth/useAuthToken";
import {
  buildProjectLoginRedirect,
  hasAuthToken,
  resolveCollabActionAvailability,
  resolveCollabActionReasonI18nKey,
  resolveCollabActionReasonCode,
  trackProjectCollabAction,
  type ProjectCollabAccessSnapshot,
  type ProjectCollabActionSurface,
} from "@/lib/projectCollaboration";

const nodeTypes = {
  commit: CommitNode,
};

interface GraphProps {
  projectId: string;
  canForkFromCommit?: boolean;
  forkDeniedReason?: string;
  canMoveBoundaryFromCommit?: boolean;
  moveBoundaryDeniedReason?: string;
  actionSurface?: ProjectCollabActionSurface;
  accessSnapshot?: ProjectCollabAccessSnapshot;
}

export default function GitGraph({
  projectId,
  canForkFromCommit = true,
  forkDeniedReason,
  canMoveBoundaryFromCommit = true,
  moveBoundaryDeniedReason,
  actionSurface = "git_graph",
  accessSnapshot,
}: GraphProps) {
  const { t } = useI18n();
  const router = useRouter();
  const search = useSearchParams();
  const token = useAuthToken();
  const isAuthed = hasAuthToken(token);
  const loginRedirect = buildProjectLoginRedirect(projectId);
  const { addClip } = useTimelineStore();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [rf, setRf] = useState<ReactFlowInstance | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [query, setQuery] = useState("");
  const [matchIndex, setMatchIndex] = useState(0);
  const [menu, setMenu] = useState<{ visible: boolean; x: number; y: number; nodeId: string | null }>({
    visible: false,
    x: 0,
    y: 0,
    nodeId: null
  });

  const { data, isError, error } = useProjectGraph(projectId);

  const forkMutation = useMutation({
    mutationFn: async (commitHash: string) => forkFromCommitBestEffort(projectId, commitHash),
    onSuccess: (result, commitHash) => {
      trackProjectCollabAction({
        surface: actionSurface,
        action: result.mode === "requested" ? "request_fork" : "fork",
        decision_source: "access_snapshot",
        result: "success",
        projectId,
        commitId: commitHash,
        accessSnapshot,
      });
      if (result.mode === "requested") {
        toast({ title: t("toast.forkRequested"), description: t("toast.forkRequested.desc"), variant: "success" });
        return;
      }
      toast({
        title: t("project.forked.title"),
        description: `#${(result.projectId || "").slice(0, 8)}`,
        variant: "success",
      });
      router.push(`/editor/${result.projectId}`);
    },
    onError: (e, commitHash) => {
      trackProjectCollabAction({
        surface: actionSurface,
        action: "fork",
        decision_source: "access_snapshot",
        result: "error",
        reason: e instanceof Error ? e.message : "fork_error",
        projectId,
        commitId: commitHash,
        accessSnapshot,
      });
      const message = e instanceof Error ? e.message : t("toast.forkFailed");
      toast({ title: t("toast.forkFailed"), description: message, variant: "destructive" });
    },
  });

  const moveBoundaryMutation = useMutation({
    mutationFn: async (commitHash: string) => {
      const activeBranch = (search?.get("branch") || "main").trim() || "main";
      const name = `rewrite/${commitHash.slice(0, 7)}`;
      const newBranch = await projectApi.forkBranch(projectId, {
        source_branch_name: activeBranch,
        from_commit_hash: commitHash,
        name,
      });
      let boundaryOrder: number | null = null;
      try {
        const workspace = await projectApi.getWorkspace(projectId, { branch_name: newBranch.name });
        const prepared = prepareWorkspaceForMovedBoundary(workspace, newBranch.name);
        if (prepared) {
          await projectApi.updateWorkspace(projectId, prepared.workspace, { branch_name: newBranch.name });
          boundaryOrder = prepared.boundaryOrder;
        }
      } catch {
        boundaryOrder = null;
      }
      return { newBranch, boundaryOrder };
    },
    onSuccess: ({ newBranch, boundaryOrder }, commitHash) => {
      trackProjectCollabAction({
        surface: actionSurface,
        action: "move_boundary",
        decision_source: "access_snapshot",
        result: "success",
        projectId,
        commitId: commitHash,
        branchName: newBranch.name,
        accessSnapshot,
      });
      toast({
        title: t("editor.boundary.updated.title"),
        description:
          typeof boundaryOrder === "number"
            ? t("editor.boundary.updated.desc").replace("{order}", String(boundaryOrder))
            : t("editor.branch.toast.switched").replace("{name}", newBranch.name),
        variant: "success",
      });
      router.push(`/editor/${projectId}?branch=${encodeURIComponent(newBranch.name)}`);
    },
    onError: (e, commitHash) => {
      trackProjectCollabAction({
        surface: actionSurface,
        action: "move_boundary",
        decision_source: "access_snapshot",
        result: "error",
        reason: e instanceof Error ? e.message : "move_boundary_error",
        projectId,
        commitId: commitHash,
        accessSnapshot,
      });
      const message = e instanceof Error ? e.message : t("graph.toast.moveFailed.title");
      toast({ title: t("graph.toast.moveFailed.title"), description: message, variant: "destructive" });
    },
  });

  useEffect(() => {
    if (!isError) return;
    const message = error instanceof Error ? error.message : t("graph.toast.loadHistoryFailed.title");
    toast({ title: t("graph.toast.loadHistoryFailed.title"), description: message, variant: "destructive" });
  }, [error, isError, t]);

  const headCommitId = useMemo(() => {
    if (!data) return null;
    const branch =
      data.branches.find((b) => b.name === "main") ||
      data.branches.find((b) => b.name === "master") ||
      data.branches[0];
    return branch?.head_commit_id || null;
  }, [data]);

  const layouted = useMemo(() => {
    if (!data) return null;
    const { commits, branches } = data;

    const flowNodes: Node[] = commits.map((c: Commit) => {
      const branch = branches.find((b) => b.head_commit_id === c.id);

      return {
        id: c.id,
        type: "commit",
        data: {
          id: c.id,
          message: c.message,
          date: c.created_at,
          branch: branch ? branch.name : undefined,
          isHead: !!branch,
        },
        position: { x: 0, y: 0 },
      };
    });

    const flowEdges: Edge[] = commits
      .filter((c) => c.parent_hash)
      .map((c) => ({
        id: `e-${c.parent_hash}-${c.id}`,
        source: c.parent_hash as string,
        target: c.id,
        type: "smoothstep",
        markerEnd: { type: MarkerType.ArrowClosed },
      }));

    return getLayoutedElements(flowNodes, flowEdges);
  }, [data]);

  useEffect(() => {
    if (!layouted) return;
    setNodes(layouted.nodes);
    setEdges(layouted.edges);
  }, [layouted, setEdges, setNodes]);

  const matchIds = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return nodes
      .filter((n) => {
        const msg = String((n.data as any)?.message || "").toLowerCase();
        const id = String(n.id).toLowerCase();
        return msg.includes(q) || id.includes(q);
      })
      .map((n) => String(n.id));
  }, [nodes, query]);

  useEffect(() => {
    setMatchIndex(0);
  }, [query]);

  const displayNodes = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return nodes.map((n) => ({ ...n, data: { ...n.data, isHighlighted: false } }));
    }
    const set = new Set(matchIds);
    return nodes.map((n) => ({ ...n, data: { ...n.data, isHighlighted: set.has(String(n.id)) } }));
  }, [matchIds, nodes, query]);

  const closeMenu = useCallback(() => setMenu((prev) => ({ ...prev, visible: false })), []);

  const forkActionAvailability = useMemo(
    () =>
      resolveCollabActionAvailability({
        canUseAction: canForkFromCommit,
        isAuthed,
        authReason: t(
          resolveCollabActionReasonI18nKey({
            action: "fork",
            reasonType: "auth",
            surface: actionSurface,
          }) || "graph.menu.authRequiredFork",
        ),
        permissionReason: forkDeniedReason,
      }),
    [actionSurface, canForkFromCommit, forkDeniedReason, isAuthed, t],
  );
  const moveBoundaryActionAvailability = useMemo(
    () =>
      resolveCollabActionAvailability({
        canUseAction: canMoveBoundaryFromCommit,
        isAuthed,
        authReason: t(
          resolveCollabActionReasonI18nKey({
            action: "move_boundary",
            reasonType: "auth",
            surface: actionSurface,
          }) || "graph.menu.authRequiredBoundary",
        ),
        permissionReason: moveBoundaryDeniedReason,
      }),
    [actionSurface, canMoveBoundaryFromCommit, isAuthed, moveBoundaryDeniedReason, t],
  );

  const onNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node) => {
      event.preventDefault();
      setMenu({
        visible: true,
        x: event.clientX,
        y: event.clientY,
        nodeId: node.id
      });
    },
    []
  );

  const onPaneClick = useCallback(() => closeMenu(), [closeMenu]);

  const handleFork = async () => {
    if (!menu.nodeId) return;
    if (forkActionAvailability.disabled && forkActionAvailability.reasonType === "permission") {
      trackProjectCollabAction({
        surface: actionSurface,
        action: "fork",
        decision_source: "access_snapshot",
        result: "blocked",
        projectId,
        commitId: menu.nodeId,
        reason: resolveCollabActionReasonCode({ action: "fork", reasonType: "permission" }),
        accessSnapshot,
      });
      closeMenu();
      return;
    }
    if (forkActionAvailability.disabled && forkActionAvailability.reasonType === "auth") {
      trackProjectCollabAction({
        surface: actionSurface,
        action: "fork",
        decision_source: "access_snapshot",
        result: "redirect_login",
        projectId,
        commitId: menu.nodeId,
        reason: resolveCollabActionReasonCode({ action: "fork", reasonType: "auth" }),
        accessSnapshot,
      });
      router.push(loginRedirect);
      closeMenu();
      return;
    }
    forkMutation.mutate(menu.nodeId);
    closeMenu();
  };

  const handleMoveBoundary = () => {
    if (!menu.nodeId) return;
    if (moveBoundaryActionAvailability.disabled && moveBoundaryActionAvailability.reasonType === "permission") {
      trackProjectCollabAction({
        surface: actionSurface,
        action: "move_boundary",
        decision_source: "access_snapshot",
        result: "blocked",
        projectId,
        commitId: menu.nodeId,
        reason: resolveCollabActionReasonCode({ action: "move_boundary", reasonType: "permission" }),
        accessSnapshot,
      });
      closeMenu();
      return;
    }
    if (moveBoundaryActionAvailability.disabled && moveBoundaryActionAvailability.reasonType === "auth") {
      trackProjectCollabAction({
        surface: actionSurface,
        action: "move_boundary",
        decision_source: "access_snapshot",
        result: "redirect_login",
        projectId,
        commitId: menu.nodeId,
        reason: resolveCollabActionReasonCode({ action: "move_boundary", reasonType: "auth" }),
        accessSnapshot,
      });
      router.push(loginRedirect);
      closeMenu();
      return;
    }
    moveBoundaryMutation.mutate(menu.nodeId);
    closeMenu();
  };

  const handleAddToTimeline = () => {
    if (!menu.nodeId) return;
    const node = nodes.find(n => n.id === menu.nodeId);
    const message = node?.data?.message || t("graph.clipFallback");
    addClip(menu.nodeId, message);
    closeMenu();
  };

  const focusSearch = useCallback(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const fitAll = useCallback(() => {
    if (!rf) return;
    rf.fitView({ padding: 0.2, duration: 350 });
  }, [rf]);

  const goToHead = useCallback(() => {
    if (!rf || !headCommitId) return;
    const node = rf.getNode(headCommitId);
    if (!node) return;
    rf.fitView({ nodes: [node], padding: 0.25, duration: 400 });
  }, [headCommitId, rf]);

  const goToMatch = useCallback(
    (index: number) => {
      if (!rf) return;
      if (matchIds.length === 0) return;
      const normalized = ((index % matchIds.length) + matchIds.length) % matchIds.length;
      setMatchIndex(normalized);
      const id = matchIds[normalized];
      const node = rf.getNode(id);
      if (!node) return;
      rf.fitView({ nodes: [node], padding: 0.35, duration: 350 });
    },
    [matchIds, rf]
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeMenu();
      if (e.key === "/") {
        e.preventDefault();
        focusSearch();
      }
      if (e.key === "f" || e.key === "F") fitAll();
      if (e.key === "h" || e.key === "H") goToHead();
      if (e.key === "Enter" && document.activeElement === inputRef.current) {
        e.preventDefault();
        goToMatch(matchIndex);
      }
      if (e.key === "ArrowDown" && document.activeElement === inputRef.current) {
        e.preventDefault();
        goToMatch(matchIndex + 1);
      }
      if (e.key === "ArrowUp" && document.activeElement === inputRef.current) {
        e.preventDefault();
        goToMatch(matchIndex - 1);
      }
      if ((e.key === "+" || e.key === "=") && rf) rf.zoomIn({ duration: 150 });
      if (e.key === "-" && rf) rf.zoomOut({ duration: 150 });
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [closeMenu, fitAll, focusSearch, goToHead, goToMatch, matchIndex, rf]);

  return (
    <div className="w-full h-full min-h-[400px] bg-card rounded-lg border border-border overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-background/60">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="relative w-full max-w-[420px]">
            <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              <Search size={16} />
            </div>
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("graph.search.placeholder")}
              className="pl-9"
            />
          </div>
          {matchIds.length > 0 ? (
            <Badge variant="secondary">
              {matchIndex + 1}/{matchIds.length}
            </Badge>
          ) : query.trim() ? (
            <Badge variant="secondary">0</Badge>
          ) : null}
        </div>

        <div className="flex items-center gap-1">
          <IconButton
            aria-label={t("graph.controls.head")}
            title={t("graph.controls.head")}
            onClick={goToHead}
            disabled={!headCommitId}
          >
            <LocateFixed size={16} />
          </IconButton>
          <IconButton aria-label={t("graph.controls.fit")} title={t("graph.controls.fit")} onClick={fitAll}>
            <Focus size={16} />
          </IconButton>
          <IconButton
            aria-label={t("graph.controls.zoomIn")}
            title={t("graph.controls.zoomIn")}
            onClick={() => rf?.zoomIn({ duration: 150 })}
            disabled={!rf}
          >
            <ZoomIn size={16} />
          </IconButton>
          <IconButton
            aria-label={t("graph.controls.zoomOut")}
            title={t("graph.controls.zoomOut")}
            onClick={() => rf?.zoomOut({ duration: 150 })}
            disabled={!rf}
          >
            <ZoomOut size={16} />
          </IconButton>
        </div>
      </div>

      <ReactFlow
        nodes={displayNodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        onNodeContextMenu={onNodeContextMenu}
        onPaneClick={onPaneClick}
        fitView
        onInit={setRf}
      >
        <Background color="rgba(148,163,184,0.16)" gap={18} />
        <Controls />
        <MiniMap
          pannable
          zoomable
          nodeColor={(n) => ((n.data as any)?.isHead ? "#6366F1" : "#334155")}
          maskColor="rgba(2,6,23,0.55)"
          style={{ backgroundColor: "rgba(15,23,42,0.9)" }}
        />
      </ReactFlow>
      
      <GitGraphContextMenu
        open={menu.visible}
        x={menu.x}
        y={menu.y}
        commitId={menu.nodeId}
        onAddToTimeline={handleAddToTimeline}
        onFork={handleFork}
        onMoveBoundary={handleMoveBoundary}
        forkDisabled={forkActionAvailability.disabled || forkMutation.isPending}
        forkDisabledReason={
          forkMutation.isPending ? t("common.loading") : forkActionAvailability.reason
        }
        forkDisabledReasonType={
          forkMutation.isPending ? "permission" : forkActionAvailability.reasonType
        }
        moveBoundaryDisabled={
          moveBoundaryActionAvailability.disabled || moveBoundaryMutation.isPending
        }
        moveBoundaryDisabledReason={
          moveBoundaryMutation.isPending
            ? t("common.loading")
            : moveBoundaryActionAvailability.reason
        }
        moveBoundaryDisabledReasonType={
          moveBoundaryMutation.isPending
            ? "permission"
            : moveBoundaryActionAvailability.reasonType
        }
        forkHintText={t("graph.menu.forkHint")}
        moveBoundaryHintText={t("graph.menu.moveBoundaryHint")}
        onGoLogin={
          !isAuthed
            ? () => {
                router.push(loginRedirect);
                closeMenu();
              }
            : undefined
        }
        onClose={closeMenu}
      />
    </div>
  );
}
