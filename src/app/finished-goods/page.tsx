"use client";
import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, QrCode, X, Printer, ExternalLink, Layers } from "lucide-react";
import Link from "next/link";
import QRDisplay from "@/components/QRDisplay";
import type { Product } from "@/db/schema";

const schema = z.object({
  productId: z.string().min(1, "Select a product"),
  trackingType: z.enum(["piece", "dozen", "manual"]),
  quantity: z.string().optional(),
});

type FormData = {
  productId: string;
  trackingType: "piece" | "dozen" | "manual";
  quantity?: string;
};

const statusColors: Record<string, string> = {
  available: "bg-emerald-50 text-emerald-700 border-emerald-200",
  packed: "bg-amber-50 text-amber-700 border-amber-200",
  dispatched: "bg-blue-50 text-blue-700 border-blue-200",
};

export default function FinishedGoodsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [newItem, setNewItem] = useState<any>(null);
  const [error, setError] = useState("");
  const printRef = useRef<HTMLDivElement>(null);

  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { trackingType: "dozen" },
  });

  const trackingType = watch("trackingType");

  async function fetchData() {
    const [fgRes, pRes] = await Promise.all([
      fetch("/api/finished-goods"),
      fetch("/api/products"),
    ]);
    setItems(await fgRes.json());
    setProducts(await pRes.json());
    setLoading(false);
  }

  useEffect(() => { fetchData(); }, []);

  async function onSubmit(data: FormData) {
    setSubmitting(true);
    setError("");
    try {
      const qty =
        data.trackingType === "piece" ? 1
        : data.trackingType === "dozen" ? 12
        : parseInt(data.quantity || "0", 10);
      if (data.trackingType === "manual" && (!qty || qty < 1)) {
        setError("Enter a valid quantity");
        setSubmitting(false);
        return;
      }
      const res = await fetch("/api/finished-goods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, quantity: qty }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed");
      }
      const created = await res.json();
      setNewItem(created);
      reset();
      fetchData();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  function handlePrint() {
    const printContent = printRef.current;
    if (!printContent) return;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <html><head><title>Print Label</title>
      <style>
        body { font-family: sans-serif; padding: 20px; }
        .label { border: 2px solid #1d4ed8; border-radius: 12px; padding: 16px; display: inline-block; text-align: center; max-width: 240px; }
        .title { font-size: 14px; font-weight: bold; color: #1e3a5f; margin-bottom: 4px; }
        .qty { font-size: 20px; font-weight: 900; color: #1d4ed8; margin: 4px 0; }
        .sub { font-size: 11px; color: #64748b; }
        .id { font-size: 9px; color: #94a3b8; margin-top: 8px; font-family: monospace; }
      </style></head><body>
      ${printContent.innerHTML}
      <script>window.onload = () => { window.print(); window.close(); }</script>
      </body></html>
    `);
    win.document.close();
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-bold text-slate-800">Finished Goods Labels</h1>
        <div className="flex items-center gap-2">
          <Link
            href="/finished-goods/bulk"
            className="flex items-center gap-1.5 bg-slate-100 text-slate-700 px-3 py-2 rounded-xl text-sm font-medium hover:bg-slate-200 transition-colors"
          >
            <Layers size={15} />
            <span className="hidden sm:inline">Bulk Print</span>
          </Link>
          <button
            onClick={() => { setShowForm(!showForm); setNewItem(null); }}
            className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors"
          >
            {showForm ? <X size={16} /> : <Plus size={16} />}
            {showForm ? "Cancel" : "New Label"}
          </button>
        </div>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <h2 className="font-semibold text-slate-700 mb-4">Generate QR Label</h2>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Product *</label>
              <select
                {...register("productId")}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              >
                <option value="">Select product...</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                ))}
              </select>
              {errors.productId && <p className="text-red-500 text-xs mt-1">{errors.productId.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-2">Tracking Type *</label>
              <div className="grid grid-cols-3 gap-2">
                {(["piece", "dozen", "manual"] as const).map((type) => (
                  <label key={type} className="cursor-pointer">
                    <input type="radio" {...register("trackingType")} value={type} className="sr-only" />
                    <div className={`border-2 rounded-xl p-2.5 text-center text-sm font-medium transition-colors ${
                      trackingType === type
                        ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                        : "border-slate-200 text-slate-600 hover:border-slate-300"
                    }`}>
                      {type === "piece" ? "1 Piece" : type === "dozen" ? "1 Dozen (12)" : "Manual"}
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {trackingType === "manual" && (
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Quantity *</label>
                <input
                  type="number"
                  {...register("quantity")}
                  placeholder="Enter quantity"
                  min={1}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                {errors.quantity && <p className="text-red-500 text-xs mt-1">{errors.quantity.message}</p>}
              </div>
            )}

            {error && <p className="text-red-500 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-emerald-600 text-white py-2.5 rounded-xl font-medium hover:bg-emerald-700 disabled:opacity-60 transition-colors"
            >
              {submitting ? "Generating..." : "Generate QR Label"}
            </button>
          </form>
        </div>
      )}

      {newItem && (
        <div className="bg-white rounded-2xl border-2 border-emerald-300 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-emerald-700">✓ Label Created!</h2>
            <div className="flex gap-2">
              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 text-sm bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors"
              >
                <Printer size={14} />
                Print
              </button>
              <Link
                href={`/finished-goods/${newItem.id}`}
                className="flex items-center gap-1.5 text-sm bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
              >
                <ExternalLink size={14} />
                View
              </Link>
            </div>
          </div>

          <div ref={printRef}>
            <div className="label flex flex-col items-center gap-3">
              <div className="text-center">
                <p className="font-bold text-slate-800 text-sm">{newItem.product?.name}</p>
                {newItem.product?.designNumber && (
                  <p className="text-xs text-slate-500">Design {newItem.product.designNumber}</p>
                )}
              </div>
              <QRDisplay value={`${baseUrl}/finished-goods/${newItem.id}`} size={160} />
              <div className="text-center">
                <p className="text-2xl font-black text-blue-600">{newItem.quantity} pcs</p>
                <p className="text-xs text-slate-500 font-mono mt-1">{newItem.id}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center text-slate-400 py-8">Loading...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-12">
          <QrCode size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500">No labels yet. Generate your first label above.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <h2 className="font-semibold text-slate-600 text-sm uppercase tracking-wide px-1">All Labels</h2>
          {items.map((item: any) => (
            <Link
              key={item.fg.id}
              href={`/finished-goods/${item.fg.id}`}
              className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-3 hover:shadow-sm transition-all active:scale-[0.99] block"
            >
              <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <QrCode size={18} className="text-emerald-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-800 text-sm truncate">{item.product?.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-slate-500">{item.fg.quantity} pcs</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${statusColors[item.fg.status]}`}>
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
}
