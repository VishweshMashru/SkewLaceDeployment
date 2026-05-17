"use client";
import { use, useEffect, useState, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle, AlertCircle, Package, Camera, Keyboard, List, Search } from "lucide-react";
import QRScanner from "@/components/QRScanner";

interface PackedItem {
  id: string;
  quantity: number;
  productName: string;
}

type InputMode = "camera" | "manual" | "browse";

export default function PackCartonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [carton, setCarton]               = useState<any>(null);
  const [loading, setLoading]             = useState(true);
  const [input, setInput]                 = useState("");
  const [adding, setAdding]               = useState(false);
  const [toast, setToast]                 = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [localItems, setLocalItems]       = useState<PackedItem[]>([]);
  const [totalAdded, setTotalAdded]       = useState(0);
  const [mode, setMode]                   = useState<InputMode>("browse");
  const [scannerActive, setScannerActive] = useState(false);
  const [availableLabels, setAvailableLabels]   = useState<any[]>([]);
  const [filteredLabels, setFilteredLabels]     = useState<any[]>([]);
  const [loadingLabels, setLoadingLabels]       = useState(false);
  const [labelSearch, setLabelSearch]           = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const processingRef = useRef(false);

  async function fetchCarton() {
    const res = await fetch(`/api/cartons/${id}`);
    const data = await res.json();
    setCarton(data.carton);
    setLoading(false);
  }

  async function fetchAvailableLabels() {
    setLoadingLabels(true);
    const res = await fetch("/api/finished-goods");
    const data = await res.json();
    const available = (Array.isArray(data) ? data : []).filter((row: any) => row.fg.status === "available");
    setAvailableLabels(available);
    setFilteredLabels(available);
    setLoadingLabels(false);
  }

  useEffect(() => { fetchCarton(); fetchAvailableLabels(); }, [id]);

  useEffect(() => {
    if (mode === "camera") { setScannerActive(true); }
    else { setScannerActive(false); }
    if (mode === "manual") setTimeout(() => inputRef.current?.focus(), 100);
  }, [mode]);

  useEffect(() => {
    const q = labelSearch.toLowerCase();
    setFilteredLabels(
      availableLabels.filter(row =>
        row.product?.name?.toLowerCase().includes(q) ||
        row.fg.id.toLowerCase().includes(q) ||
        row.product?.sku?.toLowerCase().includes(q)
      )
    );
  }, [labelSearch, availableLabels]);

  function showToast(type: "success" | "error", msg: string) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  }

  async function addItem(rawValue: string) {
    if (processingRef.current) return;
    const fgId = rawValue.trim();
    if (!fgId) return;

    const extractedId = fgId.includes("/finished-goods/")
      ? fgId.split("/finished-goods/").pop()?.split("?")[0] ?? fgId
      : fgId;

    if (localItems.find(i => i.id === extractedId)) {
      showToast("error", "Already added this session");
      setInput("");
      return;
    }

    processingRef.current = true;
    setAdding(true);
    if (mode === "camera") setScannerActive(false);

    try {
      const fgRes = await fetch(`/api/finished-goods/${extractedId}`);
      if (!fgRes.ok) { showToast("error", "Label not found"); return; }
      const fgData = await fgRes.json();

      if (fgData.fg.status !== "available") {
        showToast("error", fgData.fg.status === "packed" ? "Already packed in another carton" : "Already dispatched");
        return;
      }

      const res = await fetch(`/api/cartons/${id}/add-item`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ finishedGoodsId: extractedId }),
      });
      if (!res.ok) { const err = await res.json(); showToast("error", err.error || "Failed"); return; }

      const result = await res.json();
      setLocalItems(prev => [{ id: extractedId, quantity: fgData.fg.quantity, productName: fgData.product?.name || "Unknown" }, ...prev]);
      setTotalAdded(prev => prev + result.addedQty);
      showToast("success", `✓ Added ${result.addedQty} pcs — ${fgData.product?.name}`);
      setInput("");
      // Remove from available list
      setAvailableLabels(prev => prev.filter(row => row.fg.id !== extractedId));
      fetchCarton();
    } finally {
      setAdding(false);
      processingRef.current = false;
      if (mode === "camera") setTimeout(() => setScannerActive(true), 1500);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) { if (e.key === "Enter") addItem(input); }
  function handleScan(value: string) { if (!adding && !processingRef.current) addItem(value); }

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
    <div className="space-y-4">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium max-w-xs ${
          toast.type === "success" ? "bg-emerald-600 text-white" : "bg-red-500 text-white"
        }`}>
          {toast.type === "success" ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {toast.msg}
        </div>
      )}

      <div className="flex items-center justify-between">
        <Link href={`/cartons/${id}`} className="flex items-center gap-2 text-slate-500 hover:text-slate-700 text-sm">
          <ArrowLeft size={16} /> Back to Carton
        </Link>
      </div>

      {/* Carton info */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-3">
        <div className="w-10 h-10 bg-violet-50 rounded-xl flex items-center justify-center">
          <Package size={18} className="text-violet-600" />
        </div>
        <div>
          <p className="font-bold text-slate-800 font-mono">{carton.cartonNumber}</p>
          <p className="text-xs text-slate-500">{carton.totalPieces} pcs packed · {localItems.length} added this session</p>
        </div>
      </div>

      {/* Mode toggle */}
      <div className="bg-white rounded-2xl border border-slate-200 p-1 flex gap-1">
        <button onClick={() => setMode("browse")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-medium transition-colors ${
            mode === "browse" ? "bg-blue-600 text-white" : "text-slate-500 hover:bg-slate-50"}`}>
          <List size={14} /> Browse
        </button>
        <button onClick={() => setMode("camera")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-medium transition-colors ${
            mode === "camera" ? "bg-blue-600 text-white" : "text-slate-500 hover:bg-slate-50"}`}>
          <Camera size={14} /> Scan QR
        </button>
        <button onClick={() => setMode("manual")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-medium transition-colors ${
            mode === "manual" ? "bg-blue-600 text-white" : "text-slate-500 hover:bg-slate-50"}`}>
          <Keyboard size={14} /> Paste ID
        </button>
      </div>

      {/* Browse available labels */}
      {mode === "browse" && (
        <div className="bg-white rounded-2xl border-2 border-blue-200 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-700 text-sm">Available Labels</h2>
            <span className="text-xs text-slate-400">{filteredLabels.length} labels</span>
          </div>
          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={labelSearch} onChange={e => setLabelSearch(e.target.value)}
              placeholder="Search by product or ID…"
              className="w-full border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          {loadingLabels ? (
            <div className="text-center py-4 text-slate-400 text-sm">Loading…</div>
          ) : filteredLabels.length === 0 ? (
            <div className="text-center py-4 text-slate-400 text-sm">
              {availableLabels.length === 0 ? "No available labels" : "No results"}
            </div>
          ) : (
            <div className="space-y-1 max-h-80 overflow-y-auto">
              {filteredLabels.map((row: any) => {
                const isAdded = localItems.some(i => i.id === row.fg.id);
                return (
                  <div key={row.fg.id}
                    className="flex items-center gap-3 py-2.5 px-2 rounded-xl hover:bg-slate-50 transition-colors">
                    {row.product?.imageUrl ? (
                      <img src={row.product.imageUrl} className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-9 h-9 bg-emerald-50 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Package size={14} className="text-emerald-600" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{row.product?.name}</p>
                      <p className="text-xs text-slate-400 font-mono">{row.fg.id.slice(-12)} · {row.fg.quantity} pcs</p>
                    </div>
                    <button
                      onClick={() => addItem(row.fg.id)}
                      disabled={adding || isAdded}
                      className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                        isAdded ? "bg-emerald-50 text-emerald-600" : "bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                      }`}>
                      {isAdded ? "✓ Added" : "Add"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Camera scanner */}
      {mode === "camera" && (
        <div className="bg-white rounded-2xl border-2 border-blue-200 p-4">
          <h2 className="font-semibold text-slate-700 mb-3 flex items-center gap-2 text-sm">
            <Camera size={16} className="text-blue-600" /> Camera Scanner
          </h2>
          <QRScanner onScan={handleScan} active={scannerActive} />
        </div>
      )}

      {/* Manual input */}
      {mode === "manual" && (
        <div className="bg-white rounded-2xl border-2 border-blue-200 p-4">
          <h2 className="font-semibold text-slate-700 mb-3 flex items-center gap-2 text-sm">
            <Keyboard size={16} className="text-blue-600" /> Paste Label ID
          </h2>
          <div className="flex gap-2">
            <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown} placeholder="FG-XXXXXXXX or full URL..."
              className="flex-1 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono" />
            <button onClick={() => addItem(input)} disabled={adding || !input.trim()}
              className="bg-blue-600 text-white px-4 py-2.5 rounded-xl font-medium text-sm hover:bg-blue-700 disabled:opacity-60 transition-colors">
              {adding ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : "Add"}
            </button>
          </div>
        </div>
      )}

      {/* Session summary */}
      {localItems.length > 0 && (
        <>
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-emerald-800 font-medium">{localItems.length} added this session</span>
            <span className="text-sm font-bold text-emerald-700">{totalAdded} pcs</span>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2">
            {localItems.map(item => (
              <div key={item.id} className="flex items-center gap-3 py-1.5 border-b border-slate-100 last:border-0">
                <CheckCircle size={14} className="text-emerald-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{item.productName}</p>
                  <p className="text-xs text-slate-400 font-mono">{item.id.slice(-12)}</p>
                </div>
                <span className="text-sm font-semibold text-slate-700">{item.quantity} pcs</span>
              </div>
            ))}
          </div>
        </>
      )}

      <Link href={`/cartons/${id}`}
        className="w-full flex items-center justify-center gap-2 bg-slate-100 text-slate-700 py-3 rounded-xl font-medium hover:bg-slate-200 transition-colors">
        Done Packing
      </Link>
    </div>
  );
}
