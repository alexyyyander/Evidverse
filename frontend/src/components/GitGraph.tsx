"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
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
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import Input from "@/components/ui/input";
import IconButton from "@/components/ui/icon-button";
import Badge from "@/components/ui/badge";
import { LocateFixed, Search, ZoomIn, ZoomOut, Focus } from "lucide-react";
import GitGraphContextMenu from "@/components/GitGraphContextMenu";

const nodeTypes = {
  commit: CommitNode,
};

interface GraphProps {
  projectId: string;
}

export default function GitGraph({ projectId }: GraphProps) {
  const router = useRouter();
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

  const queryClient = useQueryClient();
  const { data, isError, error } = useProjectGraph(projectId);

  const forkMutation = useMutation({
    mutationFn: async (commitHash: string) => projectApi.fork(projectId, commitHash),
    onSuccess: (newProject) => {
      toast({ title: "Forked", description: "Opening editor...", variant: "success" });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects() });
      router.push(`/editor/${newProject.id}`);
    },
    onError: (e) => {
      const message = e instanceof Error ? e.message : "Fork failed";
      toast({ title: "Fork failed", description: message, variant: "destructive" });
    },
  });

  useEffect(() => {
    if (!isError) return;
    const message = error instanceof Error ? error.message : "Failed to load graph";
    toast({ title: "Failed to load history", description: message, variant: "destructive" });
  }, [error, isError]);

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
    forkMutation.mutate(menu.nodeId);
    closeMenu();
  };

  const handleAddToTimeline = () => {
    if (!menu.nodeId) return;
    const node = nodes.find(n => n.id === menu.nodeId);
    const message = node?.data?.message || "Clip";
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
              placeholder="Search commits (/, Enter, ↑/↓)"
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
          <IconButton aria-label="Go to HEAD (H)" title="Go to HEAD (H)" onClick={goToHead} disabled={!headCommitId}>
            <LocateFixed size={16} />
          </IconButton>
          <IconButton aria-label="Fit view (F)" title="Fit view (F)" onClick={fitAll}>
            <Focus size={16} />
          </IconButton>
          <IconButton
            aria-label="Zoom in (+)"
            title="Zoom in (+)"
            onClick={() => rf?.zoomIn({ duration: 150 })}
            disabled={!rf}
          >
            <ZoomIn size={16} />
          </IconButton>
          <IconButton
            aria-label="Zoom out (-)"
            title="Zoom out (-)"
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
        onClose={closeMenu}
      />
    </div>
  );
}
