"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Package, Box, QrCode, Search } from "lucide-react";

const navItems = [
  { href: "/products",       label: "Products", icon: Package },
  { href: "/finished-goods", label: "Labels",   icon: QrCode  },
  { href: "/cartons",        label: "Cartons",  icon: Box     },
  { href: "/search",         label: "Search",   icon: Search  },
];

export default function Nav() {
  const pathname = usePathname();
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-2xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          <Link href="/" className="flex items-center gap-2 font-bold text-blue-600 text-lg">
            <Box size={22} />
            CartonTrack
          </Link>
          <nav className="flex items-center gap-1">
            {navItems.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  pathname.startsWith(href)
                    ? "bg-blue-50 text-blue-600"
                    : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                }`}
              >
                <Icon size={15} />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
}
