"use client";
import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, QrCode, X, Printer, ExternalLink, Layers, ChevronDown, ChevronUp, Filter } from "lucide-react";
import Link from "next/link";
import QRDisplay, { type QRDisplayHandle } from "@/components/QRDisplay";
import { printFGLabel } from "@/lib/print";
import type { Product } from "@/db/schema";

const schema = z.object({
  productId: z.string().min(1, "Select a product"),
  trackingType: z.enum(["piece", "dozen", "manual"]),
  quantity: z.string().optional(),
});
type FormData = { productId: string; trackingType: "piece" | "dozen" | "manual"; quantity?: string };

const statusColors: Record<string, string> = {
  available:  "bg-emerald-50 text-emerald-700 border-emerald-200",
  packed:     "bg-amber-50 text-amber-700 border-amber-200",
  dispatched: "bg-blue-50 text-blue-700 border-blue-200",
};

function formatDateGroup(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const d = date.toDateString();
  if (d === today.toDateString()) return "Today";
  if (d === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
}

function groupByDate(items: any[]) {
  const groups: Record<string, any[]> = {};
  for (const item of items) {
    const key = new Date(item.fg.createdAt).toDateString();
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  }
  return groups;
}

export default function FinishedGoodsPage() {
  const [items, setItems]           = useState<any[]>([]);
  const [products, setProducts]     = useState<Product[]>([]);
  const [showForm, setShowForm]     = useState(false);
  const [loading, setLoading]       = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [newItem, setNewItem]       = useState<any>(null);
  const [error, setError]           = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [productFilter, setProductFilter] = useState<string>("all");
  const [showFilters, setShowFilters]   = useState(false);
  const [collapsedDates, setCollapsedDates] = useState<Set<string>>(new Set());
  const qrRef = useRef<QRDisplayHandle>(null);
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { trackingType: "dozen" },
  });
  const trackingType = watch("trackingType");

  async function fetchData() {
    const [fgRes, pRes] = await Promise.all([fetch("/api/finished-goods"), fetch("/api/products")]);
    const fgData = await fgRes.json();
    setItems(Array.isArray(fgData) ? fgData : []);
    setProducts(await pRes.json());
    setLoading(false);
  }
  useEffect(() => { fetchData(); }, []);

  async function onSubmit(data: FormData) {
    setSubmitting(true); setError("");
    try {
      const qty = data.trackingType === "piece" ? 1 : data.trackingType === "dozen" ? 12 : parseInt(data.quantity || "0", 10);
      if (data.trackingType === "manual" && (!qty || qty < 1)) { setError("Enter a valid quantity"); setSubmitting(false); return; }
      const res = await fetch("/api/finished-goods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, quantity: qty }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Failed"); }
      setNewItem(await res.json());
      reset(); fetchData();
    } catch (e: any) { setError(e.message); }
    finally { setSubmitting(false); }
  }

  function handlePrint() {
    if (!newItem) return;
    printFGLabel({
      productName: newItem.product?.name ?? "",
      designNumber: newItem.product?.designNumber,
      sku: newItem.product?.sku,
      colorCategory: newItem.product?.colorCategory,
      quantity: newItem.quantity,
      id: newItem.id,
      dataUrl: qrRef.current?.getDataUrl() ?? null,
      imageUrl: newItem.product?.imageUrl,
    });
  }

  function toggleDate(key: string) {
    setCollapsedDates(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  // Apply filters
  const filtered = items.filter(item => {
    if (statusFilter !== "all" && item.fg.status !== statusFilter) return false;
    if (productFilter !== "all" && item.fg.productId !== productFilter) return false;
    return true;
  });

  const grouped = groupByDate(filtered);
  const dateKeys = Object.keys(grouped); // already sorted newest-first from API

  const activeFilters = (statusFilter !== "all" ? 1 : 0) + (productFilter !== "all" ? 1 : 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-bold text-slate-800">Labels</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowFilters(!showFilters)}
            className={"flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors " +
              (activeFilters > 0 ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200")}>
            <Filter size={14} />
            {activeFilters > 0 ? activeFilters + " Filter" + (activeFilters > 1 ? "s" : "") : "Filter"}
          </button>
          <Link href="/finished-goods/bulk"
            className="flex items-center gap-1.5 bg-slate-100 text-slate-700 px-3 py-2 rounded-xl text-sm font-medium hover:bg-slate-200 transition-colors">
            <Layers size={15} />
            <span className="hidden sm:inline">Bulk</span>
          </Link>
          <button onClick={() => { setShowForm(!showForm); setNewItem(null); }}
            className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors">
            {showForm ? <X size={16} /> : <Plus size={16} />}
            {showForm ? "Cancel" : "New"}
          </button>
        </div>
      </div>

      {/* Filter bar */}
      {showFilters && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="all">All statuses</option>
                <option value="available">Available</option>
                <option value="packed">Packed</option>
                <option value="dispatched">Dispatched</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Product</label>
              <select value={productFilter} onChange={e => setProductFilter(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="all">All products</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>
          {activeFilters > 0 && (
            <button onClick={() => { setStatusFilter("all"); setProductFilter("all"); }}
              className="text-xs text-slate-500 hover:text-red-500 transition-colors">
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* New label form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <h2 className="font-semibold text-slate-700 mb-4">Generate QR Label</h2>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Product *</label>
              <select {...register("productId")}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white">
                <option value="">Select product...</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
              </select>
              {errors.productId && <p className="text-red-500 text-xs mt-1">{errors.productId.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-2">Tracking Type *</label>
              <div className="grid grid-cols-3 gap-2">
                {(["piece", "dozen", "manual"] as const).map(type => (
                  <label key={type} className="cursor-pointer">
                    <input type="radio" {...register("trackingType")} value={type} className="sr-only" />
                    <div className={"border-2 rounded-xl p-2.5 text-center text-sm font-medium transition-colors " +
                      (trackingType === type ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-200 text-slate-600 hover:border-slate-300")}>
                      {type === "piece" ? "1 Piece" : type === "dozen" ? "1 Dozen" : "Manual"}
                    </div>
                  </label>
                ))}
              </div>
            </div>
            {trackingType === "manual" && (
              <input type="number" {...register("quantity")} placeholder="Enter quantity" min={1}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            )}
            {error && <p className="text-red-500 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</p>}
            <button type="submit" disabled={submitting}
              className="w-full bg-emerald-600 text-white py-2.5 rounded-xl font-medium hover:bg-emerald-700 disabled:opacity-60 transition-colors">
              {submitting ? "Generating..." : "Generate QR Label"}
            </button>
          </form>
        </div>
      )}

      {/* New label result */}
      {newItem && (
        <div className="bg-white rounded-2xl border-2 border-emerald-300 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-emerald-700">✓ Label Created!</h2>
            <div className="flex gap-2">
              <button onClick={handlePrint}
                className="flex items-center gap-1.5 text-sm bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors">
                <Printer size={14} /> Print
              </button>
              <Link href={"/finished-goods/" + newItem.id}
                className="flex items-center gap-1.5 text-sm bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors">
                <ExternalLink size={14} /> View
              </Link>
            </div>
          </div>
          <div className="flex flex-col items-center gap-3">
            <p className="font-bold text-slate-800 text-sm">{newItem.product?.name}</p>
            <QRDisplay ref={qrRef} value={baseUrl + "/finished-goods/" + newItem.id} size={160} />
            <p className="text-2xl font-black text-blue-600">{newItem.quantity} pcs</p>
            <p className="text-xs text-slate-500 font-mono">{newItem.id}</p>
          </div>
        </div>
      )}

      {/* Labels list grouped by date */}
      {loading ? (
        <div className="text-center text-slate-400 py-8">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <QrCode size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500">{activeFilters > 0 ? "No labels match your filters." : "No labels yet."}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {dateKeys.map(dateKey => {
            const dayItems = grouped[dateKey];
            const label = formatDateGroup(dayItems[0].fg.createdAt);
            const isCollapsed = collapsedDates.has(dateKey);
            return (
              <div key={dateKey}>
                <button onClick={() => toggleDate(dateKey)}
                  className="flex items-center justify-between w-full px-1 mb-2">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    {label} <span className="font-normal normal-case">({dayItems.length} label{dayItems.length !== 1 ? "s" : ""})</span>
                  </span>
                  {isCollapsed ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronUp size={14} className="text-slate-400" />}
                </button>
                {!isCollapsed && (
                  <div className="space-y-2">
                    {dayItems.map((item: any) => (
                      <Link key={item.fg.id} href={"/finished-goods/" + item.fg.id}
                        className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-3 hover:shadow-sm transition-all active:scale-[0.99] block">
                        {item.product?.imageUrl ? (
                          <img src={item.product.imageUrl} className="w-10 h-10 rounded-xl object-cover flex-shrink-0" alt={item.product.name} />
                        ) : (
                          <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center flex-shrink-0">
                            <QrCode size={18} className="text-emerald-600" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-800 text-sm truncate">{item.product?.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-slate-500">{item.fg.quantity} pcs</span>
                            <span className={"text-xs px-2 py-0.5 rounded-full border " + (statusColors[item.fg.status] ?? "")}>
                              {item.fg.status}
                            </span>
                          </div>
                        </div>
                        <span className="text-slate-300 text-xs font-mono hidden sm:block">{item.fg.id.slice(-8)}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
