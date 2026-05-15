import Link from "next/link";
import { Package, QrCode, Box, ArrowRight } from "lucide-react";

const sections = [
  {
    href: "/products",
    icon: Package,
    title: "Products / SKUs",
    desc: "Create and manage your product catalog",
    color: "bg-blue-50 text-blue-600 border-blue-100",
    btn: "bg-blue-600 hover:bg-blue-700",
  },
  {
    href: "/finished-goods",
    icon: QrCode,
    title: "Finished Goods Labels",
    desc: "Generate QR labels for pieces, dozens, or custom quantities",
    color: "bg-emerald-50 text-emerald-600 border-emerald-100",
    btn: "bg-emerald-600 hover:bg-emerald-700",
  },
  {
    href: "/cartons",
    icon: Box,
    title: "Cartons",
    desc: "Pack finished goods into cartons and track shipments",
    color: "bg-violet-50 text-violet-600 border-violet-100",
    btn: "bg-violet-600 hover:bg-violet-700",
  },
];

export default function HomePage() {
  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <Box size={28} />
          <h1 className="text-2xl font-bold">CartonTrack</h1>
        </div>
        <p className="text-blue-100 text-sm">
          QR-based finished goods tracking for your textile factory. Create labels, pack cartons, dispatch shipments.
        </p>
      </div>

      <div className="grid gap-4">
        {sections.map(({ href, icon: Icon, title, desc, color, btn }) => (
          <Link
            key={href}
            href={href}
            className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center gap-4 hover:shadow-md transition-all active:scale-[0.99]"
          >
            <div className={`w-12 h-12 rounded-xl border flex items-center justify-center flex-shrink-0 ${color}`}>
              <Icon size={22} />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-semibold text-slate-800">{title}</h2>
              <p className="text-sm text-slate-500 mt-0.5">{desc}</p>
            </div>
            <ArrowRight size={18} className="text-slate-400 flex-shrink-0" />
          </Link>
        ))}
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
        <strong>Quick tip:</strong> Scan any QR code to instantly see the item&apos;s status and carton details from any phone.
      </div>
    </div>
  );
}
