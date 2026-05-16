"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, Printer, Layers, X, CheckCircle } from "lucide-react";
import QRCode from "qrcode";
import { printBulkLabels } from "@/lib/print";
import type { Product } from "@/db/schema";

interface GeneratedLabel {
  id: string;
  quantity: number;
  label: string;
}

interface BulkResult {
  created: GeneratedLabel[];
  product: Product;
}

export default function BulkPrintPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [productId, setProductId] = useState("");
  const [trackingType, setTrackingType] = useState<"piece" | "dozen" | "manual">("piece");
  const [manualQty, setManualQty] = useState("12");
  const [count, setCount] = useState("12");
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<BulkResult | null>(null);
  const [error, setError] = useState("");
  const [qrDataUrls, setQrDataUrls] = useState<Record<string, string>>({});
  const [renderingQrs, setRenderingQrs] = useState(false);
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  useEffect(() => {
    fetch("/api/products").then(r => r.json()).then(setProducts);
  }, []);

  // Render QR codes to data URLs whenever result changes
  useEffect(() => {
    if (!result) return;
    setRenderingQrs(true);
    const urls: Record<string, string> = {};
    const promises = result.created.map(label =>
      QRCode.toDataURL(`${baseUrl}/finished-goods/${label.id}`, {
        width: 140,
        margin: 1,
        color: { dark: "#1e3a5f", light: "#ffffff" },
      }).then(url => { urls[label.id] = url; })
    );
    Promise.all(promises).then(() => {
      setQrDataUrls(urls);
      setRenderingQrs(false);
    });
  }, [result, baseUrl]);

  const quantity =
    trackingType === "piece" ? 1
    : trackingType === "dozen" ? 12
    : parseInt(manualQty) || 1;

  async function handleGenerate() {
    if (!productId) { setError("Select a product"); return; }
    const n = parseInt(count);
    if (!n || n < 1 || n > 200) { setError("Count must be 1–200"); return; }
    setGenerating(true); setError(""); setResult(null); setQrDataUrls({});
    try {
      const res = await fetch("/api/finished-goods/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, trackingType, quantity, count: n }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Failed"); }
      setResult(await res.json());
    } catch (e: any) { setError(e.message); }
    finally { setGenerating(false); }
  }

  function handlePrint() {
    if (!result) return;
    printBulkLabels({
      product: result.product,
      labels: result.created,
      qrDataUrls,
    });
  }

  const selectedProduct = products.find(p => p.id === productId);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/finished-goods" className="flex items-center gap-2 text-slate-500 hover:text-slate-700 text-sm">
          <ArrowLeft size={16} /> Back
        </Link>
        <h1 className="text-xl font-bold text-slate-800">Bulk Print Labels</h1>
      </div>

      {/* Config card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Product *</label>
          <select
            value={productId}
            onChange={e => setProductId(e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">Select product...</option>
            {products.map(p => (
              <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-2">Each label represents</label>
          <div className="grid grid-cols-3 gap-2">
            {(["piece", "dozen", "manual"] as const).map(type => (
              <label key={type} className="cursor-pointer">
                <input type="radio" name="trackingType" value={type}
                  checked={trackingType === type}
                  onChange={() => setTrackingType(type)}
                  className="sr-only" />
                <div className={`border-2 rounded-xl p-2.5 text-center text-sm font-medium transition-colors ${
                  trackingType === type
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-slate-200 text-slate-600 hover:border-slate-300"
                }`}>
                  {type === "piece" ? "1 Piece" : type === "dozen" ? "1 Dozen" : "Custom"}
                </div>
              </label>
            ))}
          </div>
          {trackingType === "manual" && (
            <div className="mt-2">
              <input
                type="number"
                value={manualQty}
                onChange={e => setManualQty(e.target.value)}
                min={1}
                placeholder="Pieces per label"
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            How many labels to generate?
          </label>
          <div className="flex items-center gap-3">
            <input
              type="number"
              value={count}
              onChange={e => setCount(e.target.value)}
              min={1}
              max={200}
              className="w-32 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {selectedProduct && count && (
              <p className="text-sm text-slate-500">
                = <span className="font-semibold text-slate-700">{(parseInt(count) || 0) * quantity}</span> total pieces
              </p>
            )}
          </div>
          <div className="flex gap-2 mt-2 flex-wrap">
            {[12, 24, 36, 48, 60, 100].map(n => (
              <button key={n} onClick={() => setCount(String(n))}
                className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
                  count === String(n)
                    ? "bg-blue-600 text-white border-blue-600"
                    : "border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-600"
                }`}>
                {n}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-sm text-red-700 flex items-center justify-between">
            {error}
            <button onClick={() => setError("")}><X size={14} /></button>
          </div>
        )}

        <button
          onClick={handleGenerate}
          disabled={generating}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors"
        >
          {generating ? (
            <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Generating...</>
          ) : (
            <><Layers size={18} /> Generate {count || "?"} Labels</>
          )}
        </button>
      </div>

      {/* Result */}
      {result && (
        <div className="space-y-4">
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle size={20} className="text-emerald-600" />
              <div>
                <p className="font-semibold text-emerald-800">
                  {result.created.length} labels created
                </p>
                <p className="text-xs text-emerald-600 mt-0.5">
                  {result.created.length * quantity} total pieces · {result.product.name}
                </p>
              </div>
            </div>
            <button
              onClick={handlePrint}
              disabled={renderingQrs}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors"
            >
              <Printer size={16} />
              {renderingQrs ? "Rendering QRs…" : "Print All"}
            </button>
          </div>

          {/* Preview grid */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-slate-700 text-sm uppercase tracking-wide">Preview</h2>
              <span className="text-xs text-slate-400">{Object.keys(qrDataUrls).length}/{result.created.length} QRs ready</span>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {result.created.map((label, i) => (
                <Link
                  key={label.id}
                  href={`/finished-goods/${label.id}`}
                  target="_blank"
                  className="border border-slate-200 rounded-xl p-2 text-center hover:border-blue-300 hover:bg-blue-50 transition-colors"
                >
                  {qrDataUrls[label.id] ? (
                    <img src={qrDataUrls[label.id]} className="w-full aspect-square rounded" alt="QR" />
                  ) : (
                    <div className="w-full aspect-square bg-slate-100 rounded flex items-center justify-center">
                      <div className="w-4 h-4 border-2 border-slate-300 border-t-blue-500 rounded-full animate-spin" />
                    </div>
                  )}
                  <p className="text-xs font-bold text-blue-600 mt-1">{label.quantity} pcs</p>
                  <p className="text-xs text-slate-400 font-mono truncate">{label.id.slice(-8)}</p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
