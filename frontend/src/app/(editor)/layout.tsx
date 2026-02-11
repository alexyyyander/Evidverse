import AuthGuard from "@/components/auth/AuthGuard";

export default function EditorLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <main id="main-content" className="flex-1">
        {children}
      </main>
    </AuthGuard>
  );
}
