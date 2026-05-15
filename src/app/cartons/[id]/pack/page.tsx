"use client";
import { use, useEffect, useState, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle, AlertCircle, Package, Camera, CameraOff, Keyboard } from "lucide-react";
import QRScanner from "@/components/QRScanner";

interface PackedItem {
  id: string;
  label: string;
  quantity: number;
  productName: string;
}

type InputMode = "camera" | "manual";

export default function PackCartonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [carton, setCarton]         = useState<any>(null);
  const [loading, setLoading]       = useState(true);
  const [input, setInput]           = useState("");
  const [adding, setAdding]         = useState(false);
  const [toast, setToast]           = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [localItems, setLocalItems] = useState<PackedItem[]>([]);
  const [totalAdded, setTotalAdded] = useState(0);
  const [mode, setMode]             = useState<InputMode>("camera");
  const [scannerActive, setScannerActive] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const processingRef = useRef(false); // prevent double-scan

  async function fetchCarton() {
    const res = await fetch(`/api/cartons/${id}`);
    const data = await res.json();
    setCarton(data.carton);
    setLoading(false);
  }
  useEffect(() => { fetchCarton(); }, [id]);

  // When switching to manual, pause camera
  useEffect(() => {
    if (mode === "manual") {
      setScannerActive(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setScannerActive(true);
    }
  }, [mode]);

  function showToast(type: "success" | "error", msg: string) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  }

  async function addItem(rawValue: string) {
    if (processingRef.current) return;
    const fgId = rawValue.trim();
    if (!fgId) return;

    // Extract ID from full URL if camera scanned a URL
    const extractedId = fgId.includes("/finished-goods/")
      ? fgId.split("/finished-goods/").pop()?.split("?")[0] ?? fgId
      : fgId;

    if (localItems.find((i) => i.id === extractedId)) {
      showToast("error", "Already added in this session");
      setInput("");
      return;
    }

    processingRef.current = true;
    setAdding(true);

    // Pause camera while processing to avoid re-scan
    if (mode === "camera") setScannerActive(false);

    try {
      const fgRes = await fetch(`/api/finished-goods/${extractedId}`);
      if (!fgRes.ok) { showToast("error", "Label not found"); return; }
      const fgData = await fgRes.json();

      if (fgData.fg.status !== "available") {
        showToast("error",
          fgData.fg.status === "packed" ? "Already packed in another carton" : "Already dispatched"
        );
        return;
      }

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
      setLocalItems((prev) => [{
        id: extractedId,
        label: fgData.fg.label || extractedId,
        quantity: fgData.fg.quantity,
        productName: fgData.product?.name || "Unknown",
      }, ...prev]);
      setTotalAdded((prev) => prev + result.addedQty);
      showToast("success", `✓ Added ${result.addedQty} pcs — ${fgData.product?.name}`);
      setInput("");
      fetchCarton();
    } finally {
      setAdding(false);
      processingRef.current = false;
      // Resume camera after a short delay so the success toast is visible
      if (mode === "camera") {
        setTimeout(() => setScannerActive(true), 1500);
      }
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") addItem(input);
  }

  function handleScan(value: string) {
    if (!adding && !processingRef.current) {
      addItem(value);
    }
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
    <div className="space-y-4">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium transition-all max-w-xs text-center ${
          toast.type === "success" ? "bg-emerald-600 text-white" : "bg-red-500 text-white"
        }`}>
          {toast.type === "success" ? <CheckCircle size={16} className="flex-shrink-0" /> : <AlertCircle size={16} className="flex-shrink-0" />}
          {toast.msg}
        </div>
      )}

      <div className="flex items-center justify-between">
        <Link href={`/cartons/${id}`} className="flex items-center gap-2 text-slate-500 hover:text-slate-700 text-sm">
          <ArrowLeft size={16} /> Back to Carton
        </Link>
      </div>

      {/* Carton info */}
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

      {/* Mode toggle */}
      <div className="bg-white rounded-2xl border border-slate-200 p-1 flex gap-1">
        <button
          onClick={() => setMode("camera")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-colors ${
            mode === "camera" ? "bg-blue-600 text-white" : "text-slate-500 hover:bg-slate-50"
          }`}
        >
          <Camera size={16} /> Scan QR
        </button>
        <button
          onClick={() => setMode("manual")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-colors ${
            mode === "manual" ? "bg-blue-600 text-white" : "text-slate-500 hover:bg-slate-50"
          }`}
        >
          <Keyboard size={16} /> Paste ID
        </button>
      </div>

      {/* Camera scanner */}
      {mode === "camera" && (
        <div className="bg-white rounded-2xl border-2 border-blue-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Camera size={18} className="text-blue-600" />
              <h2 className="font-semibold text-slate-700">Camera Scanner</h2>
            </div>
            {adding && (
              <div className="flex items-center gap-1.5 text-xs text-blue-600">
                <div className="w-3 h-3 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
                Adding…
              </div>
            )}
          </div>
          <QRScanner onScan={handleScan} active={scannerActive} />
        </div>
      )}

      {/* Manual input */}
      {mode === "manual" && (
        <div className="bg-white rounded-2xl border-2 border-blue-200 p-4">
          <h2 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <Keyboard size={18} className="text-blue-600" /> Paste Label ID
          </h2>
          <div className="flex gap-2">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="FG-XXXXXXXX or full URL..."
              className="flex-1 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
            />
            <button
              onClick={() => addItem(input)}
              disabled={adding || !input.trim()}
              className="flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2.5 rounded-xl font-medium text-sm hover:bg-blue-700 disabled:opacity-60 transition-colors"
            >
              {adding ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : "Add"}
            </button>
          </div>
        </div>
      )}

      {/* Session summary */}
      {localItems.length > 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex items-center justify-between">
          <span className="text-sm text-emerald-800 font-medium">
            {localItems.length} label{localItems.length !== 1 ? "s" : ""} added this session
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
                  <p className="text-xs text-slate-400 font-mono truncate">{item.id}</p>
                </div>
                <span className="text-sm font-semibold text-slate-700 flex-shrink-0">{item.quantity} pcs</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {localItems.length === 0 && mode === "manual" && (
        <div className="text-center py-8 text-slate-400">
          <Keyboard size={36} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm">Paste a label ID above to add it to this carton.</p>
        </div>
      )}

      <Link href={`/cartons/${id}`}
        className="w-full flex items-center justify-center gap-2 bg-slate-100 text-slate-700 py-3 rounded-xl font-medium hover:bg-slate-200 transition-colors">
        Done Packing
      </Link>
    </div>
  );
}
