"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Package, Box, QrCode, Search, BarChart3, LogOut, ShieldCheck, Archive } from "lucide-react";
import { useAppSession } from "./SessionProvider";
import { signOut } from "next-auth/react";

const navItems = [
  { href: "/inventory",      label: "Inventory", icon: BarChart3 },
  { href: "/products",       label: "Products",  icon: Package   },
  { href: "/finished-goods", label: "Labels",    icon: QrCode    },
  { href: "/cartons",        label: "Cartons",   icon: Box       },
  { href: "/batches",   label: "Batches",   icon: Archive  },
  { href: "/search",    label: "Search",    icon: Search   },
];

const roleColors: Record<string, string> = {
  admin:  "bg-red-50 text-red-600",
  staff:  "bg-blue-50 text-blue-600",
  viewer: "bg-slate-100 text-slate-500",
};

export default function Nav() {
  const pathname = usePathname();
  const router   = useRouter();
  const { user, role, isAdmin, isPending } = useAppSession();

  // Hide nav on login page
  if (pathname === "/login") return null;

  // Hide nav entirely for unauthenticated users on public scan pages
  // (buyers scanning QR codes shouldn't see the full app nav)
  if (!isPending && !user) return null;

  async function handleSignOut() {
    await signOut({ redirect: false });
    router.push("/login");
  }

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-2xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          <Link href="/" className="flex items-center gap-2 font-bold text-blue-600 text-lg flex-shrink-0">
            <Box size={20} />
            <span className="hidden sm:inline">CartonTrack</span>
            <span className="sm:hidden">CT</span>
          </Link>

          <nav className="flex items-center gap-0.5">
            {navItems.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href}
                className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  pathname.startsWith(href)
                    ? "bg-blue-50 text-blue-600"
                    : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                }`}>
                <Icon size={14} />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            ))}
            {isAdmin && (
              <Link href="/admin"
                className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  pathname.startsWith("/admin") ? "bg-red-50 text-red-600" : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                }`}>
                <ShieldCheck size={14} />
                <span className="hidden sm:inline">Admin</span>
              </Link>
            )}
          </nav>

          <div className="flex items-center gap-2 flex-shrink-0">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium hidden sm:inline ${roleColors[role]}`}>
              {role}
            </span>
            <button onClick={handleSignOut}
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              title="Sign out">
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
