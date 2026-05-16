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
  @page {
    size: auto;
    margin: 5mm;
  }
  @media print {
    html, body { height: auto !important; overflow: visible !important; }
  }
`;

export const LYBYTEX_HEADER = `
  <div style="text-align:center; margin-bottom:6px;">
    <div style="font-size:10px; font-weight:800; color:#1d4ed8; letter-spacing:.08em; text-transform:uppercase;">LybyTex</div>
    <div style="font-size:8px; color:#94a3b8; letter-spacing:.04em;">lybytex.com</div>
  </div>
`;

export function printFGLabel({
  productName,
  designNumber,
  sku,
  quantity,
  id,
  dataUrl,
}: {
  productName: string;
  designNumber?: string | null;
  sku?: string | null;
  quantity: number;
  id: string;
  dataUrl: string | null;
}) {
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(`<!DOCTYPE html><html><head>
<title>Label — ${id}</title>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
${PRINT_BASE_CSS}
.label {
  border: 2px solid #1d4ed8;
  border-radius: 10px;
  padding: 12px 14px;
  width: 54mm;
  text-align: center;
  page-break-inside: avoid;
  break-inside: avoid;
}
.brand-name { font-size:10px; font-weight:800; color:#1d4ed8; letter-spacing:.08em; text-transform:uppercase; }
.brand-url  { font-size:7px; color:#94a3b8; margin-bottom:6px; }
.divider    { border:none; border-top:1px solid #e2e8f0; margin:5px 0; }
.name       { font-size:12px; font-weight:700; color:#1e3a5f; line-height:1.2; margin-bottom:2px; }
.sub        { font-size:9px; color:#64748b; margin-bottom:6px; }
.qr         { width:44mm; height:44mm; display:block; margin:0 auto 6px; }
.qty        { font-size:22px; font-weight:900; color:#1d4ed8; line-height:1; }
.pcs        { font-size:9px; color:#94a3b8; margin-bottom:4px; }
.id         { font-size:7px; color:#cbd5e1; font-family:monospace; word-break:break-all; }
</style></head><body>
<div class="label">
  <div class="brand-name">LybyTex</div>
  <div class="brand-url">lybytex.com</div>
  <hr class="divider" />
  <div class="name">${productName}</div>
  <div class="sub">${designNumber ? `Design ${designNumber}` : (sku ?? "")}</div>
  ${dataUrl ? `<img class="qr" src="${dataUrl}" />` : ""}
  <div class="qty">${quantity}</div>
  <div class="pcs">pieces</div>
  <div class="id">${id}</div>
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
  summary: { productName: string; sku: string; colorCategory?: string | null; designNumber?: string | null; totalPieces: number }[];
  notes?: string | null;
  dataUrl: string | null;
}) {
  const rows = summary
    .map(s => `
      <tr>
        <td>${s.productName}${s.designNumber ? ` <span style="color:#94a3b8">D${s.designNumber}</span>` : ""}</td>
        <td style="color:#64748b">${s.colorCategory ?? s.sku}</td>
        <td style="text-align:right;font-weight:600">${s.totalPieces}</td>
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
  border: 2.5px solid #7c3aed;
  border-radius: 10px;
  padding: 14px 16px;
  width: 72mm;
  text-align: center;
  page-break-inside: avoid;
  break-inside: avoid;
}
.brand-name { font-size:10px; font-weight:800; color:#1d4ed8; letter-spacing:.08em; text-transform:uppercase; }
.brand-url  { font-size:7px; color:#94a3b8; margin-bottom:6px; }
.divider    { border:none; border-top:1px solid #e2e8f0; margin:5px 0; }
.tag        { font-size:9px; font-weight:700; color:#6d28d9; letter-spacing:.06em; text-transform:uppercase; }
.num        { font-size:18px; font-weight:900; color:#7c3aed; font-family:monospace; margin:3px 0 8px; }
.qr         { width:52mm; height:52mm; display:block; margin:0 auto 8px; }
.total      { font-size:13px; font-weight:700; color:#1e293b; margin-bottom:8px; }
table       { width:100%; border-collapse:collapse; font-size:10px; text-align:left; }
td          { padding:3px 4px; border-bottom:1px solid #f1f5f9; }
tr:last-child td { border-bottom:none; font-weight:700; font-size:11px; }
.notes      { font-size:8px; color:#94a3b8; margin-top:8px; }
</style></head><body>
<div class="label">
  <div class="brand-name">LybyTex</div>
  <div class="brand-url">lybytex.com</div>
  <hr class="divider" />
  <div class="tag">Carton</div>
  <div class="num">${cartonNumber}</div>
  ${dataUrl ? `<img class="qr" src="${dataUrl}" />` : ""}
  <div class="total">${totalPieces} pieces total</div>
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
