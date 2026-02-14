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
import { LANG_LABEL, type Lang } from "@/lib/i18n";
import { useI18n } from "@/lib/i18nContext";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const token = useAuthToken();
  const meQuery = useMe();
  const { lang, setLang, t } = useI18n();
  
  const navItems = [
    { name: t("nav.home"), path: "/" },
    { name: t("nav.discover"), path: "/discover" },
    { name: t("nav.projects"), path: "/projects" },
    { name: t("nav.publish"), path: "/publish" },
  ];

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-card/60 backdrop-blur">
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
            <DropdownMenu>
              <DropdownMenuTrigger>
                <Button variant="secondary" size="sm">
                  {LANG_LABEL[lang]}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {(["en", "zh", "ja"] as Lang[]).map((l) => (
                  <DropdownMenuItem key={l} onSelect={() => setLang(l)}>
                    {LANG_LABEL[l]}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            {typeof token !== "string" || token.length === 0 ? (
              <div className="flex items-center gap-2">
                <Link href="/login">
                  <Button variant="secondary" size="sm">
                    {t("auth.login")}
                  </Button>
                </Link>
                <Link href="/register">
                  <Button size="sm">{t("auth.signup")}</Button>
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
                      {t("menu.profile")}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() => {
                        clearToken();
                        queryClient.removeQueries({ queryKey: ["me"] });
                        router.push("/login");
                      }}
                    >
                      {t("menu.logout")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </div>
              </DropdownMenu>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/login">
                  <Button variant="secondary" size="sm">
                    {t("auth.login")}
                  </Button>
                </Link>
                <Link href="/register">
                  <Button size="sm">{t("auth.signup")}</Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </PageContainer>
    </nav>
  );
}
