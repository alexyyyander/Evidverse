"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import PageContainer from "@/components/layout/PageContainer";
import { cn } from "@/lib/cn";

export default function Navbar() {
  const pathname = usePathname();
  
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
             <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold">
                U
             </div>
          </div>
        </div>
      </PageContainer>
    </nav>
  );
}
