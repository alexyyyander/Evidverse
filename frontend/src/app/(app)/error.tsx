"use client";

import ErrorState from "@/components/ui/error-state";
import Button from "@/components/ui/button";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4">
      <div className="w-full max-w-lg">
        <ErrorState title="Page crashed" description={error.message} />
        <div className="mt-4 flex justify-end">
          <Button onClick={() => reset()}>Try again</Button>
        </div>
      </div>
    </div>
  );
}

