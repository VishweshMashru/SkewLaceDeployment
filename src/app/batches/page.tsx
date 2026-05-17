"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, X, Truck, Package, Archive, ArrowRight } from "lucide-react";

interface Batch {
  id: string;
  name: string;
  destination: string | null;
  notes: string | null;
  status: "preparing" | "sealed" | "dispatched";
  totalPieces: number;
  createdAt: string;
}

const statusConfig = {
  preparing: { label: "Preparing",  color: "bg-blue-50 text-blue-700 border-blue-200",   icon: Package },
  sealed:    { label: "Sealed",     color: "bg-amber-50 text-amber-700 border-amber-200", icon: Archive },
  dispatched:{ label: "Dispatched", color: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: Truck },
};

export default function BatchesPage() {
  const [batches, setBatches]   = useState<Batch[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState({ name: "", destination: "", notes: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]       = useState("");

  async function fetchBatches() {
    const res = await fetch("/api/batches");
    const data = await res.json();
    setBatches(Array.isArray(data) ? data : []);
    setLoading(false);
  }
  useEffect(() => { fetchBatches(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true); setError("");
    const res = await fetch("/api/batches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setForm({ name: "", destination: "", notes: "" });
      setShowForm(false);
      fetchBatches();
    } else {
      const e = await res.json();
      setError(e.error || "Failed");
    }
    setSubmitting(false);
  }

  const grouped = {
    preparing:  batches.filter(b => b.status === "preparing"),
    sealed:     batches.filter(b => b.status === "sealed"),
    dispatched: batches.filter(b => b.status === "dispatched"),
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">Batches</h1>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">
          {showForm ? <X size={16} /> : <Plus size={16} />}
          {showForm ? "Cancel" : "New Batch"}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <h2 className="font-semibold text-slate-700 mb-4">Create Batch</h2>
          <form onSubmit={handleCreate} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Batch Name *</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Nigeria May 2026" required
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Destination</label>
              <input value={form.destination} onChange={e => setForm(f => ({ ...f, destination: e.target.value }))}
                placeholder="e.g. Lagos, Nigeria"
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Notes</label>
              <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="e.g. Buyer: Alhaji Musa, Order #1234"
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            {error && <p className="text-red-500 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</p>}
            <button type="submit" disabled={submitting}
              className="w-full bg-blue-600 text-white py-2.5 rounded-xl font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors">
              {submitting ? "Creating…" : "Create Batch"}
            </button>
          </form>
        </div>
      )}

      {loading ? (
        <div className="text-center text-slate-400 py-8">Loading...</div>
      ) : batches.length === 0 ? (
        <div className="text-center py-12">
          <Archive size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500">No batches yet. Create one to group cartons by order.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {(["preparing", "sealed", "dispatched"] as const).map(status => {
            const group = grouped[status];
            if (!group.length) return null;
            const { label, icon: Icon, color } = statusConfig[status];
            return (
              <div key={status} className="space-y-2">
                <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide px-1 flex items-center gap-1.5">
                  <Icon size={12} /> {label} ({group.length})
                </h2>
                {group.map(batch => (
                  <Link key={batch.id} href={"/batches/" + batch.id}
                    className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-3 hover:shadow-sm transition-all active:scale-[0.99] block">
                    <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Archive size={18} className="text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800">{batch.name}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {batch.destination && (
                          <span className="text-xs text-slate-400">{batch.destination}</span>
                        )}
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${color}`}>{label}</span>
                      </div>
                      {batch.notes && <p className="text-xs text-slate-400 mt-0.5 truncate">{batch.notes}</p>}
                    </div>
                    <ArrowRight size={16} className="text-slate-300 flex-shrink-0" />
                  </Link>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
