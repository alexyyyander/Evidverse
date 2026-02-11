"use client";

import ErrorState from "@/components/ui/error-state";
import Button from "@/components/ui/button";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-lg">
        <ErrorState title="Editor crashed" description={error.message} />
        <div className="mt-4 flex justify-end">
          <Button onClick={() => reset()}>Try again</Button>
        </div>
      </div>
    </div>
  );
}

