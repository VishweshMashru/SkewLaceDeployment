export const PRINT_BASE_CSS = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 100%; height: auto; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background: #fff;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding: 8mm;
    min-height: unset;
  }
  @page { size: auto; margin: 5mm; }
  @media print {
    html, body { height: auto !important; overflow: visible !important; }
  }
`;

export function printFGLabel({
  productName,
  designNumber,
  sku,
  colorCategory,
  quantity,
  id,
  dataUrl,
  imageUrl,
}: {
  productName: string;
  designNumber?: string | null;
  sku?: string | null;
  colorCategory?: string | null;
  quantity: number;
  id: string;
  dataUrl: string | null;
  imageUrl?: string | null;
}) {
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(`<!DOCTYPE html><html><head>
<title>${productName} — ${id}</title>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
${PRINT_BASE_CSS}
.label {
  border: 2.5px solid #1d4ed8;
  border-radius: 12px;
  width: 64mm;
  overflow: hidden;
  text-align: center;
  page-break-inside: avoid;
  break-inside: avoid;
}
.body { padding: 12px 14px 14px; }
.brand     { font-size: 15px; font-weight: 900; color: #1d4ed8; letter-spacing: .1em; text-transform: uppercase; margin-bottom: 1px; }
.brand-url { font-size: 10px; color: #94a3b8; margin-bottom: 8px; }
.divider   { border: none; border-top: 1.5px solid #e2e8f0; margin: 0 0 8px; }
.name      { font-size: 13px; font-weight: 700; color: #1e3a5f; line-height: 1.2; margin-bottom: 2px; }
.sub       { font-size: 10px; color: #64748b; margin-bottom: 8px; }
.qr        { width: 52mm; height: 52mm; display: block; margin: 0 auto 8px; }
.qty       { font-size: 28px; font-weight: 900; color: #1d4ed8; line-height: 1; margin-bottom: 2px; }
.pcs       { font-size: 11px; color: #64748b; font-weight: 600; margin-bottom: 8px; }
.id-label  { font-size: 8px; color: #94a3b8; text-transform: uppercase; letter-spacing: .06em; margin-bottom: 2px; }
.id        { font-size: 11px; font-weight: 700; color: #334155; font-family: monospace; letter-spacing: .05em; }
</style></head><body>
<div class="label">
  <div class="body">
    <div class="brand">LybyTex</div>
    <div class="brand-url">lybytex.com</div>
    <hr class="divider" />
    <div class="name">${productName}</div>
    <div class="sub">${[
      designNumber ? `Design ${designNumber}` : null,
      colorCategory ?? null,
      sku ?? null,
    ].filter(Boolean).join(" · ")}</div>
    ${dataUrl ? `<img class="qr" src="${dataUrl}" />` : ""}
    <div class="qty">${quantity}</div>
    <div class="pcs">PIECES</div>
    <div class="id-label">Label ID</div>
    <div class="id">${id}</div>
  </div>
</div>
<script>window.onload = () => { window.print(); window.close(); }</script>
</body></html>`);
  win.document.close();
}

export function printCartonLabel({
  cartonNumber,
  totalPieces,
  summary,
  notes,
  dataUrl,
}: {
  cartonNumber: string;
  totalPieces: number;
  summary: { productName: string; sku: string; colorCategory?: string | null; designNumber?: string | null; totalPieces: number; imageUrl?: string | null }[];
  notes?: string | null;
  dataUrl: string | null;
}) {
  const rows = summary
    .map(s => `
      <tr>
        <td>
          ${s.imageUrl ? `<img src="${s.imageUrl}" style="width:20px;height:20px;object-fit:cover;border-radius:3px;vertical-align:middle;margin-right:4px;" />` : ""}
          ${s.productName}${s.designNumber ? ` <span style="color:#94a3b8">D${s.designNumber}</span>` : ""}
        </td>
        <td style="color:#64748b">${s.colorCategory ?? s.sku}</td>
        <td style="text-align:right;font-weight:700">${s.totalPieces}</td>
      </tr>`)
    .join("");

  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(`<!DOCTYPE html><html><head>
<title>Carton — ${cartonNumber}</title>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
${PRINT_BASE_CSS}
.label {
  border: 3px solid #7c3aed;
  border-radius: 12px;
  padding: 16px 18px;
  width: 80mm;
  text-align: center;
  page-break-inside: avoid;
  break-inside: avoid;
}
.brand     { font-size: 18px; font-weight: 900; color: #1d4ed8; letter-spacing: .1em; text-transform: uppercase; }
.brand-url { font-size: 10px; color: #94a3b8; margin-bottom: 8px; }
.divider   { border: none; border-top: 1.5px solid #e2e8f0; margin: 0 0 8px; }
.tag       { font-size: 10px; font-weight: 700; color: #6d28d9; letter-spacing: .08em; text-transform: uppercase; }
.num       { font-size: 20px; font-weight: 900; color: #7c3aed; font-family: monospace; margin: 4px 0 10px; letter-spacing: .04em; }
.qr        { width: 60mm; height: 60mm; display: block; margin: 0 auto 10px; }
.total     { font-size: 15px; font-weight: 700; color: #1e293b; margin-bottom: 10px; }
table      { width: 100%; border-collapse: collapse; font-size: 11px; text-align: left; }
td         { padding: 4px 6px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
tr:last-child td { border-bottom: none; font-weight: 700; font-size: 12px; }
.notes     { font-size: 9px; color: #94a3b8; margin-top: 10px; }
.id-label  { font-size: 8px; color: #94a3b8; text-transform: uppercase; letter-spacing: .06em; margin-top: 10px; margin-bottom: 2px; }
.id        { font-size: 13px; font-weight: 800; color: #334155; font-family: monospace; letter-spacing: .04em; }
</style></head><body>
<div class="label">
  <div class="brand">LybyTex</div>
  <div class="brand-url">lybytex.com</div>
  <hr class="divider" />
  <div class="tag">Carton</div>
  <div class="num">${cartonNumber}</div>
  ${dataUrl ? `<img class="qr" src="${dataUrl}" />` : ""}
  <div class="id-label">Carton ID</div>
  <div class="id">${cartonNumber}</div>
  <div class="total" style="margin-top:10px">${totalPieces} pieces total</div>
  <table>
    ${rows}
    <tr><td colspan="2"><strong>TOTAL</strong></td><td style="text-align:right">${totalPieces}</td></tr>
  </table>
  ${notes ? `<div class="notes">${notes}</div>` : ""}
</div>
<script>window.onload = () => { window.print(); window.close(); }</script>
</body></html>`);
  win.document.close();
}

export function printBulkLabels({
  product,
  labels,
  qrDataUrls,
}: {
  product: { name: string; sku: string; designNumber?: string | null; colorCategory?: string | null; imageUrl?: string | null };
  labels: { id: string; quantity: number }[];
  qrDataUrls: Record<string, string>;
}) {
  const labelHtml = labels.map(label => {
    const dataUrl = qrDataUrls[label.id] || "";
    return `
      <div class="label">
        <div class="body">
          <div class="brand">LybyTex</div>
          <div class="brand-url">lybytex.com</div>
          <hr class="divider" />
          <div class="name">${product.name}</div>
          <div class="sub">${[
            product.designNumber ? `D${product.designNumber}` : null,
            product.colorCategory ?? null,
          ].filter(Boolean).join(" · ") || product.sku}</div>
          ${dataUrl ? `<img src="${dataUrl}" class="qr" />` : `<div class="qr-placeholder">QR</div>`}
          <div class="qty">${label.quantity}</div>
          <div class="pcs">PCS</div>
          <div class="id-label">Label ID</div>
          <div class="id">${label.id}</div>
        </div>
      </div>`;
  }).join("");

  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(`<!DOCTYPE html><html><head>
<title>Bulk Labels — ${product.name}</title>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
${PRINT_BASE_CSS}
body { display: block; }
.grid { display: flex; flex-wrap: wrap; gap: 5mm; }
.label {
  border: 2px solid #1d4ed8;
  border-radius: 10px;
  width: 52mm;
  overflow: hidden;
  text-align: center;
  page-break-inside: avoid;
  break-inside: avoid;
}
.body        { padding: 8px 10px 10px; }
.brand       { font-size: 12px; font-weight: 900; color: #1d4ed8; letter-spacing: .1em; text-transform: uppercase; }
.brand-url   { font-size: 8px; color: #94a3b8; margin-bottom: 4px; }
.divider     { border: none; border-top: 1px solid #e2e8f0; margin: 0 0 4px; }
.name        { font-size: 10px; font-weight: 700; color: #1e3a5f; line-height: 1.2; margin-bottom: 1px; }
.sub         { font-size: 8px; color: #64748b; margin-bottom: 4px; }
.qr          { width: 38mm; height: 38mm; display: block; margin: 0 auto 4px; }
.qr-placeholder { width: 38mm; height: 38mm; background: #f1f5f9; margin: 0 auto 4px; display: flex; align-items: center; justify-content: center; font-size: 7px; color: #94a3b8; }
.qty         { font-size: 20px; font-weight: 900; color: #1d4ed8; line-height: 1; }
.pcs         { font-size: 8px; color: #64748b; font-weight: 600; margin-bottom: 3px; }
.id-label    { font-size: 7px; color: #94a3b8; text-transform: uppercase; letter-spacing: .04em; }
.id          { font-size: 9px; font-weight: 700; color: #334155; font-family: monospace; word-break: break-all; }
</style></head><body>
<div class="grid">${labelHtml}</div>
<script>window.onload = () => { window.print(); window.close(); }</script>
</body></html>`);
  win.document.close();
}