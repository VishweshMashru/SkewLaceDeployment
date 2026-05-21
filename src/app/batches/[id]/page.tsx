"use client";
import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Box, Package, Truck, Lock, Trash2, Plus, X, Archive } from "lucide-react";
import { useAppSession } from "@/components/SessionProvider";

const statusConfig: Record<string, { label: string; color: string }> = {
  preparing:  { label: "Preparing",  color: "bg-blue-50 text-blue-700 border-blue-200"   },
  sealed:     { label: "Sealed",     color: "bg-amber-50 text-amber-700 border-amber-200" },
  dispatched: { label: "Dispatched", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
};

const cartonStatusColor: Record<string, string> = {
  open:       "bg-emerald-50 text-emerald-700",
  sealed:     "bg-amber-50 text-amber-700",
  dispatched: "bg-blue-50 text-blue-700",
};

export default function BatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { canEdit, canDelete } = useAppSession();

  const [data, setData]               = useState<any>(null);
  const [loading, setLoading]         = useState(true);
  const [updating, setUpdating]       = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting]       = useState(false);
  const [showAddCarton, setShowAddCarton] = useState(false);
  const [addMode, setAddMode]             = useState<"new" | "existing">("new");
  const [cartonNotes, setCartonNotes]     = useState("");
  const [addingCarton, setAddingCarton]   = useState(false);
  const [availableCartons, setAvailableCartons] = useState<any[]>([]);
  const [loadingCartons, setLoadingCartons]     = useState(false);
  const [assigningId, setAssigningId]           = useState<string | null>(null);

  async function fetchData() {
    const res = await fetch("/api/batches/" + id);
    if (res.status === 404) { router.replace("/batches"); return; }
    setData(await res.json());
    setLoading(false);
  }
  useEffect(() => { fetchData(); }, [id]);

  async function updateStatus(status: string) {
    setUpdating(true);
    await fetch("/api/batches/" + id + "/status", {
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
    await fetch("/api/batches/" + id, { method: "DELETE" });
    router.push("/batches");
  }

  async function handleAddCarton(e: React.FormEvent) {
    e.preventDefault();
    setAddingCarton(true);
    await fetch("/api/cartons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ batchId: id, notes: cartonNotes }),
    });
    setCartonNotes(""); setShowAddCarton(false);
    await fetchData(); setAddingCarton(false);
  }

  async function fetchAvailableCartons() {
    setLoadingCartons(true);
    const res = await fetch("/api/cartons");
    const all = await res.json();
    // Only show cartons not already in this batch and not dispatched
    const batchCartonIds = new Set((data?.cartons ?? []).map((c: any) => c.id));
    setAvailableCartons(
      (Array.isArray(all) ? all : []).filter((c: any) => !batchCartonIds.has(c.id) && c.status !== "dispatched" && !c.batchId)
    );
    setLoadingCartons(false);
  }

  async function assignCarton(cartonId: string) {
    setAssigningId(cartonId);
    await fetch(`/api/cartons/${cartonId}/assign-batch`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ batchId: id }),
    });
    await fetchData();
    // Refresh available list
    const res = await fetch("/api/cartons");
    const all = await res.json();
    const batchCartonIds = new Set((data?.cartons ?? []).map((c: any) => c.id));
    setAvailableCartons(
      (Array.isArray(all) ? all : []).filter((c: any) => !batchCartonIds.has(c.id) && c.status !== "dispatched" && !c.batchId)
    );
    setAssigningId(null);
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
    </div>
  );
  if (!data) return null;

  const { batch, cartons, breakdown } = data;
  const sc = statusConfig[batch.status];
  const totalPieces = breakdown.reduce((s: number, r: any) => s + parseInt(r.total_pieces || "0"), 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link href="/batches" className="flex items-center gap-2 text-slate-500 hover:text-slate-700 text-sm">
          <ArrowLeft size={16} /> Back to Batches
        </Link>
        {canDelete && (
          <button onClick={handleDelete} disabled={deleting}
            className={"flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg transition-colors " +
              (confirmDelete ? "bg-red-600 text-white" : "bg-red-50 text-red-600 hover:bg-red-100")}>
            <Trash2 size={14} />
            {deleting ? "Deleting…" : confirmDelete ? "Confirm?" : "Delete"}
          </button>
        )}
      </div>

      {/* Batch header card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Archive size={18} className="text-blue-600" />
              <h1 className="text-xl font-bold text-slate-800">{batch.name}</h1>
            </div>
            {batch.destination && (
              <p className="text-sm text-slate-500 mb-1">📍 {batch.destination}</p>
            )}
            {batch.notes && (
              <p className="text-xs text-slate-400">{batch.notes}</p>
            )}
          </div>
          <span className={"text-xs px-3 py-1 rounded-full border font-medium " + sc.color}>
            {sc.label}
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 text-center">
          <p className="text-2xl font-black text-blue-600">{cartons.length}</p>
          <p className="text-xs text-slate-500 mt-1">Cartons</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4 text-center">
          <p className="text-2xl font-black text-violet-600">{totalPieces}</p>
          <p className="text-xs text-slate-500 mt-1">Total Pieces</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4 text-center">
          <p className="text-2xl font-black text-emerald-600">{breakdown.length}</p>
          <p className="text-xs text-slate-500 mt-1">Products</p>
        </div>
      </div>

      {/* Product breakdown */}
      {breakdown.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="font-semibold text-slate-700 text-sm uppercase tracking-wide mb-3">
            Packing List
          </h2>
          <div className="space-y-2">
            {breakdown.map((row: any) => (
              <div key={row.product_id} className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0">
                {row.image_url && (
                  <img src={row.image_url} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" alt={row.name} />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-800 text-sm">{row.name}</p>
                  <div className="flex gap-1.5 mt-0.5 flex-wrap">
                    <span className="text-xs font-mono text-blue-600">{row.sku}</span>
                    {row.design_number && <span className="text-xs text-slate-400">D{row.design_number}</span>}
                    {row.color_category && <span className="text-xs text-slate-400">{row.color_category}</span>}
                    <span className="text-xs text-slate-400">{row.label_count} labels</span>
                  </div>
                </div>
                <span className="font-bold text-slate-700 flex-shrink-0">{row.total_pieces} pcs</span>
              </div>
            ))}
            <div className="flex items-center justify-between py-2 font-bold">
              <span className="text-slate-700">Total</span>
              <span className="text-violet-600 text-lg">{totalPieces} pcs</span>
            </div>
          </div>
        </div>
      )}

      {/* Cartons */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Cartons ({cartons.length})
          </h2>
          <div className="flex items-center gap-2">
            {canEdit && batch.status === "preparing" && cartons.length > 0 && (
              <button
                onClick={async () => {
                  for (const c of cartons) {
                    await fetch(`/api/cartons/${c.id}/assign-batch`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ batchId: null }),
                    });
                  }
                  fetchData();
                }}
                className="text-xs text-red-500 hover:text-red-700 font-medium">
                Remove All
              </button>
            )}
            {canEdit && batch.status === "preparing" && (
              <button
                onClick={() => {
                  const next = !showAddCarton;
                  setShowAddCarton(next);
                  if (next) { setAddMode("new"); fetchAvailableCartons(); }
                }}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium">
                {showAddCarton ? <X size={12} /> : <Plus size={12} />}
                {showAddCarton ? "Cancel" : "Add Carton"}
              </button>
            )}
          </div>
        </div>

        {showAddCarton && (
          <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
            {/* Mode toggle */}
            <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
              <button onClick={() => setAddMode("new")}
                className={"flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors " +
                  (addMode === "new" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500")}>
                Create New
              </button>
              <button onClick={() => setAddMode("existing")}
                className={"flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors " +
                  (addMode === "existing" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500")}>
                Add Existing
              </button>
            </div>

            {addMode === "new" ? (
              <form onSubmit={handleAddCarton} className="flex gap-2">
                <input value={cartonNotes} onChange={e => setCartonNotes(e.target.value)}
                  placeholder="Carton notes (optional)"
                  className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <button type="submit" disabled={addingCarton}
                  className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-60">
                  {addingCarton ? "…" : "Create"}
                </button>
              </form>
            ) : (
              <div className="space-y-2">
                {loadingCartons ? (
                  <p className="text-xs text-slate-400 text-center py-3">Loading cartons…</p>
                ) : availableCartons.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-3">No available cartons to assign</p>
                ) : (
                  <>
                    {/* Select all / Assign all */}
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <span className="text-xs text-slate-500">{availableCartons.length} cartons available</span>
                      <button
                        onClick={async () => {
                          for (const c of availableCartons) await assignCarton(c.id);
                        }}
                        className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-blue-700 transition-colors">
                        Assign All
                      </button>
                    </div>
                    {availableCartons.map(c => (
                      <div key={c.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                        <div>
                          <p className="text-sm font-mono font-semibold text-slate-800">{c.cartonNumber}</p>
                          <p className="text-xs text-slate-400">{c.totalPieces} pcs · {c.status}{c.notes ? " · " + c.notes : ""}</p>
                        </div>
                        <button
                          onClick={() => assignCarton(c.id)}
                          disabled={assigningId === c.id}
                          className="text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-60">
                          {assigningId === c.id ? "…" : "Assign"}
                        </button>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {cartons.length === 0 ? (
          <div className="text-center py-8 text-slate-400 bg-white rounded-2xl border border-slate-200">
            <Box size={28} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">No cartons yet. Add one above.</p>
          </div>
        ) : (
          cartons.map((c: any) => (
            <div key={c.id} className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-3">
              <Link href={"/cartons/" + c.id} className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-10 h-10 bg-violet-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Box size={18} className="text-violet-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 font-mono text-sm">{c.cartonNumber}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-slate-500">{c.totalPieces} pcs</span>
                    <span className={"text-xs px-2 py-0.5 rounded-full font-medium " + (cartonStatusColor[c.status] ?? "")}>
                      {c.status}
                    </span>
                    {c.notes && <span className="text-xs text-slate-400 truncate">{c.notes}</span>}
                  </div>
                </div>
              </Link>
              {canEdit && batch.status === "preparing" && (
                <button
                  onClick={async () => {
                    await fetch(`/api/cartons/${c.id}/assign-batch`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ batchId: null }),
                    });
                    fetchData();
                  }}
                  className="flex-shrink-0 text-xs px-2 py-1.5 rounded-lg bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-red-500 transition-colors"
                  title="Remove from batch"
                >
                  Remove
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {/* Batch actions */}
      {canEdit && batch.status !== "dispatched" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
          <h2 className="font-semibold text-slate-700 text-sm uppercase tracking-wide">Actions</h2>
          {batch.status === "preparing" && (
            <button onClick={() => updateStatus("sealed")} disabled={updating}
              className="w-full flex items-center justify-center gap-2 bg-amber-500 text-white py-3 rounded-xl font-medium hover:bg-amber-600 disabled:opacity-60 transition-colors">
              <Lock size={18} /> {updating ? "Sealing…" : "Seal Batch"}
            </button>
          )}
          {batch.status === "sealed" && (
            <button onClick={() => updateStatus("dispatched")} disabled={updating}
              className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white py-3 rounded-xl font-medium hover:bg-emerald-700 disabled:opacity-60 transition-colors">
              <Truck size={18} /> {updating ? "Dispatching…" : "Mark Batch Dispatched"}
            </button>
          )}
        </div>
      )}

      <p className="text-center text-xs text-slate-400 font-mono">
        Created {new Date(batch.createdAt).toLocaleString()}
      </p>
    </div>
  );
}
