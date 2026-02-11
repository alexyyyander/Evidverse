import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { GitCommit } from 'lucide-react';
import { cn } from "@/lib/cn";

interface CommitNodeData {
  id: string;
  message: string;
  date: string;
  isHead?: boolean;
  branch?: string;
  isHighlighted?: boolean;
}

const CommitNode = ({ data }: { data: CommitNodeData }) => {
  return (
    <div
      className={cn(
        "px-4 py-2 rounded-md border w-[240px] bg-card text-foreground shadow-soft",
        data.isHead ? "border-indigo-500/60" : "border-border",
        data.isHighlighted ? "ring-2 ring-ring" : ""
      )}
    >
      <Handle type="target" position={Position.Top} className="w-16 !bg-muted-foreground/60" />
      
      <div className="flex items-center">
        <div
          className={cn(
            "rounded-full p-1 mr-2",
            data.isHead ? "bg-indigo-500/15 text-indigo-300" : "bg-muted text-muted-foreground"
          )}
        >
          <GitCommit size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold truncate" title={data.message}>
            {data.message}
          </div>
          <div className="text-[10px] text-muted-foreground truncate">{data.id.substring(0, 7)}</div>
        </div>
      </div>
      
      <div className="mt-2 flex flex-wrap gap-1">
        {data.isHead ? (
          <div className="text-[10px] bg-indigo-500/15 text-indigo-200 px-2 py-0.5 rounded-full inline-block border border-indigo-500/25">
            HEAD
          </div>
        ) : null}
        {data.branch ? (
          <div className="text-[10px] bg-emerald-500/15 text-emerald-200 px-2 py-0.5 rounded-full inline-block border border-emerald-500/25">
            {data.branch}
          </div>
        ) : null}
      </div>

      <div className="mt-1 text-[10px] text-muted-foreground text-right" title={data.date}>
        {new Date(data.date).toLocaleString()}
      </div>

      <Handle type="source" position={Position.Bottom} className="w-16 !bg-muted-foreground/60" />
    </div>
  );
};

export default memo(CommitNode);
