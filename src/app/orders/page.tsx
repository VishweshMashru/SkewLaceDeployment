"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Plus, X, ScanLine, Loader2, ClipboardList, ArrowRight, CheckCircle, Clock, Package, Truck } from "lucide-react";

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  open:        { label: "Open",        color: "bg-blue-50 text-blue-700 border-blue-200",     icon: Clock },
  in_progress: { label: "In Progress", color: "bg-amber-50 text-amber-700 border-amber-200",  icon: Package },
  completed:   { label: "Completed",   color: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: CheckCircle },
  cancelled:   { label: "Cancelled",   color: "bg-slate-100 text-slate-500 border-slate-200", icon: X },
};

const typeConfig: Record<string, { label: string; color: string }> = {
  production: { label: "Production", color: "bg-violet-50 text-violet-700" },
  purchase:   { label: "Purchase",   color: "bg-blue-50 text-blue-700"    },
};

function ProgressBar({ actual, target }: { actual: number; target: number }) {
  const pct = Math.min(100, target > 0 ? Math.round((actual / target) * 100) : 0);
  return (
    <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1">
      <div
        className={"h-1.5 rounded-full transition-all " + (pct >= 100 ? "bg-emerald-500" : "bg-blue-500")}
        style={{ width: pct + "%" }}
      />
    </div>
  );
}

export default function OrdersPage() {
  const [orders, setOrders]       = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [scanning, setScanning]   = useState(false);
  const [scanResult, setScanResult] = useState<any | null>(null);
  const [scanError, setScanError] = useState("");
  const [saving, setSaving]       = useState(false);
  const [statusFilter, setStatusFilter] = useState("open");
  const [showManual, setShowManual] = useState(false);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [manualForm, setManualForm] = useState({
    title: "", buyerName: "", orderDate: "", type: "production", notes: "",
  });
  const [manualLines, setManualLines] = useState([
    { productId: "", sku: "", productName: "", colorCategory: "", designNumber: "", targetQty: "", skuStatus: "" as "" | "found" | "notfound" }
  ]);
  const scanInputRef = useRef<HTMLInputElement>(null);

  async function fetchOrders() {
    const res = await fetch("/api/orders");
    const data = await res.json();
    setOrders(Array.isArray(data) ? data : []);
    setLoading(false);
  }
  useEffect(() => {
    fetchOrders();
    fetch("/api/products").then(r => r.json()).then(d => setAllProducts(Array.isArray(d) ? d : []));
  }, []);

  async function handleScan(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setScanning(true); setScanError(""); setScanResult(null);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await fetch("/api/orders/scan", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Scan failed");
      setScanResult(data);
    } catch (e: any) { setScanError(e.message); }
    finally { setScanning(false); if (scanInputRef.current) scanInputRef.current.value = ""; }
  }

  async function handleConfirmOrder() {
    if (!scanResult) return;
    setSaving(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(scanResult),
      });
      if (!res.ok) throw new Error("Failed to save order");
      setScanResult(null);
      fetchOrders();
    } catch (e: any) { setScanError(e.message); }
    finally { setSaving(false); }
  }

  async function handleSaveManual() {    if (!manualForm.title.trim()) return;
    const validLines = manualLines.filter(l => l.productName.trim() && parseInt(l.targetQty) > 0);
    if (!validLines.length) return;
    setSaving(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...manualForm,
          lines: validLines.map(l => ({
            productId: l.productId || null,
            productName: l.productName,
            colorCategory: l.colorCategory,
            designNumber: l.designNumber,
            targetQty: parseInt(l.targetQty),
          })),
        }),
      });
      if (!res.ok) throw new Error("Failed");
      setShowManual(false);
      setManualForm({ title: "", buyerName: "", orderDate: "", type: "production", notes: "" });
      setManualLines([{ productId: "", sku: "", productName: "", colorCategory: "", designNumber: "", targetQty: "", skuStatus: "" }]);
      fetchOrders();
    } catch (e: any) { setScanError(e.message); }
    finally { setSaving(false); }
  }

  function addLine() {
    setManualLines(prev => [...prev, { productId: "", sku: "", productName: "", colorCategory: "", designNumber: "", targetQty: "", skuStatus: "" as "" | "found" | "notfound" }]);
  }

  function updateLine(i: number, field: string, value: string) {
    setManualLines(prev => { const n = [...prev]; n[i] = { ...n[i], [field]: value }; return n; });
  }

  function lookupSku(i: number, sku: string) {
    const trimmed = sku.trim().toUpperCase();
    const match = allProducts.find(p => p.sku.toUpperCase() === trimmed);
    if (match) {
      setManualLines(prev => {
        const n = [...prev];
        n[i] = {
          ...n[i],
          sku,
          productId: match.id,
          productName: match.name,
          colorCategory: match.colorCategory ?? "",
          designNumber: match.designNumber ?? "",
          skuStatus: "found",
        };
        return n;
      });
    } else {
      setManualLines(prev => {
        const n = [...prev];
        n[i] = { ...n[i], sku, skuStatus: trimmed ? "notfound" : "" };
        return n;
      });
    }
  }

  function removeLine(i: number) {
    setManualLines(prev => prev.filter((_, j) => j !== i));
  }

  const filtered = orders.filter((o: any) => statusFilter === "all" || o.status === statusFilter);
  const aiEnabled = process.env.NEXT_PUBLIC_AI_ENABLED !== "false";
  const counts = {
    all: orders.length,
    open: orders.filter(o => o.status === "open").length,
    in_progress: orders.filter(o => o.status === "in_progress").length,
    completed: orders.filter(o => o.status === "completed").length,
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">Orders</h1>
      <div className="flex items-center gap-2">
          {aiEnabled && <>
            <button onClick={() => scanInputRef.current?.click()} disabled={scanning}
              className="flex items-center gap-2 bg-violet-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-violet-700 disabled:opacity-60 transition-colors">
              {scanning ? <Loader2 size={16} className="animate-spin" /> : <ScanLine size={16} />}
              {scanning ? "Scanning…" : "Scan"}
            </button>
            <input ref={scanInputRef} type="file" accept="image/*" capture="environment" onChange={handleScan} className="hidden" />
          </>}
          <button onClick={() => { setShowManual(!showManual); setScanResult(null); }}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">
            {showManual ? <X size={16} /> : <Plus size={16} />}
            {showManual ? "Cancel" : "Manual"}
          </button>
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 bg-white border border-slate-200 rounded-2xl p-1">
        {([
          ["all", "All"],
          ["open", "Open"],
          ["in_progress", "In Progress"],
          ["completed", "Done"],
        ] as [string, string][]).map(([key, label]) => (
          <button key={key} onClick={() => setStatusFilter(key)}
            className={"flex-1 py-1.5 rounded-xl text-xs font-medium transition-colors " +
              (statusFilter === key ? "bg-violet-600 text-white" : "text-slate-500 hover:bg-slate-50")}>
            {label} ({counts[key as keyof typeof counts] ?? orders.length})
          </button>
        ))}
      </div>

      {scanError && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 flex items-center justify-between">
          {scanError}<button onClick={() => setScanError("")}><X size={14} /></button>
        </div>
      )}

      {/* Manual order form */}
      {showManual && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 bg-blue-50 border-b border-blue-100">
            <p className="font-semibold text-blue-800 text-sm">New Order</p>
            <p className="text-xs text-blue-500 mt-0.5">Fill in order details manually</p>
          </div>
          <div className="p-4 space-y-3">
            {/* Order details */}
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-xs font-medium text-slate-600 block mb-1">Title *</label>
                <input value={manualForm.title} onChange={e => setManualForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Desmond May 2026"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">Buyer Name</label>
                <input value={manualForm.buyerName} onChange={e => setManualForm(f => ({ ...f, buyerName: e.target.value }))}
                  placeholder="e.g. Desmond"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">Order Date</label>
                <input type="date" value={manualForm.orderDate} onChange={e => setManualForm(f => ({ ...f, orderDate: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">Type</label>
                <select value={manualForm.type} onChange={e => setManualForm(f => ({ ...f, type: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="production">Production</option>
                  <option value="purchase">Purchase</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">Notes</label>
                <input value={manualForm.notes} onChange={e => setManualForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Optional"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>

            {/* Line items */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-slate-600">Line Items *</label>
                <button onClick={addLine}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
                  <Plus size={12} /> Add line
                </button>
              </div>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {manualLines.map((line, i) => (
                  <div key={i} className={"p-2.5 rounded-xl border " + (line.skuStatus === "found" ? "bg-emerald-50 border-emerald-200" : line.skuStatus === "notfound" ? "bg-red-50 border-red-200" : "bg-slate-50 border-slate-200")}>
                    <div className="flex items-center gap-2 mb-2">
                      {/* SKU lookup field */}
                      <div className="flex items-center gap-1.5 flex-1">
                        <input value={line.sku}
                          onChange={e => updateLine(i, "sku", e.target.value)}
                          onBlur={e => lookupSku(i, e.target.value)}
                          onKeyDown={e => e.key === "Enter" && lookupSku(i, line.sku)}
                          placeholder="SKU (auto-fill)"
                          className={"border rounded-lg px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:ring-1 w-28 bg-white " +
                            (line.skuStatus === "found" ? "border-emerald-400 focus:ring-emerald-400" :
                             line.skuStatus === "notfound" ? "border-red-400 focus:ring-red-400" :
                             "border-slate-200 focus:ring-blue-400")} />
                        {line.skuStatus === "found" && <span className="text-xs text-emerald-600 font-medium">✓</span>}
                        {line.skuStatus === "notfound" && <span className="text-xs text-red-500">Not found</span>}
                      </div>
                      <input type="number" value={line.targetQty}
                        onChange={e => updateLine(i, "targetQty", e.target.value)}
                        placeholder="Qty *" min={1}
                        className="w-16 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white text-right" />
                      {manualLines.length > 1 && (
                        <button onClick={() => removeLine(i)} className="text-slate-300 hover:text-red-400 flex-shrink-0">
                          <X size={14} />
                        </button>
                      )}
                    </div>
                    {/* Auto-filled or manual fields */}
                    <div className="grid grid-cols-2 gap-1.5">
                      <input value={line.productName}
                        onChange={e => updateLine(i, "productName", e.target.value)}
                        placeholder="Product name *"
                        className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white" />
                      <input value={line.colorCategory}
                        onChange={e => updateLine(i, "colorCategory", e.target.value)}
                        placeholder="Color"
                        className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white" />
                      <input value={line.designNumber}
                        onChange={e => updateLine(i, "designNumber", e.target.value)}
                        placeholder="Design #"
                        className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button onClick={handleSaveManual}
              disabled={saving || !manualForm.title.trim() || !manualLines.some(l => l.productName.trim() && parseInt(l.targetQty) > 0)}
              className="w-full bg-blue-600 text-white py-2.5 rounded-xl font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
              {saving ? <><Loader2 size={15} className="animate-spin" /> Saving…</> : "Create Order"}
            </button>
          </div>
        </div>
      )}

      {/* Scan result review */}
      {scanResult && (
        <div className="bg-white rounded-2xl border-2 border-violet-200 overflow-hidden">
          <div className="px-4 py-3 bg-violet-50 border-b border-violet-100 flex items-center justify-between">
            <div>
              <p className="font-semibold text-violet-800">Review Scanned Order</p>
              <p className="text-xs text-violet-500 mt-0.5">Edit anything before confirming</p>
            </div>
            <button onClick={() => setScanResult(null)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
          </div>
          <div className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">Title</label>
                <input value={scanResult.title ?? ""} onChange={e => setScanResult((p: any) => ({ ...p, title: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">Buyer</label>
                <input value={scanResult.buyerName ?? ""} onChange={e => setScanResult((p: any) => ({ ...p, buyerName: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">Date</label>
                <input type="date" value={scanResult.orderDate ?? ""} onChange={e => setScanResult((p: any) => ({ ...p, orderDate: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">Type</label>
                <select value={scanResult.type} onChange={e => setScanResult((p: any) => ({ ...p, type: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500">
                  <option value="production">Production</option>
                  <option value="purchase">Purchase</option>
                </select>
              </div>
            </div>

            {/* Line items */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-slate-50 px-3 py-2 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-600">{scanResult.lines?.length} line items</span>
                <span className="text-xs text-slate-400">
                  {scanResult.lines?.reduce((s: number, l: any) => s + (parseInt(l.targetQty) || 0), 0)} total pieces
                </span>
              </div>
              <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
                {scanResult.lines?.map((line: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <input value={line.productName} onChange={e => setScanResult((p: any) => {
                          const lines = [...p.lines]; lines[i] = { ...lines[i], productName: e.target.value };
                          return { ...p, lines };
                        })} className="text-xs font-medium text-slate-800 border-b border-transparent hover:border-slate-300 focus:border-blue-400 focus:outline-none bg-transparent w-32" />
                        <input value={line.colorCategory ?? ""} onChange={e => setScanResult((p: any) => {
                          const lines = [...p.lines]; lines[i] = { ...lines[i], colorCategory: e.target.value };
                          return { ...p, lines };
                        })} placeholder="Color" className="text-xs text-slate-500 border-b border-transparent hover:border-slate-300 focus:border-blue-400 focus:outline-none bg-transparent w-24" />
                      </div>
                    </div>
                    <input type="number" value={line.targetQty} onChange={e => setScanResult((p: any) => {
                      const lines = [...p.lines]; lines[i] = { ...lines[i], targetQty: parseInt(e.target.value) || 0 };
                      return { ...p, lines };
                    })} className="w-16 text-right text-xs font-semibold border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-violet-400" />
                    <button onClick={() => setScanResult((p: any) => ({ ...p, lines: p.lines.filter((_: any, j: number) => j !== i) }))}
                      className="text-slate-300 hover:text-red-400 flex-shrink-0"><X size={14} /></button>
                  </div>
                ))}
              </div>
            </div>

            <button onClick={handleConfirmOrder} disabled={saving || !scanResult.title || !scanResult.lines?.length}
              className="w-full bg-violet-600 text-white py-2.5 rounded-xl font-medium hover:bg-violet-700 disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
              {saving ? <><Loader2 size={16} className="animate-spin" /> Saving…</> : "✓ Confirm & Create Order"}
            </button>
          </div>
        </div>
      )}

      {/* Orders list */}
      {loading ? (
        <div className="text-center py-8 text-slate-400">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <ClipboardList size={36} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500">No {statusFilter !== "all" ? statusFilter.replace("_", " ") : ""} orders</p>
          <p className="text-xs text-slate-400 mt-1">Scan an order sheet to get started</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(order => {
            const sc = statusConfig[order.status] ?? statusConfig.open;
            const tc = typeConfig[order.type] ?? typeConfig.production;
            const totalTarget = (order.lines ?? []).reduce((s: number, l: any) => s + l.targetQty, 0);
            const totalActual = (order.lines ?? []).reduce((s: number, l: any) => s + (l.actualQty ?? 0), 0);
            const pct = totalTarget > 0 ? Math.round((totalActual / totalTarget) * 100) : 0;
            const completedLines = (order.lines ?? []).filter((l: any) => l.status === "completed").length;

            return (
              <Link key={order.id} href={"/orders/" + order.id}
                className="bg-white rounded-2xl border border-slate-200 p-4 block hover:shadow-sm transition-all">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800">{order.title}</p>
                    {order.buyerName && <p className="text-xs text-slate-500 mt-0.5">{order.buyerName}</p>}
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className={"text-xs px-2 py-0.5 rounded-full font-medium " + tc.color}>{tc.label}</span>
                    <span className={"text-xs px-2 py-0.5 rounded-full border " + sc.color}>{sc.label}</span>
                  </div>
                </div>
                <ProgressBar actual={totalActual} target={totalTarget} />
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-xs text-slate-500">{totalActual}/{totalTarget} pcs · {completedLines}/{(order.lines ?? []).length} lines done</span>
                  <span className="text-xs font-semibold text-slate-700">{pct}%</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
