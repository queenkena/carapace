"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "./Logo";
import { ConnectWallet } from "./ConnectWallet";
import { clsx } from "@/lib/utils";

const nav = [
  { href: "/swap", label: "Swap" },
  { href: "/liquidity", label: "Liquidity" },
  { href: "/mev", label: "MEV Feed" },
];

export function Header() {
  const path = usePathname();

  return (
    <header className="border-b border-arc-border bg-arc-dark/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center">
            <Logo size={28} withText />
          </Link>
          <nav className="flex items-center gap-1">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                  path === item.href
                    ? "text-white bg-white/10"
                    : "text-arc-muted hover:text-white hover:bg-white/5"
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <ConnectWallet />
      </div>
    </header>
  );
}
