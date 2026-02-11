import Spinner from "@/components/ui/spinner";

export default function Loading() {
  return (
    <div className="h-screen flex items-center justify-center">
      <Spinner size={22} />
    </div>
  );
}

