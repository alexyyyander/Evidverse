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
    <div className={`px-4 py-2 shadow-md rounded-md bg-white border-2 w-[200px] ${data.isHead ? 'border-blue-500' : 'border-gray-200'}`}>
      <Handle type="target" position={Position.Top} className="w-16 !bg-gray-400" />
      
      <div className="flex items-center">
        <div className={`rounded-full p-1 mr-2 ${data.isHead ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
          <GitCommit size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-bold truncate text-gray-900">{data.message}</div>
          <div className="text-[10px] text-gray-500 truncate">{data.id.substring(0, 7)}</div>
        </div>
      </div>
      
      {data.branch && (
         <div className="mt-2 text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full inline-block">
            {data.branch}
         </div>
      )}

      <div className="mt-1 text-[10px] text-gray-400 text-right">
        {new Date(data.date).toLocaleDateString()}
      </div>

      <Handle type="source" position={Position.Bottom} className="w-16 !bg-gray-400" />
    </div>
  );
};

export default memo(CommitNode);
