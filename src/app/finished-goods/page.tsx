"use client";
import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, QrCode, X, Printer, ExternalLink, Layers, ChevronDown, ChevronUp } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import QRDisplay, { type QRDisplayHandle } from "@/components/QRDisplay";
import { printFGLabel } from "@/lib/print";
import type { Product } from "@/db/schema";
import PrintOptionsModal from "@/components/PrintOptionsModal";

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

type StatusFilter = "all" | "available" | "packed" | "dispatched";

interface ProductGroup {
  productId: string;
  productName: string;
  sku: string;
  imageUrl: string | null;
  items: any[];
}

export default function FinishedGoodsPage() {
  const [items, setItems]             = useState<any[]>([]);
  const [products, setProducts]       = useState<Product[]>([]);
  const [showForm, setShowForm]       = useState(false);
  const [loading, setLoading]         = useState(true);
  const [submitting, setSubmitting]   = useState(false);
  const [newItem, setNewItem]         = useState<any>(null);
  const [error, setError]             = useState("");
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [collapsed, setCollapsed]     = useState<Set<string>>(new Set());
  const [confirmDeleteProduct, setConfirmDeleteProduct] = useState<string | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<string | null>(null);
  const qrRef = useRef<QRDisplayHandle>(null);
  const router = useRouter();
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
    setShowPrintModal(true);
  }

  function doPrint({ showBranding, size }: { showBranding: boolean; size: "full" | "qr-only" }) {
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
      showBranding,
      size,
    });
  }

  async function handleDeleteByProduct(productId: string) {
    if (confirmDeleteProduct !== productId) {
      setConfirmDeleteProduct(productId);
      return;
    }
    setDeletingProduct(productId);
    const res = await fetch("/api/finished-goods/delete-all", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, status: "available" }),
    });
    const data = await res.json();
    setConfirmDeleteProduct(null);
    setDeletingProduct(null);
    await fetchData();
  }

  function toggleCollapse(productId: string) {    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId); else next.add(productId);
      return next;
    });
  }

  // Filter and group by product
  const filtered = items.filter(item => statusFilter === "all" || item.fg.status === statusFilter);

  const groups: ProductGroup[] = [];
  const seen = new Map<string, number>();
  for (const item of filtered) {
    const pid = item.fg.productId;
    if (!seen.has(pid)) {
      seen.set(pid, groups.length);
      groups.push({
        productId: pid,
        productName: item.product?.name ?? "Unknown",
        sku: item.product?.sku ?? "",
        imageUrl: item.product?.imageUrl ?? null,
        items: [],
      });
    }
    groups[seen.get(pid)!].items.push(item);
  }

  const statusCounts = {
    all:        items.length,
    available:  items.filter(i => i.fg.status === "available").length,
    packed:     items.filter(i => i.fg.status === "packed").length,
    dispatched: items.filter(i => i.fg.status === "dispatched").length,
  };

  return (
    <div className="space-y-4">
      {showPrintModal && (
        <PrintOptionsModal
          title="Print Label"
          onPrint={doPrint}
          onClose={() => setShowPrintModal(false)}
        />
      )}
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-bold text-slate-800">Labels</h1>
        <div className="flex items-center gap-2">
          <Link href="/finished-goods/bulk"
            className="flex items-center gap-1.5 bg-slate-100 text-slate-700 px-3 py-2 rounded-xl text-sm font-medium hover:bg-slate-200 transition-colors">
            <Layers size={15} /><span className="hidden sm:inline">Bulk</span>
          </Link>
          <button onClick={() => { setShowForm(!showForm); setNewItem(null); }}
            className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors">
            {showForm ? <X size={16} /> : <Plus size={16} />}
            {showForm ? "Cancel" : "New"}
          </button>
        </div>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-1 bg-white border border-slate-200 rounded-2xl p-1">
        {(["all", "available", "packed", "dispatched"] as StatusFilter[]).map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`flex-1 py-1.5 rounded-xl text-xs font-medium transition-colors capitalize ${
              statusFilter === s ? "bg-blue-600 text-white" : "text-slate-500 hover:bg-slate-50"
            }`}>
            {s === "all" ? `All (${statusCounts.all})` : `${s.charAt(0).toUpperCase() + s.slice(1)} (${statusCounts[s]})`}
          </button>
        ))}
      </div>

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
            <div className="grid grid-cols-3 gap-2">
              {(["piece", "dozen", "manual"] as const).map(type => (
                <label key={type} className="cursor-pointer">
                  <input type="radio" {...register("trackingType")} value={type} className="sr-only" />
                  <div className={`border-2 rounded-xl p-2.5 text-center text-sm font-medium transition-colors ${
                    trackingType === type ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-200 text-slate-600"
                  }`}>
                    {type === "piece" ? "1 Piece" : type === "dozen" ? "1 Dozen" : "Manual"}
                  </div>
                </label>
              ))}
            </div>
            {trackingType === "manual" && (
              <input type="number" {...register("quantity")} placeholder="Quantity" min={1}
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
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-emerald-700">✓ Label Created!</h2>
            <div className="flex gap-2">
              <button onClick={handlePrint}
                className="flex items-center gap-1.5 text-sm bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg">
                <Printer size={14} /> Print
              </button>
              <Link href={"/finished-goods/" + newItem.id}
                className="flex items-center gap-1.5 text-sm bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg">
                <ExternalLink size={14} /> View
              </Link>
            </div>
          </div>
          <div className="flex flex-col items-center gap-2">
            <QRDisplay ref={qrRef} value={baseUrl + "/finished-goods/" + newItem.id} size={140} />
            <p className="font-bold text-slate-800 text-sm">{newItem.product?.name}</p>
            <p className="text-xl font-black text-blue-600">{newItem.quantity} pcs</p>
            <p className="text-xs text-slate-400 font-mono">{newItem.id}</p>
          </div>
        </div>
      )}

      {/* Labels grouped by product/SKU */}
      {loading ? (
        <div className="text-center py-8 text-slate-400">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <QrCode size={36} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500">{statusFilter !== "all" ? `No ${statusFilter} labels` : "No labels yet"}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map(group => {
            const isCollapsed = collapsed.has(group.productId);
            const statusBreakdown = {
              available:  group.items.filter(i => i.fg.status === "available").length,
              packed:     group.items.filter(i => i.fg.status === "packed").length,
              dispatched: group.items.filter(i => i.fg.status === "dispatched").length,
            };
            return (
              <div key={group.productId} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                {/* Folder header */}
                <button onClick={() => toggleCollapse(group.productId)}
                  className="w-full flex items-center gap-3 p-4 text-left hover:bg-slate-50 transition-colors">
                  {group.imageUrl ? (
                    <img src={group.imageUrl} className="w-11 h-11 rounded-xl object-cover flex-shrink-0" alt="" />
                  ) : (
                    <div className="w-11 h-11 bg-emerald-50 rounded-xl flex items-center justify-center flex-shrink-0">
                      <QrCode size={18} className="text-emerald-600" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 text-sm">{group.productName}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-xs font-mono text-blue-600">{group.sku}</span>
                      <span className="text-xs text-slate-400">{group.items.length} labels</span>
                      {statusBreakdown.available > 0 && <span className="text-xs text-emerald-600 font-medium">{statusBreakdown.available} available</span>}
                      {statusBreakdown.packed > 0 && <span className="text-xs text-amber-600">{statusBreakdown.packed} packed</span>}
                      {statusBreakdown.dispatched > 0 && <span className="text-xs text-blue-600">{statusBreakdown.dispatched} dispatched</span>}
                    </div>
                  </div>
                  {isCollapsed ? <ChevronDown size={16} className="text-slate-400 flex-shrink-0" /> : <ChevronUp size={16} className="text-slate-400 flex-shrink-0" />}
                </button>

                {/* Per-product delete available labels */}
                {statusBreakdown.available > 0 && (
                  <div className="px-4 pb-3 flex items-center justify-between border-b border-slate-100">
                    <p className="text-xs text-slate-400">Delete {statusBreakdown.available} available labels for this SKU</p>
                    <div className="flex items-center gap-2">
                      {confirmDeleteProduct === group.productId && (
                        <button onClick={() => setConfirmDeleteProduct(null)}
                          className="text-xs text-slate-400 hover:text-slate-600">Cancel</button>
                      )}
                      <button
                        onClick={e => { e.stopPropagation(); handleDeleteByProduct(group.productId); }}
                        disabled={deletingProduct === group.productId}
                        className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors flex-shrink-0 ${
                          confirmDeleteProduct === group.productId
                            ? "bg-red-600 text-white"
                            : "bg-red-50 text-red-500 hover:bg-red-100"
                        }`}>
                        {deletingProduct === group.productId ? "Deleting…"
                          : confirmDeleteProduct === group.productId ? "⚠️ Confirm delete"
                          : "Delete available"}
                      </button>
                    </div>
                  </div>
                )}

                {/* Labels inside folder */}
                {!isCollapsed && (
                  <div className="border-t border-slate-100 divide-y divide-slate-50">
                    {group.items.map((item: any) => (
                      <div key={item.fg.id}
                        onClick={() => router.push("/finished-goods/" + item.fg.id)}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 cursor-pointer transition-colors">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-slate-400">{item.fg.id.slice(-12)}</span>
                            <span className={"text-xs px-1.5 py-0.5 rounded-full border " + statusColors[item.fg.status]}>
                              {item.fg.status}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {new Date(item.fg.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                        <span className="text-sm font-semibold text-slate-700 flex-shrink-0">{item.fg.quantity} pcs</span>
                      </div>
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
