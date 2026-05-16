"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Package, Box, Truck, RefreshCw, BarChart3 } from "lucide-react";

interface InventoryRow {
  product_id: string;
  name: string;
  sku: string;
  design_number: string | null;
  color_category: string | null;
  available_labels: string;
  packed_labels: string;
  dispatched_labels: string;
  available_pieces: string;
  packed_pieces: string;
  dispatched_pieces: string;
}

export default function InventoryPage() {
  const [rows, setRows]       = useState<InventoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function fetchInventory() {
    const res = await fetch("/api/inventory");
    const data = await res.json();
    setRows(Array.isArray(data) ? data : []);
    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => { fetchInventory(); }, []);

  function handleRefresh() {
    setRefreshing(true);
    fetchInventory();
  }

  const totalAvailable  = rows.reduce((s, r) => s + parseInt(r.available_pieces  || "0"), 0);
  const totalPacked     = rows.reduce((s, r) => s + parseInt(r.packed_pieces     || "0"), 0);
  const totalDispatched = rows.reduce((s, r) => s + parseInt(r.dispatched_pieces || "0"), 0);

  const productsWithStock = rows.filter(r => parseInt(r.available_pieces || "0") > 0);
  const productsEmpty     = rows.filter(r => parseInt(r.available_pieces || "0") === 0);

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 size={22} className="text-blue-600" />
          <h1 className="text-xl font-bold text-slate-800">Inventory</h1>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-1.5 text-sm bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-60"
        >
          <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 text-center">
          <p className="text-2xl font-black text-emerald-600">{totalAvailable}</p>
          <p className="text-xs text-slate-500 mt-1">Available</p>
          <p className="text-xs text-slate-400">in factory</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4 text-center">
          <p className="text-2xl font-black text-amber-500">{totalPacked}</p>
          <p className="text-xs text-slate-500 mt-1">Packed</p>
          <p className="text-xs text-slate-400">in cartons</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4 text-center">
          <p className="text-2xl font-black text-blue-600">{totalDispatched}</p>
          <p className="text-xs text-slate-500 mt-1">Dispatched</p>
          <p className="text-xs text-slate-400">shipped out</p>
        </div>
      </div>

      {/* Available stock */}
      {productsWithStock.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide px-1">
            Available in Factory ({productsWithStock.length} products)
          </h2>
          {productsWithStock.map((row) => (
            <ProductCard key={row.product_id} row={row} />
          ))}
        </div>
      )}

      {/* All clear */}
      {productsWithStock.length === 0 && rows.length > 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center">
          <Package size={32} className="mx-auto text-emerald-400 mb-2" />
          <p className="font-semibold text-emerald-700">All packed or dispatched</p>
          <p className="text-sm text-emerald-600 mt-1">No finished goods sitting loose in the factory</p>
        </div>
      )}

      {/* Products with zero available */}
      {productsEmpty.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide px-1">
            No Stock Available ({productsEmpty.length})
          </h2>
          {productsEmpty.map((row) => (
            <div key={row.product_id}
              className="bg-white rounded-xl border border-slate-100 px-4 py-3 flex items-center justify-between opacity-60">
              <div>
                <p className="text-sm font-medium text-slate-700">{row.name}</p>
                <div className="flex gap-2 mt-0.5">
                  <span className="text-xs font-mono text-slate-400">{row.sku}</span>
                  {row.design_number && <span className="text-xs text-slate-400">Design {row.design_number}</span>}
                  {row.color_category && <span className="text-xs text-slate-400">{row.color_category}</span>}
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400">
                  {parseInt(row.dispatched_pieces || "0")} dispatched
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {rows.length === 0 && (
        <div className="text-center py-12">
          <Package size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500">No products yet.</p>
          <Link href="/products" className="text-blue-600 text-sm mt-2 inline-block hover:underline">
            Create a product
          </Link>
        </div>
      )}
    </div>
  );
}

function ProductCard({ row }: { row: InventoryRow }) {
  const available  = parseInt(row.available_pieces  || "0");
  const packed     = parseInt(row.packed_pieces     || "0");
  const dispatched = parseInt(row.dispatched_pieces || "0");
  const total      = available + packed + dispatched;
  const availablePct = total > 0 ? (available / total) * 100 : 0;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-slate-800">{row.name}</h3>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="text-xs font-mono text-blue-600">{row.sku}</span>
            {row.design_number && (
              <span className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">Design {row.design_number}</span>
            )}
            {row.color_category && (
              <span className="text-xs bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded">{row.color_category}</span>
            )}
          </div>
        </div>
        <div className="text-right flex-shrink-0 ml-3">
          <p className="text-2xl font-black text-emerald-600">{available}</p>
          <p className="text-xs text-slate-400">pcs available</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-3">
        <div
          className="h-full bg-emerald-400 rounded-full transition-all"
          style={{ width: `${availablePct}%` }}
        />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-emerald-50 rounded-lg py-2">
          <p className="text-sm font-bold text-emerald-700">{available}</p>
          <p className="text-xs text-emerald-600">Available</p>
          <p className="text-xs text-slate-400">{row.available_labels} labels</p>
        </div>
        <div className="bg-amber-50 rounded-lg py-2">
          <p className="text-sm font-bold text-amber-600">{packed}</p>
          <p className="text-xs text-amber-600">Packed</p>
          <p className="text-xs text-slate-400">{row.packed_labels} labels</p>
        </div>
        <div className="bg-blue-50 rounded-lg py-2">
          <p className="text-sm font-bold text-blue-600">{dispatched}</p>
          <p className="text-xs text-blue-600">Dispatched</p>
          <p className="text-xs text-slate-400">{row.dispatched_labels} labels</p>
        </div>
      </div>
    </div>
  );
}
