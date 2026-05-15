"use client";
import { useEffect, useRef, useState } from "react";
import { Camera, CameraOff } from "lucide-react";

interface QRScannerProps {
  onScan: (value: string) => void;
  active: boolean;
}

export default function QRScanner({ onScan, active }: QRScannerProps) {
  const scannerRef = useRef<any>(null);
  const containerId = "qr-scanner-container";
  const [error, setError] = useState("");
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (!active) {
      stopScanner();
      return;
    }
    startScanner();
    return () => { stopScanner(); };
  }, [active]);

  async function startScanner() {
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const scanner = new Html5Qrcode(containerId);
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        (decodedText: string) => {
          onScan(decodedText);
        },
        undefined
      );
      setStarted(true);
      setError("");
    } catch (e: any) {
      setError("Camera access denied or not available");
      setStarted(false);
    }
  }

  async function stopScanner() {
    try {
      if (scannerRef.current) {
        await scannerRef.current.stop();
        scannerRef.current.clear();
        scannerRef.current = null;
      }
    } catch {}
    setStarted(false);
  }

  if (!active) return null;

  return (
    <div className="space-y-2">
      <div
        id={containerId}
        className="w-full rounded-xl overflow-hidden bg-slate-900"
        style={{ minHeight: 260 }}
      />
      {error && (
        <p className="text-xs text-red-500 text-center">{error}</p>
      )}
      {!error && started && (
        <p className="text-xs text-slate-400 text-center">Point camera at a finished goods QR code</p>
      )}
    </div>
  );
}
