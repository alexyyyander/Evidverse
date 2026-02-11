import AuthGuard from "@/components/auth/AuthGuard";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <AuthGuard>{children}</AuthGuard>;
}

