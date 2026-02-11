import Spinner from "@/components/ui/spinner";

export default function Loading() {
  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center">
      <Spinner size={22} />
    </div>
  );
}

