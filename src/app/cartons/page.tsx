"use client";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Box, X, Package, Trash2 } from "lucide-react";
import Link from "next/link";

const schema = z.object({ notes: z.string().optional() });
type FormData = z.infer<typeof schema>;

const statusColors: Record<string, string> = {
  open:       "bg-emerald-50 text-emerald-700 border-emerald-200",
  sealed:     "bg-amber-50 text-amber-700 border-amber-200",
  dispatched: "bg-blue-50 text-blue-700 border-blue-200",
};

export default function CartonsPage() {
  const [cartons, setCartons]         = useState<any[]>([]);
  const [showForm, setShowForm]       = useState(false);
  const [loading, setLoading]         = useState(true);
  const [submitting, setSubmitting]   = useState(false);
  const [error, setError]             = useState("");
  const [confirmId, setConfirmId]     = useState<string | null>(null);
  const [deletingId, setDeletingId]   = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState("");

  const { register, handleSubmit, reset } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function fetchCartons() {
    const res = await fetch("/api/cartons");
    setCartons(await res.json());
    setLoading(false);
  }
  useEffect(() => { fetchCartons(); }, []);

  async function onSubmit(data: FormData) {
    setSubmitting(true); setError("");
    try {
      const res = await fetch("/api/cartons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create carton");
      reset(); setShowForm(false); fetchCartons();
    } catch (e: any) { setError(e.message); }
    finally { setSubmitting(false); }
  }

  async function handleDelete(id: string) {
    if (confirmId !== id) { setConfirmId(id); setDeleteError(""); return; }
    setDeletingId(id);
    const res = await fetch(`/api/cartons/${id}`, { method: "DELETE" });
    if (res.ok) {
      setConfirmId(null);
      fetchCartons();
    } else {
      const err = await res.json();
      setDeleteError(err.error || "Delete failed");
      setConfirmId(null);
    }
    setDeletingId(null);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">Cartons</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-violet-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-violet-700 transition-colors"
        >
          {showForm ? <X size={16} /> : <Plus size={16} />}
          {showForm ? "Cancel" : "New Carton"}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <h2 className="font-semibold text-slate-700 mb-4">Create Carton</h2>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Notes (optional)</label>
              <input {...register("notes")} placeholder="e.g. Order #1234, Nigeria shipment"
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
            </div>
            {error && <p className="text-red-500 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</p>}
            <button type="submit" disabled={submitting}
              className="w-full bg-violet-600 text-white py-2.5 rounded-xl font-medium hover:bg-violet-700 disabled:opacity-60 transition-colors">
              {submitting ? "Creating..." : "Create Carton"}
            </button>
          </form>
        </div>
      )}

      {deleteError && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 flex items-center justify-between">
          {deleteError}
          <button onClick={() => setDeleteError("")}><X size={14} /></button>
        </div>
      )}

      {loading ? (
        <div className="text-center text-slate-400 py-8">Loading...</div>
      ) : cartons.length === 0 ? (
        <div className="text-center py-12">
          <Box size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500">No cartons yet. Create your first carton above.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {cartons.map((c) => (
            <div key={c.id} className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-3">
              <Link href={`/cartons/${c.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-10 h-10 bg-violet-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Box size={18} className="text-violet-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 font-mono text-sm">{c.cartonNumber}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-slate-500">
                      <Package size={10} className="inline mr-0.5" />{c.totalPieces} pcs
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${statusColors[c.status]}`}>{c.status}</span>
                  </div>
                  {c.notes && <p className="text-xs text-slate-400 mt-0.5 truncate">{c.notes}</p>}
                </div>
              </Link>
              <button
                onClick={() => handleDelete(c.id)}
                disabled={deletingId === c.id}
                className={`flex-shrink-0 flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg transition-colors ${
                  confirmId === c.id
                    ? "bg-red-600 text-white"
                    : "bg-red-50 text-red-500 hover:bg-red-100"
                }`}
              >
                <Trash2 size={12} />
                {confirmId === c.id ? "Confirm?" : "Delete"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
