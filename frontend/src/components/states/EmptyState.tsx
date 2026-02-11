import { ReactNode } from "react";

export default function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="text-center py-20 bg-slate-900/50 rounded-xl border border-slate-800 border-dashed">
      <h3 className="text-xl text-slate-200 mb-2">{title}</h3>
      {description ? <p className="text-slate-500">{description}</p> : null}
      {action ? <div className="mt-6 flex items-center justify-center">{action}</div> : null}
    </div>
  );
}

