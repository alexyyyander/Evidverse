"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const pathname = usePathname();
  
  const navItems = [
    { name: "Home", path: "/" },
    { name: "Discover", path: "/discover" },
    { name: "My Projects", path: "/projects" },
  ];

  return (
    <nav className="bg-slate-900 border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="text-xl font-bold text-indigo-500">
              Vidgit
            </Link>
            <div className="ml-10 flex items-baseline space-x-4">
              {navItems.map((item) => {
                const isActive = pathname === item.path;
                return (
                  <Link
                    key={item.name}
                    href={item.path}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-slate-800 text-white"
                        : "text-slate-300 hover:bg-slate-800 hover:text-white"
                    }`}
                  >
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {/* Placeholder for User Profile / Login */}
             <div className="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold">
                U
             </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
