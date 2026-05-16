"use client";
import { useEffect, useRef, useState } from "react";
import { use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Package, Box, CheckCircle, Truck, Clock, Printer, Trash2 } from "lucide-react";
import QRDisplay, { type QRDisplayHandle } from "@/components/QRDisplay";
import { printFGLabel } from "@/lib/print";

const statusConfig: Record<string, { label: string; icon: typeof Clock; color: string; bg: string }> = {
  available: { label: "Available", icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200" },
  packed:    { label: "Packed in Carton", icon: Box,          color: "text-amber-600",  bg: "bg-amber-50 border-amber-200"  },
  dispatched:{ label: "Dispatched",       icon: Truck,        color: "text-blue-600",   bg: "bg-blue-50 border-blue-200"    },
};

export default function FinishedGoodsDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [data, setData]       = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const qrRef = useRef<QRDisplayHandle>(null);

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  useEffect(() => {
    fetch(`/api/finished-goods/${id}`)
      .then(async (res) => {
        if (res.status === 404) { setNotFound(true); return; }
        setData(await res.json());
      })
      .finally(() => setLoading(false));
  }, [id]);

  function handlePrint() {
    const dataUrl = qrRef.current?.getDataUrl() ?? null;
    if (!data) return;
    const { fg, product } = data;
    printFGLabel({
      productName: product?.name ?? "",
      designNumber: product?.designNumber,
      sku: product?.sku,
      quantity: fg.quantity,
      id: fg.id,
      dataUrl,
    });
  }

  async function handleDelete() {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setDeleting(true);
    const res = await fetch(`/api/finished-goods/${id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/finished-goods");
    } else {
      const err = await res.json();
      alert(err.error || "Delete failed");
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
    </div>
  );

  if (notFound) return (
    <div className="text-center py-16">
      <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
        <Package size={28} className="text-red-400" />
      </div>
      <h2 className="font-bold text-slate-800 text-lg mb-2">Label Not Found</h2>
      <p className="text-slate-500 text-sm">This QR code is invalid or has been removed.</p>
      <Link href="/" className="mt-4 inline-block text-blue-600 text-sm hover:underline">Go home</Link>
    </div>
  );

  if (!data) return null;
  const { fg, product, carton } = data;
  const status = statusConfig[fg.status] ?? statusConfig.available;
  const StatusIcon = status.icon;

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <Link href="/finished-goods" className="flex items-center gap-2 text-slate-500 hover:text-slate-700 text-sm">
          <ArrowLeft size={16} /> Back to Labels
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 text-sm bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors"
          >
            <Printer size={14} /> Print
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg transition-colors ${
              confirmDelete
                ? "bg-red-600 text-white hover:bg-red-700"
                : "bg-red-50 text-red-600 hover:bg-red-100"
            }`}
          >
            <Trash2 size={14} />
            {deleting ? "Deleting…" : confirmDelete ? "Confirm?" : "Delete"}
          </button>
        </div>
      </div>

      {/* Status banner */}
      <div className={`rounded-2xl border-2 p-4 flex items-center gap-3 ${status.bg}`}>
        <StatusIcon size={24} className={status.color} />
        <div>
          <p className="font-bold text-slate-800">{status.label}</p>
          <p className="text-xs text-slate-500 mt-0.5">
            {fg.status === "available"  && "Ready to be packed into a carton"}
            {fg.status === "packed"     && carton && `Packed in Carton ${carton.cartonNumber}`}
            {fg.status === "dispatched" && "This item has been dispatched"}
          </p>
        </div>
      </div>

      {/* QR */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col items-center gap-4">
        <QRDisplay ref={qrRef} value={`${baseUrl}/finished-goods/${fg.id}`} size={180} />
        <div className="text-center">
          <h1 className="text-xl font-bold text-slate-800">{product?.name}</h1>
          {product?.designNumber && <p className="text-sm text-slate-500 mt-1">Design {product.designNumber}</p>}
          {product?.colorCategory && (
            <span className="inline-block mt-1 bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-full">
              {product.colorCategory}
            </span>
          )}
        </div>
      </div>

      {/* Details */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
        <h2 className="font-semibold text-slate-700 text-sm uppercase tracking-wide">Details</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-50 rounded-xl p-3">
            <p className="text-xs text-slate-500 mb-1">Quantity</p>
            <p className="text-2xl font-black text-blue-600">{fg.quantity}</p>
            <p className="text-xs text-slate-400">pieces</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-3">
            <p className="text-xs text-slate-500 mb-1">Tracking Type</p>
            <p className="font-semibold text-slate-800 capitalize">{fg.trackingType}</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-3">
            <p className="text-xs text-slate-500 mb-1">SKU</p>
            <p className="font-mono text-sm font-semibold text-slate-800">{product?.sku}</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-3">
            <p className="text-xs text-slate-500 mb-1">Label ID</p>
            <p className="font-mono text-xs text-slate-600 break-all">{fg.id}</p>
          </div>
        </div>
      </div>

      {/* Carton link */}
      {carton && (
        <Link
          href={`/cartons/${carton.id}`}
          className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-center gap-3 hover:bg-blue-100 transition-colors"
        >
          <Box size={20} className="text-blue-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-blue-800">Carton {carton.cartonNumber}</p>
            <p className="text-xs text-blue-600 mt-0.5">Tap to view carton details</p>
          </div>
          <ArrowLeft size={16} className="text-blue-400 rotate-180" />
        </Link>
      )}

      <p className="text-center text-xs text-slate-400 font-mono">
        Created {new Date(fg.createdAt).toLocaleString()}
      </p>
    </div>
  );
}
