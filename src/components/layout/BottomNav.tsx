"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Target, Trophy, FileEdit } from "lucide-react";

export default function BottomNav() {
  const pathname = usePathname();

  const links = [
    { name: "Pronósticos", href: "/", icon: Target },
    { name: "Inscribir", href: "/inscribir", icon: FileEdit },
    { name: "Ranking", href: "/leaderboard", icon: Trophy },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-panel border-t border-line z-50 pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around h-16">
        {links.map((link) => {
          // Coincidencia exacta para Inscribir/Ranking, o inicio genérico
          const isActive = pathname === link.href || (link.href === "/" && pathname === "/predictions");
          const Icon = link.icon;
          return (
            <Link
              key={link.name}
              href={link.href}
              className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
                isActive ? "text-brand" : "text-content-muted hover:text-content"
              }`}
            >
              <Icon size={20} className={isActive ? "text-brand" : ""} />
              <span className="text-[10px] font-semibold tracking-wide">{link.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
