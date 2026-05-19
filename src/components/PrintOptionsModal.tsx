"use client";
import { useState } from "react";
import { Printer, X, Building2, QrCode, LayoutTemplate } from "lucide-react";

interface PrintOptions {
  showBranding: boolean;
  size: "full" | "qr-only";
}

interface PrintOptionsModalProps {
  onPrint: (options: PrintOptions) => void;
  onClose: () => void;
  title?: string;
  hideSize?: boolean; // carton labels don't need size option
}

export default function PrintOptionsModal({ onPrint, onClose, title = "Print Label", hideSize }: PrintOptionsModalProps) {
  const [showBranding, setShowBranding] = useState(true);
  const [size, setSize] = useState<"full" | "qr-only">("full");

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white w-full max-w-sm rounded-t-3xl sm:rounded-2xl shadow-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-slate-800 text-lg">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>

        {/* Label size */}
        {!hideSize && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-slate-600">Label Size</p>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setSize("full")}
                className={"flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-colors " +
                  (size === "full" ? "border-blue-500 bg-blue-50" : "border-slate-200 hover:border-slate-300")}>
                <LayoutTemplate size={20} className={size === "full" ? "text-blue-600" : "text-slate-400"} />
                <div className="text-center">
                  <p className={"text-xs font-semibold " + (size === "full" ? "text-blue-700" : "text-slate-600")}>Full Label</p>
                  <p className="text-xs text-slate-400">4×6 with details</p>
                </div>
              </button>
              <button onClick={() => setSize("qr-only")}
                className={"flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-colors " +
                  (size === "qr-only" ? "border-blue-500 bg-blue-50" : "border-slate-200 hover:border-slate-300")}>
                <QrCode size={20} className={size === "qr-only" ? "text-blue-600" : "text-slate-400"} />
                <div className="text-center">
                  <p className={"text-xs font-semibold " + (size === "qr-only" ? "text-blue-700" : "text-slate-600")}>QR Only</p>
                  <p className="text-xs text-slate-400">Minimal, just QR</p>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Branding toggle — only on full labels */}
        {(size === "full" || hideSize) && (
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center">
                <Building2 size={16} className="text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-800">LybyTex Branding</p>
                <p className="text-xs text-slate-500">Show name and lybytex.com</p>
              </div>
            </div>
            <button onClick={() => setShowBranding(!showBranding)}
              className={`relative w-12 h-6 rounded-full transition-colors ${showBranding ? "bg-blue-600" : "bg-slate-300"}`}>
              <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${showBranding ? "translate-x-6" : "translate-x-0.5"}`} />
            </button>
          </div>
        )}

        <button onClick={() => { onPrint({ showBranding, size }); onClose(); }}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors">
          <Printer size={18} /> Print
        </button>
      </div>
    </div>
  );
}
