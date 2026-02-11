"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import ReactFlow, {
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  MarkerType
} from "reactflow";
import "reactflow/dist/style.css";

import api from "@/lib/api";
import CommitNode from "@/components/CommitNode";
import { getLayoutedElements } from "@/lib/layout";
import { useTimelineStore } from "@/store/timelineStore";

const nodeTypes = {
  commit: CommitNode,
};

interface GraphProps {
  projectId: number;
}

export default function GitGraph({ projectId }: GraphProps) {
  const router = useRouter();
  const { addClip } = useTimelineStore();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [menu, setMenu] = useState<{ visible: boolean; x: number; y: number; nodeId: string | null }>({
    visible: false,
    x: 0,
    y: 0,
    nodeId: null
  });

  useEffect(() => {
    fetchGraph();
  }, [projectId]);

  const fetchGraph = async () => {
    try {
      const res = await api.get(`/projects/${projectId}/graph`);
      const { commits, branches } = res.data;

      // Transform API data to React Flow
      const flowNodes: Node[] = commits.map((c: any) => {
        // Check if any branch points to this commit
        const branch = branches.find((b: any) => b.head_commit_id === c.id);
        
        return {
          id: c.id,
          type: "commit",
          data: {
             id: c.id,
             message: c.message,
             date: c.created_at,
             branch: branch ? branch.name : undefined,
             isHead: !!branch // Highlight if it's a branch head
          },
          position: { x: 0, y: 0 } // Initial position, will be calculated by dagre
        };
      });

      const flowEdges: Edge[] = commits
        .filter((c: any) => c.parent_hash)
        .map((c: any) => ({
          id: `e-${c.parent_hash}-${c.id}`,
          source: c.parent_hash,
          target: c.id,
          type: 'smoothstep',
          markerEnd: {
             type: MarkerType.ArrowClosed,
          },
        }));

      // Apply Layout
      const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
        flowNodes,
        flowEdges
      );

      setNodes(layoutedNodes);
      setEdges(layoutedEdges);

    } catch (error) {
      console.error("Failed to fetch graph", error);
    }
  };

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

  const onPaneClick = useCallback(() => setMenu(prev => ({ ...prev, visible: false })), []);

  const handleFork = async () => {
    if (!menu.nodeId) return;
    try {
      const res = await api.post(`/projects/${projectId}/fork`, { commit_hash: menu.nodeId });
      const newProject = res.data;
      router.push(`/editor/${newProject.id}`);
    } catch (e) {
      console.error(e);
      alert("Fork failed");
    } finally {
      setMenu(prev => ({ ...prev, visible: false }));
    }
  };

  const handleAddToTimeline = () => {
    if (!menu.nodeId) return;
    const node = nodes.find(n => n.id === menu.nodeId);
    const message = node?.data?.message || "Clip";
    addClip(menu.nodeId, message);
    setMenu(prev => ({ ...prev, visible: false }));
  };

  return (
    <div className="w-full h-full min-h-[400px] bg-gray-50 rounded-lg border border-gray-200">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        onNodeContextMenu={onNodeContextMenu}
        onPaneClick={onPaneClick}
        fitView
      >
        <Background />
        <Controls />
      </ReactFlow>
      
      {menu.visible && (
        <div 
          style={{ top: menu.y, left: menu.x }} 
          className="fixed z-50 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 shadow-lg rounded p-2 text-sm"
        >
          <div className="px-2 py-1 text-xs text-gray-500 border-b border-gray-100 mb-1">
            Commit: {menu.nodeId?.slice(0, 7)}
          </div>
          <button 
            onClick={handleAddToTimeline} 
            className="block w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-zinc-700 text-green-600 dark:text-green-400 font-medium rounded"
          >
            Add to Timeline
          </button>
          <button 
            onClick={handleFork} 
            className="block w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-zinc-700 text-blue-600 dark:text-blue-400 font-medium rounded"
          >
            Fork from this Commit
          </button>
           <button 
            onClick={() => setMenu(prev => ({...prev, visible: false}))} 
            className="block w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
