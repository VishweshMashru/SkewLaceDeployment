"use client";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Box, X, Trash2, ChevronDown, ChevronUp, Warehouse, Truck, MapPin } from "lucide-react";
import { useRouter } from "next/navigation";

const schema = z.object({
  notes: z.string().optional(),
  purpose: z.enum(["dispatch", "storage"]),
  storageLocation: z.string().optional(),
});
type FormData = z.infer<typeof schema>;
type StatusFilter = "all" | "open" | "sealed" | "dispatched" | "storage";

const statusColors: Record<string, string> = {
  open:       "bg-emerald-50 text-emerald-700 border-emerald-200",
  sealed:     "bg-amber-50 text-amber-700 border-amber-200",
  dispatched: "bg-blue-50 text-blue-700 border-blue-200",
};

function formatDateLabel(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
}

export default function CartonsPage() {
  const [cartons, setCartons]         = useState<any[]>([]);
  const [loading, setLoading]         = useState(true);
  const [showForm, setShowForm]       = useState(false);
  const [submitting, setSubmitting]   = useState(false);
  const [error, setError]             = useState("");
  const [confirmId, setConfirmId]     = useState<string | null>(null);
  const [deletingId, setDeletingId]   = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [collapsedDates, setCollapsedDates] = useState<Set<string>>(new Set());
  const router = useRouter();

  const { register, handleSubmit, watch, reset } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { purpose: "dispatch" },
  });
  const purpose = watch("purpose");

  async function fetchCartons() {
    const res = await fetch("/api/cartons");
    const data = await res.json();
    setCartons(Array.isArray(data) ? data : []);
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
      if (!res.ok) throw new Error("Failed");
      reset(); setShowForm(false); fetchCartons();
    } catch (e: any) { setError(e.message); }
    finally { setSubmitting(false); }
  }

  async function handleDelete(id: string) {
    if (confirmId !== id) { setConfirmId(id); setDeleteError(""); return; }
    setDeletingId(id);
    const res = await fetch(`/api/cartons/${id}`, { method: "DELETE" });
    if (res.ok) { setConfirmId(null); fetchCartons(); }
    else { const err = await res.json(); setDeleteError(err.error || "Delete failed"); setConfirmId(null); }
    setDeletingId(null);
  }

  function isDateCollapsed(key: string, isToday: boolean) {
    if (collapsedDates.has(key + "_open")) return false;
    if (collapsedDates.has(key)) return true;
    return !isToday;
  }

  function toggleDate(key: string, isToday: boolean) {
    setCollapsedDates(prev => {
      const next = new Set(prev);
      if (!isToday) {
        next.has(key + "_open") ? next.delete(key + "_open") : next.add(key + "_open");
      } else {
        next.has(key) ? next.delete(key) : next.add(key);
      }
      return next;
    });
  }

  // Filter
  const filtered = cartons.filter(c => {
    if (statusFilter === "storage") return c.purpose === "storage";
    if (statusFilter === "all") return true;
    return c.purpose !== "storage" && c.status === statusFilter;
  });

  const counts = {
    all:        cartons.length,
    open:       cartons.filter(c => c.purpose !== "storage" && c.status === "open").length,
    sealed:     cartons.filter(c => c.purpose !== "storage" && c.status === "sealed").length,
    dispatched: cartons.filter(c => c.status === "dispatched").length,
    storage:    cartons.filter(c => c.purpose === "storage").length,
  };

  // Group by date
  const groups: Record<string, any[]> = {};
  for (const c of filtered) {
    const key = new Date(c.createdAt).toDateString();
    if (!groups[key]) groups[key] = [];
    groups[key].push(c);
  }
  const today = new Date().toDateString();
  const dateKeys = Object.keys(groups);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">Cartons</h1>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-violet-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-violet-700 transition-colors">
          {showForm ? <X size={16} /> : <Plus size={16} />}
          {showForm ? "Cancel" : "New Carton"}
        </button>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-2 bg-white border border-slate-200 rounded-2xl p-1 overflow-x-auto">
        {([
          ["all",        "All",       counts.all],
          ["open",       "Open",      counts.open],
          ["sealed",     "Sealed",    counts.sealed],
          ["dispatched", "Dispatched",counts.dispatched],
          ["storage",    "Storage",   counts.storage],
        ] as [StatusFilter, string, number][]).map(([key, label, count]) => (
          <button key={key} onClick={() => setStatusFilter(key)}
            className={`flex-shrink-0 px-7 py-1.5 rounded-xl text-xs font-medium transition-colors ${
              statusFilter === key ? "bg-violet-600 text-white" : "text-slate-500 hover:bg-slate-50"
            }`}>
            {label} ({count})
          </button>
        ))}
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <h2 className="font-semibold text-slate-700 mb-4">Create Carton</h2>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            {/* Purpose toggle */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Purpose</label>
              <div className="grid grid-cols-2 gap-2">
                <label className="cursor-pointer">
                  <input type="radio" {...register("purpose")} value="dispatch" className="sr-only" />
                  <div className={`flex items-center gap-2 border-2 rounded-xl p-3 transition-colors ${
                    purpose === "dispatch" ? "border-violet-500 bg-violet-50" : "border-slate-200 hover:border-slate-300"
                  }`}>
                    <Truck size={16} className={purpose === "dispatch" ? "text-violet-600" : "text-slate-400"} />
                    <div>
                      <p className={`text-sm font-medium ${purpose === "dispatch" ? "text-violet-700" : "text-slate-600"}`}>Dispatch</p>
                      <p className="text-xs text-slate-400">For shipping to buyer</p>
                    </div>
                  </div>
                </label>
                <label className="cursor-pointer">
                  <input type="radio" {...register("purpose")} value="storage" className="sr-only" />
                  <div className={`flex items-center gap-2 border-2 rounded-xl p-3 transition-colors ${
                    purpose === "storage" ? "border-emerald-500 bg-emerald-50" : "border-slate-200 hover:border-slate-300"
                  }`}>
                    <Warehouse size={16} className={purpose === "storage" ? "text-emerald-600" : "text-slate-400"} />
                    <div>
                      <p className={`text-sm font-medium ${purpose === "storage" ? "text-emerald-700" : "text-slate-600"}`}>Storage</p>
                      <p className="text-xs text-slate-400">Stays in warehouse</p>
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* Storage location — only if storage */}
            {purpose === "storage" && (
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  <MapPin size={11} className="inline mr-1" />Storage Location
                </label>
                <input {...register("storageLocation")} placeholder="e.g. Rack B-3, Corner Shelf, Warehouse 2"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Notes (optional)</label>
              <input {...register("notes")} placeholder={purpose === "storage" ? "e.g. Excess stock, Off-season" : "e.g. JDT order, 22kg"}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
            </div>

            {error && <p className="text-red-500 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</p>}
            <button type="submit" disabled={submitting}
              className={`w-full text-white py-2.5 rounded-xl font-medium disabled:opacity-60 transition-colors ${
                purpose === "storage" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-violet-600 hover:bg-violet-700"
              }`}>
              {submitting ? "Creating..." : `Create ${purpose === "storage" ? "Storage" : "Dispatch"} Carton`}
            </button>
          </form>
        </div>
      )}

      {deleteError && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 flex items-center justify-between">
          {deleteError}<button onClick={() => setDeleteError("")}><X size={14} /></button>
        </div>
      )}

      {loading ? (
        <div className="text-center text-slate-400 py-8">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <Box size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500">
            {statusFilter === "storage" ? "No storage cartons" : statusFilter !== "all" ? `No ${statusFilter} cartons` : "No cartons yet"}
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {dateKeys.map(dateKey => {
            const group = groups[dateKey];
            const isToday = dateKey === today;
            const collapsed = isDateCollapsed(dateKey, isToday);
            const label = formatDateLabel(group[0].createdAt);

            return (
              <div key={dateKey} className="space-y-2">
                <button onClick={() => toggleDate(dateKey, isToday)}
                  className="w-full flex items-center justify-between px-1 py-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold uppercase tracking-wide ${isToday ? "text-violet-600" : "text-slate-400"}`}>
                      {label}
                    </span>
                    {isToday && <span className="text-xs bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded-full font-medium">Today</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">{group.length} cartons</span>
                    {collapsed ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronUp size={14} className="text-slate-400" />}
                  </div>
                </button>

                {!collapsed && (
                  <div className="space-y-2">
                    {group.map((c: any) => (
                      <div key={c.id} className={`bg-white rounded-2xl border p-4 flex items-center gap-3 ${
                        c.purpose === "storage" ? "border-emerald-200" : "border-slate-200"
                      }`}>
                        <div onClick={() => router.push(`/cartons/${c.id}`)}
                          className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                            c.purpose === "storage" ? "bg-emerald-50" : "bg-violet-50"
                          }`}>
                            {c.purpose === "storage"
                              ? <Warehouse size={18} className="text-emerald-600" />
                              : <Box size={18} className="text-violet-600" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-slate-800 font-mono text-sm">{c.cartonNumber}</p>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              <span className="text-xs text-slate-500">{c.totalPieces} pcs</span>
                              {c.purpose === "storage" ? (
                                <span className="text-xs px-2 py-0.5 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200">storage</span>
                              ) : (
                                <span className={`text-xs px-2 py-0.5 rounded-full border ${statusColors[c.status]}`}>{c.status}</span>
                              )}
                              {c.storageLocation && (
                                <span className="text-xs text-slate-400 flex items-center gap-0.5">
                                  <MapPin size={10} />{c.storageLocation}
                                </span>
                              )}
                              {c.notes && <span className="text-xs text-slate-400 truncate max-w-[100px]">{c.notes}</span>}
                            </div>
                          </div>
                        </div>
                        <button onClick={() => handleDelete(c.id)} disabled={deletingId === c.id}
                          className={`flex-shrink-0 flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg transition-colors ${
                            confirmId === c.id ? "bg-red-600 text-white" : "bg-red-50 text-red-500 hover:bg-red-100"
                          }`}>
                          <Trash2 size={12} />
                          {confirmId === c.id ? "Confirm?" : "Delete"}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
