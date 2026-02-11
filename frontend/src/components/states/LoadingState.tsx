import Spinner from "@/components/ui/spinner";

export default function LoadingState({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
      <div className="flex items-center gap-3 text-muted-foreground">
        <Spinner size={22} />
        <span className="text-sm">{label || "Loading..."}</span>
      </div>
    </div>
  );
}
