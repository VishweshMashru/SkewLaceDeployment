"use client";
import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Trash2, CheckCircle, Package, X, Pencil, Check, Link2, Search } from "lucide-react";
import { useAppSession } from "@/components/SessionProvider";
import { useRouter } from "next/navigation";

const statusColors: Record<string, string> = {
  pending:     "bg-slate-100 text-slate-500",
  in_progress: "bg-amber-50 text-amber-700",
  completed:   "bg-emerald-50 text-emerald-700",
};

function ProgressBar({ actual, target, size = "sm" }: { actual: number; target: number; size?: "sm" | "lg" }) {
  const pct = Math.min(100, target > 0 ? Math.round((actual / target) * 100) : 0);
  const h = size === "lg" ? "h-2.5" : "h-1.5";
  return (
    <div className={`w-full bg-slate-100 rounded-full ${h} mt-1.5`}>
      <div className={`${h} rounded-full transition-all ${pct >= 100 ? "bg-emerald-500" : pct > 0 ? "bg-blue-500" : "bg-slate-200"}`}
        style={{ width: pct + "%" }} />
    </div>
  );
}

// Product picker modal
function ProductPicker({ onPick, onClose }: { onPick: (p: any) => void; onClose: () => void }) {
  const [products, setProducts] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/products").then(r => r.json()).then(d => setProducts(Array.isArray(d) ? d : []));
  }, []);

  const filtered = products.filter(p =>
    !search ||
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.sku.toLowerCase().includes(search.toLowerCase()) ||
    (p.colorCategory ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white w-full max-w-md rounded-t-3xl sm:rounded-2xl shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <p className="font-semibold text-slate-800">Link to Product</p>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>
        <div className="p-3 border-b border-slate-100">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, SKU, color…"
              autoFocus
              className="w-full border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
        <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
          {filtered.length === 0 ? (
            <p className="text-center text-slate-400 py-6 text-sm">No products found</p>
          ) : filtered.map(p => (
            <button key={p.id} onClick={() => onPick(p)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left">
              {p.imageUrl ? (
                <img src={p.imageUrl} className="w-9 h-9 rounded-lg object-cover flex-shrink-0" alt="" />
              ) : (
                <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Package size={14} className="text-slate-400" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800">{p.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs font-mono text-blue-600">{p.sku}</span>
                  {p.colorCategory && <span className="text-xs text-slate-500">{p.colorCategory}</span>}
                </div>
              </div>
            </button>
          ))}
        </div>
        <div className="p-3 border-t border-slate-100">
          <button onClick={() => onPick(null)}
            className="w-full text-xs text-slate-400 hover:text-slate-600 py-1">
            Clear link (unlink product)
          </button>
        </div>
      </div>
    </div>
  );
}

// Editable line item row
function OrderLineRow({ line, orderId, onUpdated }: { line: any; orderId: string; onUpdated: () => void }) {
  const [editing, setEditing]         = useState(false);
  const [showPicker, setShowPicker]   = useState(false);
  const [saving, setSaving]           = useState(false);
  const [editName, setEditName]       = useState(line.productName);
  const [editColor, setEditColor]     = useState(line.colorCategory ?? "");
  const [editDesign, setEditDesign]   = useState(line.designNumber ?? "");
  const [editQty, setEditQty]         = useState(String(line.targetQty));
  const [linkedProduct, setLinkedProduct] = useState<any>(null);

  const linePct = line.targetQty > 0 ? Math.min(100, Math.round(((line.actualQty ?? 0) / line.targetQty) * 100)) : 0;

  async function save() {
    setSaving(true);
    await fetch(`/api/orders/${orderId}/lines/${line.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productName: editName,
        colorCategory: editColor || null,
        designNumber: editDesign || null,
        targetQty: parseInt(editQty) || line.targetQty,
        ...(linkedProduct !== null ? { productId: linkedProduct?.id ?? null } : {}),
      }),
    });
    setSaving(false);
    setEditing(false);
    onUpdated();
  }

  async function handlePick(product: any) {
    setShowPicker(false);
    setSaving(true);
    await fetch(`/api/orders/${orderId}/lines/${line.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: product?.id ?? null }),
    });
    setSaving(false);
    onUpdated();
  }

  if (editing) {
    return (
      <div className="px-4 py-3 bg-blue-50 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <input value={editName} onChange={e => setEditName(e.target.value)}
            placeholder="Product name"
            className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500" />
          <input value={editColor} onChange={e => setEditColor(e.target.value)}
            placeholder="Color"
            className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500" />
          <input value={editDesign} onChange={e => setEditDesign(e.target.value)}
            placeholder="Design #"
            className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500" />
          <input type="number" value={editQty} onChange={e => setEditQty(e.target.value)}
            placeholder="Target qty"
            className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500" />
        </div>
        <div className="flex gap-2">
          <button onClick={save} disabled={saving}
            className="flex items-center gap-1 text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-60">
            <Check size={12} /> {saving ? "Saving…" : "Save"}
          </button>
          <button onClick={() => setEditing(false)} className="text-xs text-slate-500 hover:text-slate-700 px-2 py-1.5">Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <>
      {showPicker && <ProductPicker onPick={handlePick} onClose={() => setShowPicker(false)} />}
      <div className="px-4 py-3 group">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-medium text-slate-800">{line.productName}</p>
              {line.productId ? (
                <span className="text-xs bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                  <Link2 size={10} /> linked
                </span>
              ) : (
                <span className="text-xs bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded-full">not linked</span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              {line.colorCategory && <span className="text-xs text-slate-500">{line.colorCategory}</span>}
              {line.designNumber && <span className="text-xs text-slate-400">D{line.designNumber}</span>}
              <span className={"text-xs px-1.5 py-0.5 rounded-full font-medium " + (statusColors[line.status] ?? "")}>
                {line.status.replace("_", " ")}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <div className="text-right">
              <p className="text-sm font-bold text-slate-700">{line.actualQty ?? 0}<span className="text-slate-400 font-normal">/{line.targetQty}</span></p>
              <p className="text-xs text-slate-400">{linePct}%</p>
            </div>
            <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => setEditing(true)}
                className="text-xs p-1 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200" title="Edit">
                <Pencil size={11} />
              </button>
              <button onClick={() => setShowPicker(true)}
                className={`text-xs p-1 rounded-lg transition-colors ${line.productId ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100" : "bg-amber-50 text-amber-600 hover:bg-amber-100"}`}
                title="Link to product">
                <Link2 size={11} />
              </button>
            </div>
          </div>
        </div>
        <ProgressBar actual={line.actualQty ?? 0} target={line.targetQty} />
      </div>
    </>
  );
}

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { canDelete } = useAppSession();
  const [order, setOrder]           = useState<any>(null);
  const [loading, setLoading]       = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting]     = useState(false);

  async function fetchOrder() {
    const res = await fetch("/api/orders/" + id);
    if (res.status === 404) { router.replace("/orders"); return; }
    setOrder(await res.json());
    setLoading(false);
  }
  useEffect(() => { fetchOrder(); }, [id]);

  async function handleDelete() {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setDeleting(true);
    await fetch("/api/orders/" + id, { method: "DELETE" });
    router.push("/orders");
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
    </div>
  );
  if (!order) return null;

  const totalTarget = order.lines.reduce((s: number, l: any) => s + l.targetQty, 0);
  const totalActual = order.lines.reduce((s: number, l: any) => s + (l.actualQty ?? 0), 0);
  const pct = totalTarget > 0 ? Math.round((totalActual / totalTarget) * 100) : 0;
  const completedLines = order.lines.filter((l: any) => l.status === "completed").length;
  const linkedLines = order.lines.filter((l: any) => l.productId).length;
  const unlinkedLines = order.lines.length - linkedLines;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Link href="/orders" className="flex items-center gap-2 text-slate-500 hover:text-slate-700 text-sm">
          <ArrowLeft size={16} /> Orders
        </Link>
        {canDelete && (
          <button onClick={handleDelete} disabled={deleting}
            className={"text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors " +
              (confirmDelete ? "bg-red-600 text-white" : "bg-red-50 text-red-500 hover:bg-red-100")}>
            <Trash2 size={13} /> {confirmDelete ? "Confirm?" : "Delete"}
          </button>
        )}
      </div>

      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <h1 className="text-xl font-bold text-slate-800">{order.title}</h1>
            {order.buyerName && <p className="text-sm text-slate-500">{order.buyerName}</p>}
            {order.orderDate && (
              <p className="text-xs text-slate-400 mt-0.5">
                {new Date(order.orderDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <span className={"text-xs px-2.5 py-1 rounded-full font-medium " + (order.type === "production" ? "bg-violet-50 text-violet-700" : "bg-blue-50 text-blue-700")}>
              {order.type === "production" ? "Production" : "Purchase"}
            </span>
            <span className={"text-xs px-2.5 py-1 rounded-full " + (order.status === "completed" ? "bg-emerald-50 text-emerald-700" : order.status === "in_progress" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-500")}>
              {order.status.replace("_", " ")}
            </span>
          </div>
        </div>
        <ProgressBar actual={totalActual} target={totalTarget} size="lg" />
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-slate-500">{totalActual}/{totalTarget} pcs · {completedLines}/{order.lines.length} lines done</span>
          <span className="text-lg font-black text-violet-600">{pct}%</span>
        </div>
      </div>

      {/* Unlinked warning */}
      {unlinkedLines > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-3">
          <span className="text-amber-600 text-lg">⚠️</span>
          <div>
            <p className="text-sm font-medium text-amber-800">{unlinkedLines} line{unlinkedLines !== 1 ? "s" : ""} not linked to a product</p>
            <p className="text-xs text-amber-600 mt-0.5">Tap the <Link2 size={10} className="inline" /> icon on each row to link it — required for auto-matching labels</p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border border-slate-200 p-3 text-center">
          <p className="text-xl font-black text-violet-600">{order.lines.length}</p>
          <p className="text-xs text-slate-500 mt-0.5">Lines</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-3 text-center">
          <p className="text-xl font-black text-blue-600">{totalTarget}</p>
          <p className="text-xs text-slate-500 mt-0.5">Target pcs</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-3 text-center">
          <p className="text-xl font-black text-emerald-600">{linkedLines}</p>
          <p className="text-xs text-slate-500 mt-0.5">Linked</p>
        </div>
      </div>

      {/* Line items */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-700 text-sm uppercase tracking-wide">Line Items</h2>
          <span className="text-xs text-slate-400">{linkedLines}/{order.lines.length} linked</span>
        </div>
        <div className="divide-y divide-slate-100">
          {order.lines.map((line: any) => (
            <OrderLineRow key={line.id} line={line} orderId={id} onUpdated={fetchOrder} />
          ))}
        </div>
      </div>

      {order.notes && (
        <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4">
          <p className="text-xs font-medium text-slate-500 mb-1">Notes</p>
          <p className="text-sm text-slate-700">{order.notes}</p>
        </div>
      )}

      <p className="text-center text-xs text-slate-400 font-mono">
        Created {new Date(order.createdAt).toLocaleString()}
      </p>
    </div>
  );
}
