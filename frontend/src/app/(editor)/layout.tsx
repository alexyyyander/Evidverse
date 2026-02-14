export default function EditorLayout({ children }: { children: React.ReactNode }) {
  // AuthGuard removed to allow public access or custom redirect
  return (
    <main id="main-content" className="flex-1">
      {children}
    </main>
  );
}
