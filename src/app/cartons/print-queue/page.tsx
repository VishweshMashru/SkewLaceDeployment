"use client";
import { useEffect, useState, useRef } from "react";
import { Printer, Plus, X, QrCode, Trash2 } from "lucide-react";
import QRCode from "qrcode";
import Link from "next/link";

interface QueueItem {
  id: string;
  cartonNumber: string;
  totalPieces: number;
  notes: string | null;
  qrDataUrl: string;
}

export default function PrintQueuePage() {
  const [cartons, setCartons]   = useState<any[]>([]);
  const [queue, setQueue]       = useState<QueueItem[]>([]);
  const [loading, setLoading]   = useState(true);
  const [generating, setGenerating] = useState(false);
  const [search, setSearch]     = useState("");
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  useEffect(() => {
    fetch("/api/cartons").then(r => r.json()).then(d => {
      setCartons(Array.isArray(d) ? d : []);
      setLoading(false);
    });
  }, []);

  async function addToQueue(carton: any) {
    if (queue.find(q => q.id === carton.id)) return;
    const url = `${baseUrl}/cartons/${carton.id}`;
    const qrDataUrl = await QRCode.toDataURL(url, { width: 200, margin: 1 });
    setQueue(prev => [...prev, {
      id: carton.id,
      cartonNumber: carton.cartonNumber,
      totalPieces: carton.totalPieces,
      notes: carton.notes,
      qrDataUrl,
    }]);
  }

  function removeFromQueue(id: string) {
    setQueue(prev => prev.filter(q => q.id !== id));
  }

  function printQueue() {
    if (!queue.length) return;
    const brandName = process.env.NEXT_PUBLIC_BRAND_NAME ?? "CartonTrack";

    // 4 QR codes per row on A4, as many rows as needed
    const qrSize = "42mm";
    const items = queue.map(item => `
      <div class="qr-item">
        <img src="${item.qrDataUrl}" class="qr-img" />
        <div class="qr-number">${item.cartonNumber}</div>
        <div class="qr-pieces">${item.totalPieces} pcs</div>
        ${item.notes ? `<div class="qr-notes">${item.notes}</div>` : ""}
      </div>
    `).join("");

    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head>
<title>QR Print Queue</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; }
  @page { size: A4; margin: 10mm; }
  .grid { display: flex; flex-wrap: wrap; gap: 4mm; }
  .qr-item { width: ${qrSize}; text-align: center; padding: 2mm; border: 0.5px solid #e2e8f0; border-radius: 3px; page-break-inside: avoid; }
  .qr-img { width: ${qrSize}; height: ${qrSize}; display: block; }
  .qr-number { font-size: 7pt; font-weight: 700; font-family: monospace; margin-top: 1mm; word-break: break-all; }
  .qr-pieces { font-size: 7pt; color: #64748b; }
  .qr-notes { font-size: 6pt; color: #94a3b8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .header { text-align: center; margin-bottom: 4mm; font-size: 10pt; color: #64748b; }
</style></head><body>
<div class="header">${brandName} - Carton QR Labels (${queue.length})</div>
<div class="grid">${items}</div>
<scr` + `ipt>window.onload=()=>{window.print();window.close();}</scr` + `ipt>
</body></html>`);
    win.document.close();
  }

  const filtered = cartons.filter(c =>
    !search ||
    c.cartonNumber.toLowerCase().includes(search.toLowerCase()) ||
    (c.notes ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const inQueue = new Set(queue.map(q => q.id));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">QR Print Queue</h1>
          <p className="text-xs text-slate-400 mt-0.5">Add cartons, print all QR codes on A4 — fits as many as possible</p>
        </div>
        <Link href="/cartons" className="text-sm text-slate-500 hover:text-slate-700">← Back</Link>
      </div>

      {/* Queue */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-slate-700 text-sm">Print Queue ({queue.length})</h2>
          <div className="flex gap-2">
            {queue.length > 0 && (
              <button onClick={() => setQueue([])}
                className="text-xs text-slate-400 hover:text-red-500 transition-colors">Clear all</button>
            )}
            <button onClick={printQueue} disabled={!queue.length}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-40 transition-colors">
              <Printer size={15} /> Print {queue.length > 0 ? `(${queue.length})` : ""}
            </button>
          </div>
        </div>

        {queue.length === 0 ? (
          <div className="text-center py-6 text-slate-400">
            <QrCode size={28} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">No cartons in queue. Add from the list below.</p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {queue.map(item => (
              <div key={item.id} className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                <img src={item.qrDataUrl} className="w-8 h-8" alt="" />
                <div className="min-w-0">
                  <p className="text-xs font-mono font-semibold text-slate-800">{item.cartonNumber}</p>
                  <p className="text-xs text-slate-400">{item.totalPieces} pcs</p>
                </div>
                <button onClick={() => removeFromQueue(item.id)}
                  className="text-slate-300 hover:text-red-400 ml-1">
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Carton list to add from */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="p-3 border-b border-slate-100">
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search cartons…"
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        {loading ? (
          <div className="text-center py-8 text-slate-400 text-sm">Loading...</div>
        ) : (
          <div className="divide-y divide-slate-50 max-h-96 overflow-y-auto">
            {filtered.map(c => {
              const added = inQueue.has(c.id);
              return (
                <div key={c.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-mono font-semibold text-slate-800">{c.cartonNumber}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-slate-500">{c.totalPieces} pcs</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                        c.status === "open" ? "bg-emerald-50 text-emerald-700" :
                        c.status === "sealed" ? "bg-amber-50 text-amber-700" :
                        "bg-blue-50 text-blue-700"
                      }`}>{c.status}</span>
                      {c.notes && <span className="text-xs text-slate-400 truncate max-w-[100px]">{c.notes}</span>}
                    </div>
                  </div>
                  <button onClick={() => addToQueue(c)} disabled={added}
                    className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                      added ? "bg-emerald-50 text-emerald-600 cursor-default" : "bg-blue-50 text-blue-600 hover:bg-blue-100"
                    }`}>
                    {added ? "✓ Added" : <><Plus size={12} /> Add</>}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
