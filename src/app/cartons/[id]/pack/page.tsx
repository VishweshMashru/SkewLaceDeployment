"use client";
import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle, AlertCircle, Package, Camera, Keyboard, ChevronDown, ChevronUp, Check } from "lucide-react";
import QRScanner from "@/components/QRScanner";

type InputMode = "browse" | "camera" | "manual";

function QuickAdd({ max, onAdd, adding }: { max: number; onAdd: (n: number) => void; adding: boolean }) {
  const [val, setVal] = useState("");
  const n = parseInt(val);
  const valid = !isNaN(n) && n > 0 && n <= max;
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border-b border-slate-100">
      <span className="text-xs text-slate-500 flex-shrink-0">Add first</span>
      <input
        type="number" min={1} max={max} value={val}
        onChange={e => setVal(e.target.value)}
        onKeyDown={e => e.key === "Enter" && valid && onAdd(n)}
        placeholder={`1–${max}`}
        className="w-20 border border-slate-200 rounded-lg px-2 py-1 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
      />
      <span className="text-xs text-slate-400 flex-shrink-0">labels</span>
      <button
        onClick={() => valid && onAdd(n)}
        disabled={!valid || adding}
        className="ml-auto text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg font-medium disabled:opacity-40 hover:bg-blue-700 transition-colors flex-shrink-0">
        {adding ? "…" : "Add"}
      </button>
    </div>
  );
}

interface LabelRow { fg: any; product: any; }

interface ProductGroup {
  productId: string;
  productName: string;
  sku: string;
  imageUrl: string | null;
  available: LabelRow[];
  packed: LabelRow[];
}

export default function PackCartonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [carton, setCarton]             = useState<any>(null);
  const [loading, setLoading]           = useState(true);
  const [mode, setMode]                 = useState<InputMode>("browse");
  const [groups, setGroups]             = useState<ProductGroup[]>([]);
  const [loadingLabels, setLoadingLabels] = useState(false);
  const [selected, setSelected]         = useState<Set<string>>(new Set());
  const [collapsed, setCollapsed]       = useState<Set<string>>(new Set());
  const [bulkAdding, setBulkAdding]     = useState(false);
  const [toast, setToast]               = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [scannerActive, setScannerActive] = useState(false);
  const [manualInput, setManualInput]   = useState("");
  const [addingManual, setAddingManual] = useState(false);
  const [totalAdded, setTotalAdded]     = useState(0);
  const [labelsAdded, setLabelsAdded]   = useState(0);

  async function fetchCarton() {
    const res = await fetch(`/api/cartons/${id}`);
    const data = await res.json();
    setCarton(data.carton);
    setLoading(false);
  }

  async function fetchLabels() {
    setLoadingLabels(true);
    const res = await fetch("/api/finished-goods");
    const data = await res.json();
    const rows: LabelRow[] = Array.isArray(data) ? data : [];

    // Group by product - deduplicate properly
    const map = new Map<string, ProductGroup>();
    for (const row of rows) {
      const pid = row.fg.productId;
      if (!map.has(pid)) {
        map.set(pid, {
          productId: pid,
          productName: row.product?.name ?? "Unknown",
          sku: row.product?.sku ?? "",
          imageUrl: row.product?.imageUrl ?? null,
          available: [],
          packed: [],
        });
      }
      const g = map.get(pid)!;
      if (row.fg.status === "available") g.available.push(row);
      else if (row.fg.status === "packed" && row.fg.cartonId === id) g.packed.push(row);
    }
    setGroups(Array.from(map.values()).filter(g => g.available.length > 0 || g.packed.length > 0));
    setLoadingLabels(false);
  }

  useEffect(() => { fetchCarton(); fetchLabels(); }, [id]);
  useEffect(() => {
    if (mode === "camera") setScannerActive(true);
    else setScannerActive(false);
  }, [mode]);

  function showToast(type: "success" | "error", msg: string) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  }

  function toggleSelect(fgId: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(fgId)) next.delete(fgId); else next.add(fgId);
      return next;
    });
  }

  function selectAll(group: ProductGroup) {
    setSelected(prev => {
      const next = new Set(prev);
      group.available.forEach(row => next.add(row.fg.id));
      return next;
    });
  }

  function deselectAll(group: ProductGroup) {
    setSelected(prev => {
      const next = new Set(prev);
      group.available.forEach(row => next.delete(row.fg.id));
      return next;
    });
  }

  function toggleCollapse(productId: string) {
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId); else next.add(productId);
      return next;
    });
  }

  async function bulkAdd(ids: string[]) {
    if (!ids.length) return;
    setBulkAdding(true);
    try {
      const res = await fetch(`/api/cartons/${id}/bulk-add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      const result = await res.json();
      if (!res.ok) { showToast("error", result.error || "Failed"); return; }
      showToast("success", `✓ Added ${result.added} labels · ${result.totalQty} pcs`);
      setTotalAdded(prev => prev + result.totalQty);
      setLabelsAdded(prev => prev + result.added);
      setSelected(prev => { const next = new Set(prev); ids.forEach(id => next.delete(id)); return next; });
      await Promise.all([fetchCarton(), fetchLabels()]);
    } finally { setBulkAdding(false); }
  }

  async function addSingleManual(rawValue: string) {
    const fgId = rawValue.trim().includes("/finished-goods/")
      ? rawValue.trim().split("/finished-goods/").pop()?.split("?")[0] ?? rawValue.trim()
      : rawValue.trim();
    if (!fgId) return;
    setAddingManual(true);
    await bulkAdd([fgId]);
    setManualInput("");
    setAddingManual(false);
  }

  const selectedCount = selected.size;
  const selectedIds = Array.from(selected);

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
    </div>
  );
  if (!carton) return null;
  if (carton.status !== "open") return (
    <div className="text-center py-16">
      <Package size={24} className="mx-auto text-amber-500 mb-3" />
      <h2 className="font-bold text-slate-800 mb-2">Carton is {carton.status}</h2>
      <Link href={`/cartons/${id}`} className="text-blue-600 text-sm hover:underline">Back to carton</Link>
    </div>
  );

  return (
    <div className="space-y-4 pb-32">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium max-w-xs text-center ${
          toast.type === "success" ? "bg-emerald-600 text-white" : "bg-red-500 text-white"
        }`}>
          {toast.type === "success" ? <CheckCircle size={16} className="flex-shrink-0" /> : <AlertCircle size={16} className="flex-shrink-0" />}
          {toast.msg}
        </div>
      )}

      <div className="flex items-center justify-between">
        <Link href={`/cartons/${id}`} className="flex items-center gap-2 text-slate-500 hover:text-slate-700 text-sm">
          <ArrowLeft size={16} /> Back
        </Link>
      </div>

      {/* Carton info */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-violet-50 rounded-xl flex items-center justify-center">
            <Package size={18} className="text-violet-600" />
          </div>
          <div>
            <p className="font-bold text-slate-800 font-mono text-sm">{carton.cartonNumber}</p>
            <p className="text-xs text-slate-500">{carton.totalPieces} pcs packed</p>
          </div>
        </div>
        {(labelsAdded > 0) && (
          <div className="text-right">
            <p className="text-sm font-bold text-emerald-600">+{labelsAdded} labels</p>
            <p className="text-xs text-slate-400">+{totalAdded} pcs this session</p>
          </div>
        )}
      </div>

      {/* Mode toggle */}
      <div className="bg-white rounded-2xl border border-slate-200 p-1 flex gap-1">
        {(["browse", "camera", "manual"] as InputMode[]).map(m => (
          <button key={m} onClick={() => setMode(m)}
            className={`flex-1 py-2 rounded-xl text-xs font-medium transition-colors capitalize ${
              mode === m ? "bg-blue-600 text-white" : "text-slate-500 hover:bg-slate-50"
            }`}>
            {m === "browse" ? "📋 Browse" : m === "camera" ? "📷 Scan" : "⌨️ Paste"}
          </button>
        ))}
      </div>

      {/* Camera */}
      {mode === "camera" && (
        <div className="bg-white rounded-2xl border-2 border-blue-200 p-4">
          <QRScanner onScan={v => addSingleManual(v)} active={scannerActive} />
        </div>
      )}

      {/* Manual */}
      {mode === "manual" && (
        <div className="bg-white rounded-2xl border-2 border-blue-200 p-4 flex gap-2">
          <input value={manualInput} onChange={e => setManualInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addSingleManual(manualInput)}
            placeholder="Paste label ID or URL…"
            className="flex-1 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono" />
          <button onClick={() => addSingleManual(manualInput)} disabled={addingManual || !manualInput.trim()}
            className="bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium disabled:opacity-60 hover:bg-blue-700">
            Add
          </button>
        </div>
      )}

      {/* Browse — SKU folders */}
      {mode === "browse" && (
        <div className="space-y-3">
          {loadingLabels ? (
            <div className="text-center py-8 text-slate-400">Loading labels…</div>
          ) : groups.length === 0 ? (
            <div className="text-center py-8 text-slate-400 bg-white rounded-2xl border border-slate-200">
              <Package size={28} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">No available labels</p>
            </div>
          ) : (
            groups.map(group => {
              const isCollapsed = collapsed.has(group.productId);
              const allSelected = group.available.length > 0 && group.available.every(r => selected.has(r.fg.id));
              const someSelected = group.available.some(r => selected.has(r.fg.id));
              const groupSelectedIds = group.available.filter(r => selected.has(r.fg.id)).map(r => r.fg.id);

              return (
                <div key={group.productId} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                  {/* Group header */}
                  <div className="flex items-center gap-3 p-3 border-b border-slate-100">
                    {group.imageUrl ? (
                      <img src={group.imageUrl} className="w-10 h-10 rounded-xl object-cover flex-shrink-0" alt="" />
                    ) : (
                      <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Package size={16} className="text-emerald-600" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 text-sm truncate">{group.productName}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs font-mono text-blue-600">{group.sku}</span>
                        <span className="text-xs text-emerald-600 font-medium">{group.available.length} available</span>
                        {group.packed.length > 0 && <span className="text-xs text-slate-400">{group.packed.length} packed</span>}
                      </div>
                    </div>
                    {/* Select all / deselect all */}
                    {group.available.length > 0 && (
                      <button
                        onClick={() => allSelected ? deselectAll(group) : selectAll(group)}
                        className={`text-xs px-2.5 py-1.5 rounded-lg font-medium transition-colors flex-shrink-0 ${
                          allSelected ? "bg-blue-600 text-white" : "bg-blue-50 text-blue-600 hover:bg-blue-100"
                        }`}>
                        {allSelected ? "Deselect all" : "Select all"}
                      </button>
                    )}
                    <button onClick={() => toggleCollapse(group.productId)} className="text-slate-400 p-1">
                      {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                    </button>
                  </div>

                  {/* Quick-add by number */}
                  {group.available.length > 0 && (
                    <QuickAdd
                      max={group.available.length}
                      onAdd={(n) => bulkAdd(group.available.slice(0, n).map(r => r.fg.id))}
                      adding={bulkAdding}
                    />
                  )}

                  {/* Labels list */}
                  {!isCollapsed && (
                    <div className="divide-y divide-slate-50">
                      {group.available.map(row => {
                        const isChecked = selected.has(row.fg.id);
                        return (
                          <div key={row.fg.id}
                            onClick={() => toggleSelect(row.fg.id)}
                            className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${isChecked ? "bg-blue-50" : "hover:bg-slate-50"}`}>
                            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                              isChecked ? "bg-blue-600 border-blue-600" : "border-slate-300"
                            }`}>
                              {isChecked && <Check size={12} className="text-white" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-slate-500 font-mono">{row.fg.id.slice(-12)}</p>
                            </div>
                            <span className="text-sm font-semibold text-slate-700 flex-shrink-0">{row.fg.quantity} pcs</span>
                          </div>
                        );
                      })}
                      {/* Packed labels — collapsed section */}
                      {group.packed.length > 0 && (
                        <div className="px-4 py-2 bg-slate-50">
                          <p className="text-xs text-slate-400">{group.packed.length} already packed in this carton</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Sticky bottom bar when items selected */}
      {selectedCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200 shadow-lg z-40">
          <div className="max-w-2xl mx-auto flex items-center gap-3">
            <div className="flex-1">
              <p className="text-sm font-semibold text-slate-800">{selectedCount} label{selectedCount !== 1 ? "s" : ""} selected</p>
              <p className="text-xs text-slate-500">
                {groups.reduce((s, g) => s + g.available.filter(r => selected.has(r.fg.id)).reduce((a, r) => a + r.fg.quantity, 0), 0)} pcs total
              </p>
            </div>
            <button onClick={() => setSelected(new Set())}
              className="px-3 py-2 rounded-xl text-sm text-slate-500 hover:bg-slate-100 transition-colors">
              Clear
            </button>
            <button onClick={() => bulkAdd(selectedIds)} disabled={bulkAdding}
              className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors">
              {bulkAdding ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Adding…</>
              ) : (
                <><CheckCircle size={16} /> Add {selectedCount} to Carton</>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
