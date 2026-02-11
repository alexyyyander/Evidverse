"use client";

export default function PreviewPanel({ videoUrl }: { videoUrl: string | null }) {
  return (
    <div className="flex-1 bg-black flex items-center justify-center relative">
      {videoUrl ? (
        <video src={videoUrl} controls className="max-h-full max-w-full" autoPlay />
      ) : (
        <div className="text-muted-foreground">Select a clip to preview</div>
      )}
    </div>
  );
}

