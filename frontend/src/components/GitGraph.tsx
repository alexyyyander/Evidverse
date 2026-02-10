"use client";

import { useEffect, useState, useCallback } from "react";
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

const nodeTypes = {
  commit: CommitNode,
};

interface GraphProps {
  projectId: number;
}

export default function GitGraph({ projectId }: GraphProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

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

  return (
    <div className="w-full h-full min-h-[400px] bg-gray-50 rounded-lg border border-gray-200">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}
