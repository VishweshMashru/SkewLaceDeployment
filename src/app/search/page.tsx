"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Search, Package, QrCode, Box, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

const statusColors: Record<string, string> = {
  available:  "bg-emerald-50 text-emerald-700",
  packed:     "bg-amber-50 text-amber-700",
  dispatched: "bg-blue-50 text-blue-700",
  open:       "bg-emerald-50 text-emerald-700",
  sealed:     "bg-amber-50 text-amber-700",
};

function SearchResults({ q }: { q: string }) {
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!q.trim()) { setResults(null); return; }
    setLoading(true);
    const timer = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(q)}`)
        .then(r => r.json())
        .then(data => {
          if (data.error) { setResults({ products: [], labels: [], cartons: [] }); }
          else { setResults(data); }
          setLoading(false);
        })
        .catch(() => { setResults({ products: [], labels: [], cartons: [] }); setLoading(false); });
    }, 250);
    return () => clearTimeout(timer);
  }, [q]);

  const total = results
    ? (results.products?.length ?? 0) + (results.labels?.length ?? 0) + (results.cartons?.length ?? 0)
    : 0;

  if (!q.trim()) return (
    <div className="text-center py-12 text-slate-400">
      <Search size={36} className="mx-auto mb-3 opacity-40" />
      <p className="text-sm">Search by product name, SKU, label ID, carton number…</p>
    </div>
  );

  if (loading) return (
    <div className="flex justify-center py-10">
      <div className="w-6 h-6 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
    </div>
  );

  if (results && total === 0) return (
    <div className="text-center py-12 text-slate-400">
      <p className="text-sm">No results for <strong className="text-slate-600">&ldquo;{q}&rdquo;</strong></p>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Products */}
      {results?.products.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <Package size={13} /> Products ({results.products.length})
          </h2>
          <div className="space-y-2">
            {results.products.map((p: any) => (
              <Link key={p.id} href="/products"
                className="bg-white rounded-xl border border-slate-200 px-4 py-3 flex items-center gap-3 hover:shadow-sm transition-all">
                <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Package size={14} className="text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-800 text-sm">{p.name}</p>
                  <div className="flex gap-2 mt-0.5 flex-wrap">
                    <span className="text-xs font-mono text-blue-600">{p.sku}</span>
                    {p.designNumber && <span className="text-xs text-slate-400">Design {p.designNumber}</span>}
                    {p.colorCategory && <span className="text-xs text-slate-400">{p.colorCategory}</span>}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Labels */}
      {results?.labels.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <QrCode size={13} /> Labels ({results.labels.length})
          </h2>
          <div className="space-y-2">
            {results.labels.map((row: any) => (
              <Link key={row.fg.id} href={`/finished-goods/${row.fg.id}`}
                className="bg-white rounded-xl border border-slate-200 px-4 py-3 flex items-center gap-3 hover:shadow-sm transition-all">
                <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <QrCode size={14} className="text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-800 text-sm">{row.product?.name ?? "Unknown"}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-xs font-mono text-slate-500">{row.fg.id}</span>
                    <span className="text-xs text-slate-400">{row.fg.quantity} pcs</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${statusColors[row.fg.status]}`}>
                      {row.fg.status}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Cartons */}
      {results?.cartons.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <Box size={13} /> Cartons ({results.cartons.length})
          </h2>
          <div className="space-y-2">
            {results.cartons.map((c: any) => (
              <Link key={c.id} href={`/cartons/${c.id}`}
                className="bg-white rounded-xl border border-slate-200 px-4 py-3 flex items-center gap-3 hover:shadow-sm transition-all">
                <div className="w-8 h-8 bg-violet-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Box size={14} className="text-violet-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-mono font-semibold text-slate-800 text-sm">{c.cartonNumber}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-slate-400">{c.totalPieces} pcs</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${statusColors[c.status]}`}>
                      {c.status}
                    </span>
                    {c.notes && <span className="text-xs text-slate-400 truncate">{c.notes}</span>}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function SearchPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-slate-800">Search</h1>

      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          ref={inputRef}
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="SKU, product name, label ID, carton number…"
          className="w-full border border-slate-200 rounded-2xl pl-10 pr-10 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm"
        />
        {q && (
          <button onClick={() => setQ("")}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
            <X size={16} />
          </button>
        )}
      </div>

      <SearchResults q={q} />
    </div>
  );
}

export default function SearchPageWrapper() {
  return (
    <Suspense>
      <SearchPage />
    </Suspense>
  );
}