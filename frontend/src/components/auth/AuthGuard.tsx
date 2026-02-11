"use client";

import { ReactNode, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Spinner from "@/components/ui/spinner";
import { clearToken, getToken } from "@/lib/api/auth";
import { useMe } from "@/lib/queries/useMe";
import { toast } from "@/components/ui/toast";

export default function AuthGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const token = getToken();
  const meQuery = useMe();

  const next = `${pathname}${searchParams?.toString() ? `?${searchParams.toString()}` : ""}`;
  const loginUrl = `/login?next=${encodeURIComponent(next)}`;

  useEffect(() => {
    if (typeof token !== "string" || token.length === 0) {
      router.replace(loginUrl);
    }
  }, [loginUrl, router, token]);

  useEffect(() => {
    if (!meQuery.isError) return;
    clearToken();
    toast({ title: "Please log in", description: "Your session is invalid or expired.", variant: "destructive" });
    router.replace(loginUrl);
  }, [loginUrl, meQuery.isError, router]);

  if (typeof token !== "string" || token.length === 0) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center">
        <Spinner size={22} />
      </div>
    );
  }

  if (meQuery.isLoading) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center">
        <Spinner size={22} />
      </div>
    );
  }

  if (meQuery.isError) {
    return null;
  }

  return <>{children}</>;
}

