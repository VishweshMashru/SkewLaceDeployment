"use client";
import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle, Package, Box, Truck } from "lucide-react";

const statusConfig: Record<string, { label: string; sub: string; color: string; icon: any }> = {
  available:  { label: "Available",  sub: "Ready to be packed into a carton", color: "bg-emerald-50 border-emerald-300 text-emerald-700", icon: CheckCircle },
  packed:     { label: "Packed",     sub: "Inside a carton",                  color: "bg-amber-50 border-amber-300 text-amber-700",   icon: Box          },
  dispatched: { label: "Dispatched", sub: "Shipped out",                      color: "bg-blue-50 border-blue-300 text-blue-700",      icon: Truck        },
};

export default function FGDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData]     = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState("");

  useEffect(() => {
    fetch("/api/finished-goods/" + id)
      .then(r => r.ok ? r.json() : Promise.reject("Not found"))
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setError(String(e)); setLoading(false); });
  }, [id]);

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
    </div>
  );

  if (error || !data) return (
    <div className="text-center py-16">
      <Package size={32} className="mx-auto text-slate-300 mb-3" />
      <p className="text-slate-500 font-medium">Label not found</p>
      <Link href="/finished-goods" className="text-blue-600 text-sm hover:underline mt-2 block">Back to Labels</Link>
    </div>
  );

  const { fg, product } = data;
  const sc = statusConfig[fg.status] ?? statusConfig.available;
  const Icon = sc.icon;

  // New fields from updated schema
  const metersPerPiece = product?.metersPerPiece ?? null;
  const size           = product?.size ?? null;
  const designNumber   = product?.designNumber ?? fg.designNumber ?? null;
  const colorCategory  = product?.colorCategory ?? null;
  const totalMeters    = metersPerPiece ? (fg.quantity * parseFloat(metersPerPiece)).toFixed(2) : null;

  return (
    <div className="space-y-4">
      <Link href="/finished-goods" className="flex items-center gap-2 text-slate-500 hover:text-slate-700 text-sm">
        <ArrowLeft size={16} /> Back to Labels
      </Link>

      {/* Status */}
      <div className={`rounded-2xl border-2 p-4 flex items-center gap-3 ${sc.color}`}>
        <Icon size={24} />
        <div>
          <p className="font-bold text-lg">{sc.label}</p>
          <p className="text-sm opacity-80">{sc.sub}</p>
        </div>
      </div>

      {/* QR + Product name */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col items-center gap-3">
        <img
          src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(typeof window !== "undefined" ? window.location.href : id)}`}
          className="w-48 h-48"
          alt="QR Code"
        />
        <p className="text-xl font-bold text-slate-800 text-center">{product?.name ?? "Unknown Product"}</p>
        {designNumber && <p className="text-sm text-slate-500">D.NO {designNumber}</p>}
        {colorCategory && <p className="text-sm text-slate-400">{colorCategory}</p>}
      </div>

      {/* Details grid */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4">Details</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-slate-400 mb-1">Quantity</p>
            <p className="text-2xl font-black text-blue-600">{fg.quantity}</p>
            <p className="text-xs text-slate-400">
              {fg.trackingType === "piece" ? "piece" : fg.trackingType === "dozen" ? "dozen (12 pcs)" : "pcs"}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-1">Tracking Type</p>
            <p className="text-lg font-bold text-slate-800 capitalize">{fg.trackingType === "piece" ? "Piece" : fg.trackingType === "dozen" ? "Dozen" : "Custom"}</p>
          </div>

          {designNumber && (
            <div>
              <p className="text-xs text-slate-400 mb-1">D.NO</p>
              <p className="text-lg font-bold text-slate-800">{designNumber}</p>
            </div>
          )}

          {colorCategory && (
            <div>
              <p className="text-xs text-slate-400 mb-1">Color</p>
              <p className="text-lg font-bold text-slate-800">{colorCategory}</p>
            </div>
          )}

          {metersPerPiece && (
            <div>
              <p className="text-xs text-slate-400 mb-1">MTS / Piece</p>
              <p className="text-lg font-bold text-slate-800">{metersPerPiece} m</p>
            </div>
          )}

          {totalMeters && (
            <div>
              <p className="text-xs text-slate-400 mb-1">Total Meters</p>
              <p className="text-lg font-bold text-emerald-600">{totalMeters} m</p>
            </div>
          )}

          {size && (
            <div>
              <p className="text-xs text-slate-400 mb-1">Size</p>
              <p className="text-lg font-bold text-slate-800">{size}</p>
            </div>
          )}

          <div>
            <p className="text-xs text-slate-400 mb-1">SKU</p>
            <p className="text-sm font-mono font-bold text-slate-700">{product?.sku ?? "-"}</p>
          </div>

          <div>
            <p className="text-xs text-slate-400 mb-1">Label ID</p>
            <p className="text-sm font-mono text-slate-600">{fg.id}</p>
          </div>
        </div>
      </div>

      {/* Product image if available */}
      {product?.imageUrl && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Product Photo</p>
          <img src={product.imageUrl} alt={product.name}
            className="w-full max-h-48 object-contain rounded-xl" />
        </div>
      )}

      {/* Carton info if packed */}
      {fg.cartonId && (
        <Link href={"/cartons/" + fg.cartonId}
          className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-3 hover:shadow-sm transition-all">
          <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
            <Box size={18} className="text-amber-600" />
          </div>
          <div>
            <p className="text-xs text-slate-400">Packed in carton</p>
            <p className="font-mono font-semibold text-slate-800">{fg.cartonId}</p>
          </div>
          <ArrowLeft size={16} className="ml-auto text-slate-300 rotate-180" />
        </Link>
      )}

      <p className="text-center text-xs text-slate-400 font-mono">
        Created {new Date(fg.createdAt).toLocaleString()}
      </p>
    </div>
  );
}
