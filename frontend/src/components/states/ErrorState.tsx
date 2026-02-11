export default function ErrorState({
  title,
  description,
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="rounded-xl border border-rose-900/40 bg-rose-950/30 px-4 py-3 text-sm text-rose-200">
      <div className="font-medium">{title || "Something went wrong"}</div>
      {description ? <div className="mt-1 text-rose-200/80">{description}</div> : null}
    </div>
  );
}

