"use client";
import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Box, Package, Printer, ScanLine, Truck, Lock, Trash2 } from "lucide-react";
import QRDisplay, { type QRDisplayHandle } from "@/components/QRDisplay";

const statusColors: Record<string, string> = {
  open:       "bg-emerald-50 text-emerald-700 border-emerald-200",
  sealed:     "bg-amber-50 text-amber-700 border-amber-200",
  dispatched: "bg-blue-50 text-blue-700 border-blue-200",
};

export default function CartonDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [data, setData]             = useState<any>(null);
  const [loading, setLoading]       = useState(true);
  const [notFound, setNotFound]     = useState(false);
  const [updating, setUpdating]     = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting]     = useState(false);
  const qrRef = useRef<QRDisplayHandle>(null);
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  async function fetchData() {
    const res = await fetch(`/api/cartons/${id}`);
    if (res.status === 404) { setNotFound(true); setLoading(false); return; }
    setData(await res.json());
    setLoading(false);
  }
  useEffect(() => { fetchData(); }, [id]);

  async function updateStatus(status: string) {
    setUpdating(true);
    await fetch(`/api/cartons/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await fetchData();
    setUpdating(false);
  }

  async function handleDelete() {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setDeleting(true);
    const res = await fetch(`/api/cartons/${id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/cartons");
    } else {
      const err = await res.json();
      alert(err.error || "Delete failed");
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  function handlePrint() {
    if (!data) return;
    const { carton, summary } = data;
    const dataUrl = qrRef.current?.getDataUrl();
    const rows = summary
      .map((s: any) => `<tr><td>${s.productName}</td><td style="color:#64748b;font-size:11px">${s.sku}</td><td style="text-align:right;font-weight:600">${s.totalPieces}</td></tr>`)
      .join("");
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><title>Carton — ${carton.cartonNumber}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:-apple-system,sans-serif; display:flex; align-items:center; justify-content:center; min-height:100vh; }
  .label { border:3px solid #7c3aed; border-radius:12px; padding:20px; width:260px; text-align:center; }
  h2  { font-size:13px; color:#6b21a8; font-weight:700; margin-bottom:4px; letter-spacing:.05em; text-transform:uppercase; }
  .num{ font-size:18px; font-weight:900; color:#7c3aed; margin-bottom:12px; font-family:monospace; }
  img { width:160px; height:160px; margin:0 auto 12px; display:block; }
  .total-line { font-size:14px; font-weight:700; margin-bottom:12px; color:#1e293b; }
  table { width:100%; border-collapse:collapse; font-size:12px; text-align:left; }
  td { padding:4px 6px; border-bottom:1px solid #f1f5f9; }
  tr:last-child td { border-bottom:none; font-weight:700; font-size:13px; }
  .notes { font-size:10px; color:#94a3b8; margin-top:10px; }
</style></head><body>
<div class="label">
  <h2>CartonTrack</h2>
  <div class="num">${carton.cartonNumber}</div>
  ${dataUrl ? `<img src="${dataUrl}" />` : ""}
  <div class="total-line">${carton.totalPieces} pieces total</div>
  <table>
    ${rows}
    <tr><td colspan="2"><strong>TOTAL</strong></td><td style="text-align:right">${carton.totalPieces}</td></tr>
  </table>
  ${carton.notes ? `<div class="notes">${carton.notes}</div>` : ""}
</div>
<script>window.onload = () => { window.print(); window.close(); }</script>
</body></html>`);
    win.document.close();
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
    </div>
  );

  if (notFound) return (
    <div className="text-center py-16">
      <Box size={40} className="mx-auto text-slate-300 mb-3" />
      <h2 className="font-bold text-slate-800 mb-2">Carton Not Found</h2>
      <Link href="/cartons" className="text-blue-600 text-sm hover:underline">Back to cartons</Link>
    </div>
  );

  const { carton, items, summary } = data;

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <Link href="/cartons" className="flex items-center gap-2 text-slate-500 hover:text-slate-700 text-sm">
          <ArrowLeft size={16} /> Back to Cartons
        </Link>
        <div className="flex items-center gap-2">
          <button onClick={handlePrint}
            className="flex items-center gap-1.5 text-sm bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors">
            <Printer size={14} /> Print
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg transition-colors ${
              confirmDelete ? "bg-red-600 text-white hover:bg-red-700" : "bg-red-50 text-red-600 hover:bg-red-100"
            }`}
          >
            <Trash2 size={14} />
            {deleting ? "Deleting…" : confirmDelete ? "Confirm?" : "Delete"}
          </button>
        </div>
      </div>

      {/* Status bar */}
      <div className={`rounded-2xl border-2 p-4 flex items-center gap-3 ${statusColors[carton.status]}`}>
        <Box size={24} />
        <div>
          <p className="font-bold text-slate-800 font-mono text-lg">{carton.cartonNumber}</p>
          <span className="text-xs font-medium capitalize">{carton.status}</span>
        </div>
      </div>

      {/* QR */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col items-center gap-3">
        <QRDisplay ref={qrRef} value={`${baseUrl}/cartons/${carton.id}`} size={180} />
        <p className="text-xs text-slate-400 font-mono">Scan to view carton details</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 text-center">
          <p className="text-3xl font-black text-violet-600">{carton.totalPieces}</p>
          <p className="text-xs text-slate-500 mt-1">Total Pieces</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4 text-center">
          <p className="text-3xl font-black text-blue-600">{items.length}</p>
          <p className="text-xs text-slate-500 mt-1">QR Labels</p>
        </div>
      </div>

      {/* Product summary */}
      {summary.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="font-semibold text-slate-700 text-sm uppercase tracking-wide mb-3">Product Breakdown</h2>
          <div className="space-y-2">
            {summary.map((s: any, i: number) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                <div>
                  <p className="font-medium text-slate-800 text-sm">{s.productName}</p>
                  <p className="text-xs text-slate-400 font-mono">{s.sku} · {s.items} label{s.items !== 1 ? "s" : ""}</p>
                </div>
                <span className="font-bold text-slate-700">{s.totalPieces} pcs</span>
              </div>
            ))}
            <div className="flex items-center justify-between py-2 font-bold">
              <span className="text-slate-700">Total</span>
              <span className="text-violet-600 text-lg">{carton.totalPieces} pcs</span>
            </div>
          </div>
        </div>
      )}

      {/* Packed labels */}
      {items.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="font-semibold text-slate-700 text-sm uppercase tracking-wide mb-3">Packed Labels</h2>
          <div className="space-y-2">
            {items.map((item: any) => (
              <Link key={item.fg.id} href={`/finished-goods/${item.fg.id}`}
                className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0 hover:bg-slate-50 -mx-1 px-1 rounded-lg transition-colors">
                <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Package size={14} className="text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{item.product?.name}</p>
                  <p className="text-xs text-slate-400 font-mono">{item.fg.id.slice(-12)}</p>
                </div>
                <span className="text-sm font-semibold text-slate-700">{item.fg.quantity} pcs</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      {carton.status !== "dispatched" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
          <h2 className="font-semibold text-slate-700 text-sm uppercase tracking-wide">Actions</h2>
          {carton.status === "open" && (
            <Link href={`/cartons/${id}/pack`}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors">
              <ScanLine size={18} /> Add Items to Carton
            </Link>
          )}
          {carton.status === "open" && (
            <button onClick={() => updateStatus("sealed")} disabled={updating}
              className="w-full flex items-center justify-center gap-2 bg-amber-500 text-white py-3 rounded-xl font-medium hover:bg-amber-600 disabled:opacity-60 transition-colors">
              <Lock size={18} /> {updating ? "Sealing..." : "Seal Carton"}
            </button>
          )}
          {carton.status === "sealed" && (
            <button onClick={() => updateStatus("dispatched")} disabled={updating}
              className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white py-3 rounded-xl font-medium hover:bg-emerald-700 disabled:opacity-60 transition-colors">
              <Truck size={18} /> {updating ? "Dispatching..." : "Mark as Dispatched"}
            </button>
          )}
        </div>
      )}

      {carton.notes && (
        <div className="bg-slate-50 rounded-xl px-4 py-3 text-sm text-slate-600">
          <span className="font-medium">Notes:</span> {carton.notes}
        </div>
      )}
      <p className="text-center text-xs text-slate-400 font-mono">
        Created {new Date(carton.createdAt).toLocaleString()}
      </p>
    </div>
  );
}
