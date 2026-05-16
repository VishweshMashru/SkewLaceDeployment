const THERMAL_CSS = [
  "* { margin: 0; padding: 0; box-sizing: border-box; }",
  "html, body { background: #fff; font-family: -apple-system, sans-serif; }",
  "@page { size: 4in 6in; margin: 0; }",
  ".label { width:4in; height:6in; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:0.2in 0.25in; text-align:center; border:3px solid #1d4ed8; }",
  ".brand { font-size:28pt; font-weight:900; color:#1d4ed8; letter-spacing:.1em; text-transform:uppercase; line-height:1; }",
  ".brand-url { font-size:10pt; color:#94a3b8; margin-bottom:6pt; }",
  ".divider { width:100%; border:none; border-top:1.5px solid #e2e8f0; margin:6pt 0; }",
  ".name { font-size:16pt; font-weight:700; color:#1e3a5f; line-height:1.2; margin-bottom:3pt; }",
  ".sub { font-size:11pt; color:#64748b; margin-bottom:8pt; }",
  ".qr { width:2.4in; height:2.4in; display:block; margin:0 auto 8pt; }",
  ".qty { font-size:48pt; font-weight:900; color:#1d4ed8; line-height:1; }",
  ".pcs { font-size:13pt; color:#64748b; font-weight:600; margin-bottom:10pt; }",
  ".id-label { font-size:8pt; color:#94a3b8; text-transform:uppercase; letter-spacing:.08em; margin-bottom:3pt; }",
  ".id { font-size:13pt; font-weight:700; color:#334155; font-family:monospace; letter-spacing:.04em; }",
].join("\n");

function openPrint(title: string, body: string) {
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(
    "<!DOCTYPE html><html><head><title>" + title + "</title>" +
    "<meta name='viewport' content='width=device-width,initial-scale=1'/>" +
    "<style>" + THERMAL_CSS + "</style></head><body>" +
    body +
    "<scr" + "ipt>window.onload=()=>{window.print();window.close();}</scr" + "ipt>" +
    "</body></html>"
  );
  win.document.close();
}

function fgLabelHtml(opts: {
  productName: string;
  designNumber?: string | null;
  sku?: string | null;
  colorCategory?: string | null;
  quantity: number;
  id: string;
  dataUrl: string | null;
}) {
  const sub = [
    opts.designNumber ? "Design " + opts.designNumber : null,
    opts.colorCategory ?? null,
    opts.sku ?? null,
  ].filter(Boolean).join(" · ");

  return (
    '<div class="label">' +
    '<div class="brand">LybyTex</div>' +
    '<div class="brand-url">lybytex.com</div>' +
    '<hr class="divider" />' +
    '<div class="name">' + opts.productName + "</div>" +
    '<div class="sub">' + sub + "</div>" +
    (opts.dataUrl ? '<img class="qr" src="' + opts.dataUrl + '" />' : "") +
    '<div class="qty">' + opts.quantity + "</div>" +
    '<div class="pcs">PIECES</div>' +
    '<hr class="divider" />' +
    '<div class="id-label">Label ID</div>' +
    '<div class="id">' + opts.id + "</div>" +
    "</div>"
  );
}

export function printFGLabel(opts: {
  productName: string;
  designNumber?: string | null;
  sku?: string | null;
  colorCategory?: string | null;
  quantity: number;
  id: string;
  dataUrl: string | null;
  imageUrl?: string | null;
}) {
  openPrint(opts.productName + " — " + opts.id, fgLabelHtml(opts));
}

export function printCartonLabel(opts: {
  cartonNumber: string;
  totalPieces: number;
  summary: { productName: string; sku: string; colorCategory?: string | null; designNumber?: string | null; totalPieces: number; imageUrl?: string | null }[];
  notes?: string | null;
  dataUrl: string | null;
}) {
  const CARTON_CSS = [
    "* { margin:0; padding:0; box-sizing:border-box; }",
    "html, body { background:#fff; font-family:-apple-system,sans-serif; display:flex; align-items:center; justify-content:center; min-height:100vh; }",
    "@page { size: auto; margin: 8mm; }",
    "@media print { html,body { height:auto !important; overflow:visible !important; } }",
    ".label { border:3px solid #7c3aed; border-radius:12px; padding:16px 18px; width:80mm; text-align:center; }",
    ".brand { font-size:18px; font-weight:900; color:#1d4ed8; letter-spacing:.1em; text-transform:uppercase; }",
    ".brand-url { font-size:10px; color:#94a3b8; margin-bottom:6px; }",
    ".divider { border:none; border-top:1.5px solid #e2e8f0; margin:6px 0; }",
    ".tag { font-size:10px; font-weight:700; color:#6d28d9; letter-spacing:.08em; text-transform:uppercase; }",
    ".num { font-size:20px; font-weight:900; color:#7c3aed; font-family:monospace; margin:4px 0 10px; letter-spacing:.04em; }",
    ".qr { width:60mm; height:60mm; display:block; margin:0 auto 10px; }",
    ".total { font-size:15px; font-weight:700; color:#1e293b; margin-bottom:10px; }",
    "table { width:100%; border-collapse:collapse; font-size:11px; text-align:left; }",
    "td { padding:4px 6px; border-bottom:1px solid #f1f5f9; vertical-align:middle; }",
    "tr:last-child td { border-bottom:none; font-weight:700; font-size:12px; }",
    ".notes { font-size:9px; color:#94a3b8; margin-top:10px; }",
    ".id-label { font-size:8px; color:#94a3b8; text-transform:uppercase; letter-spacing:.06em; margin-top:10px; margin-bottom:2px; }",
    ".id { font-size:13px; font-weight:800; color:#334155; font-family:monospace; letter-spacing:.04em; }",
  ].join("\n");

  const rows = opts.summary.map(s => {
    const designText = s.designNumber ? " D" + s.designNumber : "";
    return (
      "<tr><td>" + s.productName + designText + "</td>" +
      "<td style='color:#64748b'>" + (s.colorCategory ?? s.sku) + "</td>" +
      "<td style='text-align:right;font-weight:700'>" + s.totalPieces + "</td></tr>"
    );
  }).join("");

  const body = (
    '<div class="label">' +
    '<div class="brand">LybyTex</div>' +
    '<div class="brand-url">lybytex.com</div>' +
    '<hr class="divider" />' +
    '<div class="tag">Carton</div>' +
    '<div class="num">' + opts.cartonNumber + "</div>" +
    (opts.dataUrl ? '<img class="qr" src="' + opts.dataUrl + '" />' : "") +
    '<div class="id-label">Carton ID</div>' +
    '<div class="id">' + opts.cartonNumber + "</div>" +
    '<div class="total" style="margin-top:10px">' + opts.totalPieces + " pieces total</div>" +
    "<table>" + rows +
    "<tr><td colspan='2'><strong>TOTAL</strong></td><td style='text-align:right'>" + opts.totalPieces + "</td></tr>" +
    "</table>" +
    (opts.notes ? '<div class="notes">' + opts.notes + "</div>" : "") +
    "</div>"
  );

  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(
    "<!DOCTYPE html><html><head><title>Carton — " + opts.cartonNumber + "</title>" +
    "<meta name='viewport' content='width=device-width,initial-scale=1'/>" +
    "<style>" + CARTON_CSS + "</style></head><body>" +
    body +
    "<scr" + "ipt>window.onload=()=>{window.print();window.close();}</scr" + "ipt>" +
    "</body></html>"
  );
  win.document.close();
}

export function printBulkLabels(opts: {
  product: { name: string; sku: string; designNumber?: string | null; colorCategory?: string | null; imageUrl?: string | null };
  labels: { id: string; quantity: number }[];
  qrDataUrls: Record<string, string>;
}) {
  const pages = opts.labels.map((label, i) => {
    const pageBreak = i < opts.labels.length - 1
      ? ' style="page-break-after:always"'
      : "";
    return fgLabelHtml({
      productName: opts.product.name,
      designNumber: opts.product.designNumber,
      sku: opts.product.sku,
      colorCategory: opts.product.colorCategory,
      quantity: label.quantity,
      id: label.id,
      dataUrl: opts.qrDataUrls[label.id] ?? null,
    }).replace('<div class="label">', '<div class="label"' + pageBreak + '>');
  }).join("");

  openPrint("Bulk Labels — " + opts.product.name, pages);
}