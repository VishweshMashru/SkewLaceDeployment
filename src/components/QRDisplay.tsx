"use client";
import { useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import QRCode from "qrcode";

interface QRDisplayProps {
  value: string;
  size?: number;
}

export interface QRDisplayHandle {
  getDataUrl: () => string | null;
}

const QRDisplay = forwardRef<QRDisplayHandle, QRDisplayProps>(
  ({ value, size = 160 }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
      if (canvasRef.current) {
        QRCode.toCanvas(canvasRef.current, value, {
          width: size,
          margin: 2,
          color: { dark: "#1e3a5f", light: "#ffffff" },
        });
      }
    }, [value, size]);

    useImperativeHandle(ref, () => ({
      getDataUrl: () => canvasRef.current?.toDataURL("image/png") ?? null,
    }));

    return <canvas ref={canvasRef} className="rounded-lg" />;
  }
);

QRDisplay.displayName = "QRDisplay";
export default QRDisplay;
