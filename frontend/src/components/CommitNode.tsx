import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { GitCommit } from 'lucide-react';

interface CommitNodeData {
  id: string;
  message: string;
  author: string;
  date: string;
  isHead?: boolean;
  branch?: string;
}

const CommitNode = ({ data }: { data: CommitNodeData }) => {
  return (
    <div
      className={`px-4 py-2 shadow-md rounded-md border w-[220px] ${
        data.isHead ? "border-indigo-500/70 bg-slate-900" : "border-slate-800 bg-slate-900/70"
      }`}
    >
      <Handle type="target" position={Position.Top} className="w-16 !bg-slate-600" />
      
      <div className="flex items-center">
        <div
          className={`rounded-full p-1 mr-2 ${
            data.isHead ? "bg-indigo-500/15 text-indigo-300" : "bg-slate-800 text-slate-300"
          }`}
        >
          <GitCommit size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold truncate text-slate-100">{data.message}</div>
          <div className="text-[10px] text-slate-400 truncate">{data.id.substring(0, 7)}</div>
        </div>
      </div>
      
      {data.branch && (
         <div className="mt-2 text-[10px] bg-emerald-500/15 text-emerald-300 px-2 py-0.5 rounded-full inline-block border border-emerald-500/20">
            {data.branch}
         </div>
      )}

      <div className="mt-1 text-[10px] text-slate-500 text-right">
        {new Date(data.date).toLocaleDateString()}
      </div>

      <Handle type="source" position={Position.Bottom} className="w-16 !bg-slate-600" />
    </div>
  );
};

export default memo(CommitNode);
