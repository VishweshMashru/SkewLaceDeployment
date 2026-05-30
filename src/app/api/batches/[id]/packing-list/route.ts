import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { batches, cartons, finishedGoods, products } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get("mode") ?? "summary";

    const batchRows = await db.select().from(batches).where(eq(batches.id, id));
    const batch = batchRows[0];
    if (!batch) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Get all cartons in this batch
    const batchCartons = await db.select().from(cartons).where(eq(cartons.batchId, id));

    if (!batchCartons.length) {
      return new NextResponse(
        `<html><body style="font-family:Arial;padding:20px"><h2>No cartons in this batch</h2></body></html>`,
        { headers: { "Content-Type": "text/html" } }
      );
    }

    const cartonIds = batchCartons.map(c => c.id);

    // Get all items across all cartons in this batch
    const allItems = await db
      .select({ fg: finishedGoods, product: products, carton: cartons })
      .from(finishedGoods)
      .leftJoin(products, eq(finishedGoods.productId, products.id))
      .leftJoin(cartons, eq(finishedGoods.cartonId, cartons.id))
      .where(eq(cartons.batchId, id));

    // Group by product (for summary across whole batch)
    const productMap = new Map<string, {
      name: string; designNumber: string | null; colorCategory: string | null;
      sku: string; metersPerPiece: string | null; size: string | null;
      totalQty: number; totalMeters: number; labelCount: number;
      byCarton: Map<string, { cartonNumber: string; qty: number; labels: string[] }>;
    }>();

    for (const row of allItems) {
      const pid = row.fg.productId;
      if (!productMap.has(pid)) {
        productMap.set(pid, {
          name: row.product?.name ?? "Unknown",
          designNumber: row.product?.designNumber ?? null,
          colorCategory: row.product?.colorCategory ?? null,
          sku: row.product?.sku ?? "",
          metersPerPiece: (row.product as any)?.metersPerPiece ?? null,
          size: (row.product as any)?.size ?? null,
          totalQty: 0, totalMeters: 0, labelCount: 0,
          byCarton: new Map(),
        });
      }
      const g = productMap.get(pid)!;
      g.totalQty += row.fg.quantity;
      g.labelCount += 1;
      const mpp = (row.product as any)?.metersPerPiece;
      if (mpp) g.totalMeters += row.fg.quantity * parseFloat(mpp);

      const cid = row.fg.cartonId ?? "";
      if (!g.byCarton.has(cid)) {
        g.byCarton.set(cid, { cartonNumber: row.carton?.cartonNumber ?? cid, qty: 0, labels: [] });
      }
      const cb = g.byCarton.get(cid)!;
      cb.qty += row.fg.quantity;
      cb.labels.push(row.fg.id);
    }

    const productGroups = Array.from(productMap.values()).sort((a, b) => a.name.localeCompare(b.name));
    const grandTotal = productGroups.reduce((s, g) => s + g.totalQty, 0);
    const grandMeters = productGroups.reduce((s, g) => s + g.totalMeters, 0);
    const grandLabels = productGroups.reduce((s, g) => s + g.labelCount, 0);
    const brandName = process.env.NEXT_PUBLIC_BRAND_NAME ?? "CartonTrack";
    const brandUrl = process.env.NEXT_PUBLIC_BRAND_URL ?? "";

    // Product summary rows
    const productRows = productGroups.map((g, i) =>
      `<tr class="${i % 2 === 0 ? "alt" : ""}">
        <td>${i + 1}</td>
        <td><strong>${g.name}</strong></td>
        <td>${g.designNumber ? "D.NO " + g.designNumber : "-"}</td>
        <td>${g.colorCategory ?? "-"}</td>
        <td>${g.size ?? "-"}</td>
        <td class="right">${g.labelCount}</td>
        <td class="right"><strong>${g.totalQty}</strong></td>
        <td class="right">${g.totalMeters > 0 ? g.totalMeters.toFixed(2) : "-"}</td>
      </tr>
      ${mode === "detailed" ? Array.from(g.byCarton.entries()).map(([cid, cb]) =>
        `<tr class="sub-row">
          <td></td>
          <td colspan="3" class="grey">Carton: <strong>${cb.cartonNumber}</strong></td>
          <td></td>
          <td class="right grey">${cb.labels.length}</td>
          <td class="right grey">${cb.qty}</td>
          <td class="right grey">${g.metersPerPiece ? (cb.qty * parseFloat(g.metersPerPiece)).toFixed(2) : "-"}</td>
        </tr>`
      ).join("") : ""}
    `).join("");

    // Carton summary rows
    const cartonRows = batchCartons.map((c, i) => {
      const cartonItems = allItems.filter(r => r.fg.cartonId === c.id);
      const cartonQty = cartonItems.reduce((s, r) => s + r.fg.quantity, 0);
      const cartonProducts = new Set(cartonItems.map(r => r.fg.productId)).size;
      return `<tr class="${i % 2 === 0 ? "alt" : ""}">
        <td>${i + 1}</td>
        <td class="mono"><strong>${c.cartonNumber}</strong></td>
        <td>${cartonProducts} products</td>
        <td class="right">${cartonItems.length}</td>
        <td class="right"><strong>${cartonQty}</strong></td>
        <td>${c.notes ?? "-"}</td>
      </tr>`;
    }).join("");

    const html = `<!DOCTYPE html>
<html>
<head>
<title>Batch Packing List - ${batch.name}</title>
<meta charset="utf-8" />
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; font-size: 11px; color: #1e293b; }
  @page { size: A4; margin: 12mm 15mm; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6mm; border-bottom: 2.5px solid #1d4ed8; padding-bottom: 3mm; }
  .brand { font-size: 18px; font-weight: 900; color: #1d4ed8; }
  .brand-url { font-size: 9px; color: #94a3b8; margin-top: 1px; }
  .doc-title h1 { font-size: 15px; font-weight: 700; text-align: right; letter-spacing: 0.05em; }
  .doc-title p { font-size: 9px; color: #64748b; text-align: right; margin-top: 2px; }
  .meta { display: grid; grid-template-columns: repeat(auto-fit, minmax(90px, 1fr)); gap: 6px; margin-bottom: 5mm; background: #f8fafc; padding: 3mm; border-radius: 3px; border: 1px solid #e2e8f0; }
  .meta-item label { font-size: 8px; text-transform: uppercase; letter-spacing: 0.06em; color: #94a3b8; display: block; margin-bottom: 2px; }
  .meta-item span { font-size: 11px; font-weight: 700; color: #1e293b; }
  .section-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #475569; margin: 5mm 0 2mm; border-bottom: 1px solid #e2e8f0; padding-bottom: 1mm; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 2mm; }
  th { background: #1e3a5f; color: white; font-size: 9px; font-weight: 600; padding: 2.5mm 2mm; text-align: left; white-space: nowrap; }
  th.right, td.right { text-align: right; }
  td { padding: 2mm; border-bottom: 1px solid #f1f5f9; font-size: 10px; vertical-align: middle; }
  tr.alt td { background: #f8fafc; }
  tr.sub-row td { font-size: 9px; padding: 1.5mm 2mm; border-bottom: none; background: #fafafa; }
  tr.total-row td { border-top: 1.5px solid #1d4ed8; font-weight: 700; font-size: 11px; color: #1d4ed8; padding: 2mm; border-bottom: none; }
  .mono { font-family: 'Courier New', monospace; }
  .grey { color: #64748b; }
  .badge { display: inline-block; font-size: 8px; padding: 1px 5px; border-radius: 8px; font-weight: 700; }
  .badge-preparing { background: #dbeafe; color: #1d4ed8; }
  .badge-sealed { background: #fef3c7; color: #d97706; }
  .badge-dispatched { background: #dcfce7; color: #15803d; }
  .footer { margin-top: 5mm; border-top: 1px solid #e2e8f0; padding-top: 2mm; display: flex; justify-content: space-between; font-size: 8px; color: #94a3b8; }
  .page-break { page-break-before: always; }
</style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">${brandName}</div>
      ${brandUrl ? `<div class="brand-url">${brandUrl}</div>` : ""}
    </div>
    <div class="doc-title">
      <h1>BATCH PACKING LIST${mode === "detailed" ? " (Detailed)" : ""}</h1>
      <p>${new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</p>
    </div>
  </div>

  <div class="meta">
    <div class="meta-item"><label>Batch</label><span>${batch.name}</span></div>
    ${batch.destination ? `<div class="meta-item"><label>Destination</label><span>${batch.destination}</span></div>` : ""}
    <div class="meta-item"><label>Status</label><span><span class="badge badge-${batch.status}">${batch.status}</span></span></div>
    <div class="meta-item"><label>Cartons</label><span>${batchCartons.length}</span></div>
    <div class="meta-item"><label>Products</label><span>${productGroups.length}</span></div>
    <div class="meta-item"><label>Total Labels</label><span>${grandLabels}</span></div>
    <div class="meta-item"><label>Total Pieces</label><span>${grandTotal}</span></div>
    ${grandMeters > 0 ? `<div class="meta-item"><label>Total Meters</label><span>${grandMeters.toFixed(2)} m</span></div>` : ""}
    ${batch.notes ? `<div class="meta-item"><label>Notes</label><span>${batch.notes}</span></div>` : ""}
  </div>

  <!-- Product Summary -->
  <div class="section-title">Product Summary</div>
  <table>
    <thead>
      <tr>
        <th style="width:22px">#</th>
        <th>Product</th>
        <th style="width:75px">D.NO</th>
        <th style="width:85px">Color</th>
        <th style="width:55px">Size</th>
        <th class="right" style="width:45px">Labels</th>
        <th class="right" style="width:50px">Pcs</th>
        <th class="right" style="width:55px">MTS</th>
      </tr>
    </thead>
    <tbody>${productRows}</tbody>
    <tbody>
      <tr class="total-row">
        <td colspan="5">TOTAL</td>
        <td class="right">${grandLabels}</td>
        <td class="right">${grandTotal} pcs</td>
        <td class="right">${grandMeters > 0 ? grandMeters.toFixed(2) + " m" : "-"}</td>
      </tr>
    </tbody>
  </table>

  <!-- Carton Breakdown -->
  <div class="section-title" style="margin-top:6mm">Carton Breakdown</div>
  <table>
    <thead>
      <tr>
        <th style="width:22px">#</th>
        <th>Carton No.</th>
        <th>Contents</th>
        <th class="right" style="width:50px">Labels</th>
        <th class="right" style="width:50px">Pcs</th>
        <th style="width:120px">Notes</th>
      </tr>
    </thead>
    <tbody>${cartonRows}</tbody>
    <tbody>
      <tr class="total-row">
        <td colspan="3">TOTAL</td>
        <td class="right">${grandLabels}</td>
        <td class="right">${grandTotal} pcs</td>
        <td></td>
      </tr>
    </tbody>
  </table>

  <div class="footer">
    <span>Generated by ${brandName} - ${new Date().toLocaleString("en-IN")}</span>
    <span>${batch.name}</span>
  </div>

  <script>window.onload = () => window.print();</script>
</body>
</html>`;

    return new NextResponse(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (e) {
    console.error("Batch packing list error:", e);
    return new NextResponse(
      `<html><body style="font-family:Arial;padding:20px"><h2>Error</h2><pre>${String(e)}</pre></body></html>`,
      { headers: { "Content-Type": "text/html" }, status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";
