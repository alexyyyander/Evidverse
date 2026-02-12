"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import PageContainer from "@/components/layout/PageContainer";
import { cn } from "@/lib/cn";
import { clearToken } from "@/lib/api/auth";
import { useAuthToken } from "@/lib/auth/useAuthToken";
import { useMe } from "@/lib/queries/useMe";
import Spinner from "@/components/ui/spinner";
import Button from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useQueryClient } from "@tanstack/react-query";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const token = useAuthToken();
  const meQuery = useMe();
  
  const navItems = [
    { name: "Home", path: "/" },
    { name: "Discover", path: "/discover" },
    { name: "My Projects", path: "/projects" },
  ];

  return (
    <nav className="border-b border-border bg-card/60 backdrop-blur">
      <PageContainer>
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="text-xl font-bold text-primary">
              Vidgit
            </Link>
            <div className="ml-10 flex items-baseline space-x-4">
              {navItems.map((item) => {
                const isActive = pathname === item.path;
                return (
                  <Link
                    key={item.name}
                    href={item.path}
                    className={cn(
                      "px-3 py-2 rounded-md text-sm font-medium transition-colors",
                      isActive
                        ? "bg-secondary text-secondary-foreground"
                        : "text-muted-foreground hover:bg-secondary hover:text-secondary-foreground"
                    )}
                  >
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {typeof token !== "string" || token.length === 0 ? (
              <div className="flex items-center gap-2">
                <Link href="/login">
                  <Button variant="secondary" size="sm">
                    Log in
                  </Button>
                </Link>
                <Link href="/register">
                  <Button size="sm">Sign up</Button>
                </Link>
              </div>
            ) : meQuery.isLoading ? (
              <Spinner size={18} />
            ) : meQuery.data ? (
              <DropdownMenu>
                <div className="relative">
                  <DropdownMenuTrigger>
                    <button
                      type="button"
                      className="h-9 w-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold"
                      aria-label="User menu"
                    >
                      {meQuery.data.email.slice(0, 1).toUpperCase()}
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <div className="px-3 py-2 text-xs text-muted-foreground">{meQuery.data.email}</div>
                    <DropdownMenuItem onSelect={() => router.push(`/profile/${meQuery.data.id}`)}>
                      Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() => {
                        clearToken();
                        queryClient.removeQueries({ queryKey: ["me"] });
                        router.push("/login");
                      }}
                    >
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </div>
              </DropdownMenu>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/login">
                  <Button variant="secondary" size="sm">
                    Log in
                  </Button>
                </Link>
                <Link href="/register">
                  <Button size="sm">Sign up</Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </PageContainer>
    </nav>
  );
}
