"use client";
import { use, useEffect, useState, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, ScanLine, Plus, X, CheckCircle, AlertCircle, Package } from "lucide-react";

interface PackedItem {
  id: string;
  label: string;
  quantity: number;
  productName: string;
}

export default function PackCartonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [carton, setCarton] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [adding, setAdding] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [localItems, setLocalItems] = useState<PackedItem[]>([]);
  const [totalAdded, setTotalAdded] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  async function fetchCarton() {
    const res = await fetch(`/api/cartons/${id}`);
    const data = await res.json();
    setCarton(data.carton);
    setLoading(false);
  }

  useEffect(() => { fetchCarton(); }, [id]);

  function showToast(type: "success" | "error", msg: string) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  }

  async function addItem() {
    const fgId = input.trim();
    if (!fgId) return;

    // If it's a full URL, extract the ID
    const extractedId = fgId.includes("/finished-goods/")
      ? fgId.split("/finished-goods/").pop()?.split("?")[0] ?? fgId
      : fgId;

    // Check duplicate in local list
    if (localItems.find((i) => i.id === extractedId)) {
      showToast("error", "Already added in this session");
      setInput("");
      return;
    }

    setAdding(true);
    try {
      // First fetch the FG details
      const fgRes = await fetch(`/api/finished-goods/${extractedId}`);
      if (!fgRes.ok) {
        showToast("error", "Label not found");
        return;
      }
      const fgData = await fgRes.json();

      if (fgData.fg.status !== "available") {
        showToast("error", `Already ${fgData.fg.status === "packed" ? "packed in another carton" : "dispatched"}`);
        return;
      }

      // Add to carton
      const res = await fetch(`/api/cartons/${id}/add-item`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ finishedGoodsId: extractedId }),
      });

      if (!res.ok) {
        const err = await res.json();
        showToast("error", err.error || "Failed to add");
        return;
      }

      const result = await res.json();
      setLocalItems((prev) => [
        {
          id: extractedId,
          label: fgData.fg.label || extractedId,
          quantity: fgData.fg.quantity,
          productName: fgData.product?.name || "Unknown",
        },
        ...prev,
      ]);
      setTotalAdded((prev) => prev + result.addedQty);
      showToast("success", `Added ${result.addedQty} pcs`);
      setInput("");
      inputRef.current?.focus();
      fetchCarton();
    } finally {
      setAdding(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") addItem();
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
    </div>
  );

  if (!carton) return null;

  if (carton.status !== "open") return (
    <div className="text-center py-16">
      <div className="w-14 h-14 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4">
        <Package size={24} className="text-amber-500" />
      </div>
      <h2 className="font-bold text-slate-800 mb-2">Carton is {carton.status}</h2>
      <p className="text-slate-500 text-sm mb-4">Only open cartons can accept new items.</p>
      <Link href={`/cartons/${id}`} className="text-blue-600 text-sm hover:underline">Back to carton</Link>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium transition-all ${
          toast.type === "success"
            ? "bg-emerald-600 text-white"
            : "bg-red-500 text-white"
        }`}>
          {toast.type === "success" ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {toast.msg}
        </div>
      )}

      <div className="flex items-center justify-between">
        <Link href={`/cartons/${id}`} className="flex items-center gap-2 text-slate-500 hover:text-slate-700 text-sm">
          <ArrowLeft size={16} />
          Back to Carton
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-violet-50 rounded-xl flex items-center justify-center">
            <Package size={18} className="text-violet-600" />
          </div>
          <div>
            <p className="font-bold text-slate-800 font-mono">{carton.cartonNumber}</p>
            <p className="text-xs text-slate-500">{carton.totalPieces} pcs packed so far</p>
          </div>
        </div>
      </div>

      {/* Scan/Add input */}
      <div className="bg-white rounded-2xl border-2 border-blue-200 p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <ScanLine size={18} className="text-blue-600" />
          <h2 className="font-semibold text-slate-700">Scan or Paste QR Code</h2>
        </div>
        <p className="text-xs text-slate-500 mb-3">
          Scan a finished goods QR with your phone camera, or paste the label ID / URL below.
        </p>
        <div className="flex gap-2">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Paste label ID or scan QR..."
            autoFocus
            className="flex-1 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
          />
          <button
            onClick={addItem}
            disabled={adding || !input.trim()}
            className="flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2.5 rounded-xl font-medium text-sm hover:bg-blue-700 disabled:opacity-60 transition-colors"
          >
            {adding ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Plus size={16} />
            )}
            Add
          </button>
        </div>
      </div>

      {/* Session summary */}
      {localItems.length > 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex items-center justify-between">
          <span className="text-sm text-emerald-800 font-medium">
            Added this session: <strong>{localItems.length} labels</strong>
          </span>
          <span className="text-sm font-bold text-emerald-700">{totalAdded} pcs</span>
        </div>
      )}

      {/* Live list */}
      {localItems.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="font-semibold text-slate-700 text-sm uppercase tracking-wide mb-3">Added This Session</h2>
          <div className="space-y-2">
            {localItems.map((item) => (
              <div key={item.id} className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0">
                <CheckCircle size={16} className="text-emerald-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{item.productName}</p>
                  <p className="text-xs text-slate-400 font-mono truncate">{item.id.slice(-16)}</p>
                </div>
                <span className="text-sm font-semibold text-slate-700 flex-shrink-0">{item.quantity} pcs</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {localItems.length === 0 && (
        <div className="text-center py-8 text-slate-400">
          <ScanLine size={36} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm">Scan or paste finished goods labels to pack them into this carton.</p>
        </div>
      )}

      <Link
        href={`/cartons/${id}`}
        className="w-full flex items-center justify-center gap-2 bg-slate-100 text-slate-700 py-3 rounded-xl font-medium hover:bg-slate-200 transition-colors"
      >
        Done Packing
      </Link>
    </div>
  );
}
