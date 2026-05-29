import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { cartons, finishedGoods, products } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get("mode") ?? "summary";

    const cartonRows = await db.select().from(cartons).where(eq(cartons.id, id));
    const carton = cartonRows[0];
    if (!carton) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const items = await db
      .select({ fg: finishedGoods, product: products })
      .from(finishedGoods)
      .leftJoin(products, eq(finishedGoods.productId, products.id))
      .where(eq(finishedGoods.cartonId, id));

    // Group by product
    const groupMap = new Map<string, {
      name: string; designNumber: string | null; colorCategory: string | null;
      sku: string; metersPerPiece: string | null; size: string | null;
      labels: { id: string; qty: number }[];
      totalQty: number; totalMeters: number;
    }>();

    for (const row of items) {
      const pid = row.fg.productId;
      if (!groupMap.has(pid)) {
        groupMap.set(pid, {
          name: row.product?.name ?? "Unknown",
          designNumber: row.product?.designNumber ?? null,
          colorCategory: row.product?.colorCategory ?? null,
          sku: row.product?.sku ?? "",
          metersPerPiece: (row.product as any)?.metersPerPiece ?? null,
          size: (row.product as any)?.size ?? null,
          labels: [],
          totalQty: 0,
          totalMeters: 0,
        });
      }
      const g = groupMap.get(pid)!;
      g.labels.push({ id: row.fg.id, qty: row.fg.quantity });
      g.totalQty += row.fg.quantity;
      const mpp = (row.product as any)?.metersPerPiece;
      if (mpp) g.totalMeters += row.fg.quantity * parseFloat(mpp);
    }

    const groups = Array.from(groupMap.values());
    const grandTotal = groups.reduce((s, g) => s + g.totalQty, 0);
    const grandMeters = groups.reduce((s, g) => s + g.totalMeters, 0);
    const brandName = process.env.NEXT_PUBLIC_BRAND_NAME ?? "CartonTrack";
    const brandUrl = process.env.NEXT_PUBLIC_BRAND_URL ?? "";
    const purpose = (carton as any).purpose ?? "dispatch";
    const storageLocation = (carton as any).storageLocation ?? null;

    const summaryRows = groups.map((g, i) =>
      `<tr class="${i % 2 === 0 ? "alt" : ""}">
        <td>${i + 1}</td>
        <td><strong>${g.name}</strong></td>
        <td>${g.designNumber ? "D.NO " + g.designNumber : "-"}</td>
        <td>${g.colorCategory ?? "-"}</td>
        <td>${g.size ?? "-"}</td>
        <td class="right"><strong>${g.labels.length}</strong></td>
        <td class="right"><strong>${g.totalQty}</strong></td>
        <td class="right">${g.totalMeters > 0 ? g.totalMeters.toFixed(2) : "-"}</td>
      </tr>
      ${mode === "detailed" ? g.labels.map(l =>
        `<tr class="label-row">
          <td></td>
          <td colspan="3" class="mono">${l.id}</td>
          <td></td>
          <td class="right">${l.qty}</td>
          <td class="right">${g.metersPerPiece ? (l.qty * parseFloat(g.metersPerPiece)).toFixed(2) : "-"}</td>
          <td></td>
        </tr>`
      ).join("") : ""}
    `).join("");

    const html = `<!DOCTYPE html>
<html>
<head>
<title>Packing List — ${carton.cartonNumber}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; font-size: 11px; color: #1e293b; }
  @page { size: A4; margin: 12mm 15mm; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6mm; border-bottom: 2.5px solid #1d4ed8; padding-bottom: 3mm; }
  .brand { font-size: 18px; font-weight: 900; color: #1d4ed8; }
  .brand-url { font-size: 9px; color: #94a3b8; margin-top: 1px; }
  .doc-title h1 { font-size: 15px; font-weight: 700; text-align: right; letter-spacing: 0.05em; }
  .doc-title p { font-size: 9px; color: #64748b; text-align: right; margin-top: 2px; }
  .meta { display: grid; grid-template-columns: repeat(auto-fit, minmax(80px, 1fr)); gap: 6px; margin-bottom: 5mm; background: #f8fafc; padding: 3mm; border-radius: 3px; border: 1px solid #e2e8f0; }
  .meta-item label { font-size: 8px; text-transform: uppercase; letter-spacing: 0.06em; color: #94a3b8; display: block; margin-bottom: 2px; }
  .meta-item span { font-size: 11px; font-weight: 700; color: #1e293b; }
  table { width: 100%; border-collapse: collapse; }
  col.w1 { width: 22px; }
  col.w2 { width: auto; }
  col.w3 { width: 75px; }
  col.w4 { width: 80px; }
  col.w5 { width: 55px; }
  col.w6 { width: 45px; }
  col.w7 { width: 45px; }
  col.w8 { width: 55px; }
  th { background: #1e3a5f; color: white; font-size: 9px; font-weight: 600; padding: 2.5mm 2mm; text-align: left; white-space: nowrap; }
  th.right, td.right { text-align: right; }
  td { padding: 2mm; border-bottom: 1px solid #f1f5f9; font-size: 10px; vertical-align: middle; word-break: break-word; }
  tr.alt td { background: #f8fafc; }
  tr.label-row td { font-size: 8.5px; color: #94a3b8; padding: 1mm 2mm; border-bottom: none; }
  tr.total-row td { border-top: 1.5px solid #1d4ed8; font-weight: 700; font-size: 11px; color: #1d4ed8; padding: 2mm; border-bottom: none; }
  .mono { font-family: 'Courier New', monospace; font-size: 8.5px; }
  .badge { display: inline-block; font-size: 8px; padding: 1px 5px; border-radius: 8px; font-weight: 700; background: #ede9fe; color: #7c3aed; }
  .badge-storage { background: #dcfce7; color: #15803d; }
  .footer { margin-top: 5mm; border-top: 1px solid #e2e8f0; padding-top: 2mm; display: flex; justify-content: space-between; font-size: 8px; color: #94a3b8; }
</style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">${brandName}</div>
      ${brandUrl ? `<div class="brand-url">${brandUrl}</div>` : ""}
    </div>
    <div class="doc-title">
      <h1>PACKING LIST${mode === "detailed" ? " (Detailed)" : ""}</h1>
      <p>${new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</p>
    </div>
  </div>

  <div class="meta">
    <div class="meta-item"><label>Carton No.</label><span>${carton.cartonNumber}</span></div>
    <div class="meta-item"><label>Purpose</label><span class="badge ${purpose === "storage" ? "badge-storage" : ""}">${purpose === "storage" ? "Storage" : "Dispatch"}</span></div>
    ${storageLocation ? `<div class="meta-item"><label>Location</label><span>${storageLocation}</span></div>` : ""}
    ${carton.notes ? `<div class="meta-item"><label>Notes</label><span>${carton.notes}</span></div>` : ""}
    <div class="meta-item"><label>Total Pieces</label><span>${grandTotal}</span></div>
    ${grandMeters > 0 ? `<div class="meta-item"><label>Total Meters</label><span>${grandMeters.toFixed(2)}</span></div>` : ""}
    <div class="meta-item"><label>Products</label><span>${groups.length}</span></div>
  </div>

  <table>
    <colgroup><col class="w1"><col class="w2"><col class="w3"><col class="w4"><col class="w5"><col class="w6"><col class="w7"><col class="w8"></colgroup>
    <thead>
      <tr>
        <th>#</th>
        <th>Product</th>
        <th>D.NO</th>
        <th>Color</th>
        <th>Size</th>
        <th class="right">Labels</th>
        <th class="right">Pcs</th>
        <th class="right">MTS</th>
      </tr>
    </thead>
    <tbody>${summaryRows}</tbody>
    <tbody>
      <tr class="total-row">
        <td colspan="5">TOTAL</td>
        <td class="right">${groups.reduce((s, g) => s + g.labels.length, 0)}</td>
        <td class="right">${grandTotal} pcs</td>
        <td class="right">${grandMeters > 0 ? grandMeters.toFixed(2) + " m" : "-"}</td>
      </tr>
    </tbody>
  </table>

  <div class="footer">
    <span>Generated by ${brandName} - ${new Date().toLocaleString("en-IN")}</span>
    <span>${carton.cartonNumber}</span>
  </div>

  <script>window.onload = () => window.print();</script>
</body>
</html>`;

    return new NextResponse(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (e) {
    console.error("Packing list error:", e);
    return new NextResponse(
      `<html><body><h2>Error generating packing list</h2><pre>${String(e)}</pre></body></html>`,
      { headers: { "Content-Type": "text/html" }, status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";
