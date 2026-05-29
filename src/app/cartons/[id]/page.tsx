"use client";
import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Box, Package, Printer, ScanLine, Truck, Lock, Trash2, ChevronDown, ChevronUp, Warehouse, MapPin, Pencil, Check, X } from "lucide-react";
import QRDisplay, { type QRDisplayHandle } from "@/components/QRDisplay";
import { printCartonLabel } from "@/lib/print";
import { useAppSession } from "@/components/SessionProvider";
import PrintOptionsModal from "@/components/PrintOptionsModal";

function EditCartonSection({ carton, cartonId, onUpdated }: { carton: any; cartonId: string; onUpdated: () => void }) {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState(carton.notes ?? "");
  const [location, setLocation] = useState(carton.storageLocation ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    await fetch(`/api/cartons/${cartonId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes, storageLocation: location }),
    });
    setSaving(false);
    setOpen(false);
    onUpdated();
  }

  if (!open) return (
    <button onClick={() => setOpen(true)}
      className="w-full flex items-center justify-center gap-2 border border-slate-200 text-slate-600 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors">
      <Pencil size={15} /> Edit Carton Details
    </button>
  );

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-slate-700 text-sm">Edit Carton</h2>
        <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
      </div>
      <div>
        <label className="text-xs font-medium text-slate-600 block mb-1">Notes</label>
        <input value={notes} onChange={e => setNotes(e.target.value)}
          placeholder="e.g. JDT order, 22kg"
          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>
      {carton.purpose === "storage" && (
        <div>
          <label className="text-xs font-medium text-slate-600 block mb-1">Storage Location</label>
          <input value={location} onChange={e => setLocation(e.target.value)}
            placeholder="e.g. Rack B-3"
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      )}
      <button onClick={save} disabled={saving}
        className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-60">
        <Check size={15} /> {saving ? "Saving…" : "Save Changes"}
      </button>
    </div>
  );
}

function MassDeleteSection({ items, cartonId, onDeleted }: { items: any[]; cartonId: string; onDeleted: () => void }) {
  const [open, setOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [count, setCount] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [confirm, setConfirm] = useState(false);

  // Group items by product
  const productGroups = new Map<string, { name: string; color: string | null; items: any[] }>();
  for (const item of items) {
    const pid = item.fg.productId;
    if (!productGroups.has(pid)) {
      productGroups.set(pid, {
        name: item.product?.name ?? "Unknown",
        color: item.product?.colorCategory ?? null,
        items: [],
      });
    }
    productGroups.get(pid)!.items.push(item);
  }

  const selectedGroup = productGroups.get(selectedProduct);
  const maxCount = selectedGroup?.items.length ?? 0;
  const n = parseInt(count);
  const valid = selectedProduct && !isNaN(n) && n > 0 && n <= maxCount;

  async function handleMassDelete() {
    if (!confirm) { setConfirm(true); return; }
    if (!valid || !selectedGroup) return;
    setDeleting(true);
    // Delete the last N items (most recently added)
    const toDelete = selectedGroup.items.slice(-n).map((i: any) => i.fg.id);
    for (const fgId of toDelete) {
      await fetch(`/api/cartons/${cartonId}/remove-item`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ finishedGoodsId: fgId }),
      });
    }
    setDeleting(false);
    setConfirm(false);
    setCount("");
    onDeleted();
  }

  if (!open) return (
    <button onClick={() => setOpen(true)}
      className="w-full flex items-center justify-center gap-2 border border-red-200 text-red-500 py-2.5 rounded-xl text-sm font-medium hover:bg-red-50 transition-colors">
      <Trash2 size={15} /> Mass Remove from Carton
    </button>
  );

  return (
    <div className="bg-white rounded-2xl border border-red-200 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-red-700 text-sm">Mass Remove</h2>
        <button onClick={() => { setOpen(false); setConfirm(false); }} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
      </div>
      <div>
        <label className="text-xs font-medium text-slate-600 block mb-1">Product</label>
        <select value={selectedProduct} onChange={e => { setSelectedProduct(e.target.value); setCount(""); setConfirm(false); }}
          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-400">
          <option value="">Select product…</option>
          {Array.from(productGroups.entries()).map(([pid, g]) => (
            <option key={pid} value={pid}>{g.name}{g.color ? " – " + g.color : ""} ({g.items.length} labels)</option>
          ))}
        </select>
      </div>
      {selectedProduct && (
        <div>
          <label className="text-xs font-medium text-slate-600 block mb-1">
            How many labels to remove? (max {maxCount})
          </label>
          <input type="number" value={count} onChange={e => { setCount(e.target.value); setConfirm(false); }}
            min={1} max={maxCount} placeholder={`1–${maxCount}`}
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
          {valid && <p className="text-xs text-slate-400 mt-1">Will remove the {n} most recently added labels</p>}
        </div>
      )}
      <button onClick={handleMassDelete} disabled={!valid || deleting}
        className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium disabled:opacity-60 transition-colors ${
          confirm ? "bg-red-600 text-white" : "bg-red-50 text-red-600 hover:bg-red-100"
        }`}>
        <Trash2 size={15} />
        {deleting ? "Removing…" : confirm ? `⚠️ Confirm — remove ${n} labels` : `Remove ${valid ? n + " labels" : "…"}`}
      </button>
      {confirm && <button onClick={() => setConfirm(false)} className="w-full text-xs text-slate-400 hover:text-slate-600">Cancel</button>}
    </div>
  );
}


function PackedLabelsGrouped({ items, canEdit, cartonStatus, removingId, onRemove }: {
  items: any[];
  canEdit: boolean;
  cartonStatus: string;
  removingId: string | null;
  onRemove: (id: string) => void;
}) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  // Group by product
  const groups: { productId: string; productName: string; imageUrl: string | null; items: any[] }[] = [];
  const seen = new Map<string, number>();
  for (const item of items) {
    const pid = item.fg.productId;
    if (!seen.has(pid)) {
      seen.set(pid, groups.length);
      groups.push({ productId: pid, productName: item.product?.name ?? "Unknown", imageUrl: item.product?.imageUrl ?? null, items: [] });
    }
    groups[seen.get(pid)!].items.push(item);
  }

  function toggle(pid: string) {
    setCollapsed(prev => { const n = new Set(prev); n.has(pid) ? n.delete(pid) : n.add(pid); return n; });
  }

  const totalPieces = items.reduce((s, i) => s + i.fg.quantity, 0);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
        <h2 className="font-semibold text-slate-700 text-sm uppercase tracking-wide">Packed Labels</h2>
        <span className="text-xs text-slate-400">{items.length} labels · {totalPieces} pcs</span>
      </div>
      {groups.map(group => {
        const isCollapsed = collapsed.has(group.productId);
        const groupPieces = group.items.reduce((s: number, i: any) => s + i.fg.quantity, 0);
        return (
          <div key={group.productId} className="border-b border-slate-100 last:border-0">
            <button onClick={() => toggle(group.productId)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left">
              {group.imageUrl ? (
                <img src={group.imageUrl} className="w-9 h-9 rounded-lg object-cover flex-shrink-0" alt="" />
              ) : (
                <div className="w-9 h-9 bg-emerald-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Package size={14} className="text-emerald-600" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">{group.productName}</p>
                <p className="text-xs text-slate-400">{group.items.length} labels · {groupPieces} pcs</p>
              </div>
              {isCollapsed ? <ChevronDown size={15} className="text-slate-400 flex-shrink-0" /> : <ChevronUp size={15} className="text-slate-400 flex-shrink-0" />}
            </button>
            {!isCollapsed && (
              <div className="divide-y divide-slate-50 bg-slate-50/50">
                {group.items.map((item: any) => (
                  <div key={item.fg.id} className="flex items-center gap-3 px-4 py-2.5">
                    <Link href={`/finished-goods/${item.fg.id}`}
                      className="flex-1 min-w-0 flex items-center gap-2 hover:opacity-70 transition-opacity">
                      <span className="text-xs text-slate-500 font-mono truncate">{item.fg.id.slice(-12)}</span>
                    </Link>
                    <span className="text-xs font-semibold text-slate-600 flex-shrink-0">{item.fg.quantity} pcs</span>
                    {canEdit && cartonStatus !== "dispatched" && (
                      <button onClick={() => onRemove(item.fg.id)} disabled={removingId === item.fg.id}
                        className="flex-shrink-0 text-xs px-2 py-1 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 disabled:opacity-40 transition-colors">
                        {removingId === item.fg.id ? "…" : "Remove"}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

const statusColors: Record<string, string> = {
  open:       "bg-emerald-50 text-emerald-700 border-emerald-200",
  sealed:     "bg-amber-50 text-amber-700 border-amber-200",
  dispatched: "bg-blue-50 text-blue-700 border-blue-200",
};

export default function CartonDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { canEdit, canDelete } = useAppSession();
  const [data, setData]             = useState<any>(null);
  const [loading, setLoading]       = useState(true);
  const [notFound, setNotFound]     = useState(false);
  const [updating, setUpdating]     = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting]     = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const qrRef = useRef<QRDisplayHandle>(null);
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  const [removingId, setRemovingId] = useState<string | null>(null);

  async function fetchData() {
    const res = await fetch(`/api/cartons/${id}`);
    if (res.status === 404) { setNotFound(true); setLoading(false); return; }
    setData(await res.json());
    setLoading(false);
  }

  async function removeItem(fgId: string) {
    setRemovingId(fgId);
    const res = await fetch(`/api/cartons/${id}/remove-item`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ finishedGoodsId: fgId }),
    });
    if (res.ok) await fetchData();
    setRemovingId(null);
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
    setShowPrintModal(true);
  }

  function doPrint({ showBranding, size }: { showBranding: boolean; size: "full" | "qr-only" }) {
    if (!data) return;
    const { carton, summary } = data;
    printCartonLabel({
      cartonNumber: carton.cartonNumber,
      totalPieces: carton.totalPieces,
      summary: summary.map((s: any) => ({
        productName: s.productName,
        sku: s.sku,
        colorCategory: s.colorCategory ?? null,
        designNumber: s.designNumber ?? null,
        totalPieces: s.totalPieces,
      })),
      notes: carton.notes,
      dataUrl: qrRef.current?.getDataUrl() ?? null,
      showBranding,
      size,
    });
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
      {showPrintModal && (
        <PrintOptionsModal
          title="Print Carton Label"
          onPrint={doPrint}
          onClose={() => setShowPrintModal(false)}
        />
      )}
      {/* Top bar */}
      <div className="flex items-center justify-between">
        {canEdit ? (
          <Link href="/cartons" className="flex items-center gap-2 text-slate-500 hover:text-slate-700 text-sm">
            <ArrowLeft size={16} /> Back to Cartons
          </Link>
        ) : <div />}
        <div className="flex items-center gap-2">
          {canEdit && (
            <button onClick={handlePrint}
              className="flex items-center gap-1.5 text-sm bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors">
              <Printer size={14} /> Print
            </button>
          )}
          {canDelete && (
            <button onClick={handleDelete} disabled={deleting}
              className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg transition-colors ${
                confirmDelete ? "bg-red-600 text-white hover:bg-red-700" : "bg-red-50 text-red-600 hover:bg-red-100"
              }`}>
              <Trash2 size={14} />
              {deleting ? "Deleting…" : confirmDelete ? "Confirm?" : "Delete"}
            </button>
          )}
        </div>
      </div>

      {/* Status bar */}
      <div className={`rounded-2xl border-2 p-4 flex items-center gap-3 ${carton.purpose === "storage" ? "bg-emerald-50 border-emerald-300 text-emerald-800" : statusColors[carton.status]}`}>
        {carton.purpose === "storage" ? <Warehouse size={24} /> : <Box size={24} />}
        <div className="flex-1 min-w-0">
          <p className="font-bold text-slate-800 font-mono text-lg">{carton.cartonNumber}</p>
          <div className="flex items-center gap-2 flex-wrap mt-0.5">
            <span className="text-xs font-medium capitalize">
              {carton.purpose === "storage" ? "📦 Storage" : `🚚 Dispatch · ${carton.status}`}
            </span>
            {carton.storageLocation && (
              <span className="text-xs flex items-center gap-0.5 text-emerald-700">
                <MapPin size={10} /> {carton.storageLocation}
              </span>
            )}
          </div>
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
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    <span className="text-xs text-slate-400 font-mono">{s.sku}</span>
                    {s.designNumber && (
                      <span className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">Design {s.designNumber}</span>
                    )}
                    {s.colorCategory && (
                      <span className="text-xs bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded">{s.colorCategory}</span>
                    )}
                    <span className="text-xs text-slate-400">{s.items} label{s.items !== 1 ? "s" : ""}</span>
                  </div>
                </div>
                <span className="font-bold text-slate-700 ml-2">{s.totalPieces} pcs</span>
              </div>
            ))}
            <div className="flex items-center justify-between py-2 font-bold">
              <span className="text-slate-700">Total</span>
              <span className="text-violet-600 text-lg">{carton.totalPieces} pcs</span>
            </div>
          </div>
        </div>
      )}

      {/* Packed labels — grouped by SKU */}
      {items.length > 0 && (
        <PackedLabelsGrouped
          items={items}
          canEdit={canEdit}
          cartonStatus={carton.status}
          removingId={removingId}
          onRemove={removeItem}
        />
      )}

      {/* Packing List */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2">
        <h2 className="font-semibold text-slate-700 text-sm uppercase tracking-wide">Packing List</h2>
        <div className="grid grid-cols-2 gap-2">
          <a href={`/api/cartons/${id}/packing-list?mode=summary`} target="_blank"
            className="flex items-center justify-center gap-2 border border-slate-200 text-slate-700 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors">
            <Printer size={15} /> Summary PDF
          </a>
          <a href={`/api/cartons/${id}/packing-list?mode=detailed`} target="_blank"
            className="flex items-center justify-center gap-2 border border-slate-200 text-slate-700 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors">
            <Printer size={15} /> Detailed PDF
          </a>
        </div>
      </div>

      {/* Edit carton */}
      {canEdit && carton.status !== "dispatched" && (
        <EditCartonSection carton={carton} cartonId={id} onUpdated={fetchData} />
      )}

      {/* Actions — staff/admin only */}
      {canEdit && carton.status !== "dispatched" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
          <h2 className="font-semibold text-slate-700 text-sm uppercase tracking-wide">Actions</h2>
          {carton.status === "open" && (
            <Link href={`/cartons/${id}/pack`}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors">
              <ScanLine size={18} /> Add Items to Carton
            </Link>
          )}
          {/* Mass delete inside actions */}
          {items.length > 0 && (
            <MassDeleteSection items={items} cartonId={id} onDeleted={fetchData} />
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
