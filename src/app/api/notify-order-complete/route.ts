import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { orders, orderLines } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const { orderId } = await req.json();

    const order = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
      with: { lines: true },
    });
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

    const totalPieces = order.lines.reduce((s, l) => s + l.targetQty, 0);
    const linesSummary = order.lines
      .map(l => `• ${l.productName}${l.colorCategory ? " – " + l.colorCategory : ""}: ${l.actualQty}/${l.targetQty} pcs`)
      .join("\n");

    // Email via Resend
    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resendKey}`,
        },
        body: JSON.stringify({
          from: "CartonTrack <notifications@lybytex.com>",
          to: ["lybytexindiavishwesh@gmail.com"],
          subject: `✅ Order Complete: ${order.title}`,
          text: `Order "${order.title}" is now complete!\n\n${order.buyerName ? "Buyer: " + order.buyerName + "\n" : ""}Total: ${totalPieces} pieces\n\nLines:\n${linesSummary}\n\n—\nCartonTrack by LybyTex`,
          html: `
            <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:20px">
              <h2 style="color:#16a34a">✅ Order Complete</h2>
              <h3 style="color:#1e293b">${order.title}</h3>
              ${order.buyerName ? `<p><strong>Buyer:</strong> ${order.buyerName}</p>` : ""}
              <p><strong>Total:</strong> ${totalPieces} pieces</p>
              <table style="width:100%;border-collapse:collapse;margin-top:12px">
                <thead>
                  <tr style="background:#f1f5f9">
                    <th style="text-align:left;padding:8px;font-size:12px">Product</th>
                    <th style="text-align:right;padding:8px;font-size:12px">Qty</th>
                  </tr>
                </thead>
                <tbody>
                  ${order.lines.map(l => `
                    <tr style="border-bottom:1px solid #e2e8f0">
                      <td style="padding:8px;font-size:13px">${l.productName}${l.colorCategory ? " – " + l.colorCategory : ""}</td>
                      <td style="padding:8px;font-size:13px;text-align:right">${l.actualQty}/${l.targetQty}</td>
                    </tr>
                  `).join("")}
                </tbody>
              </table>
              <p style="margin-top:20px;color:#64748b;font-size:12px">CartonTrack · LybyTex</p>
            </div>
          `,
        }),
      });
    }

    // WhatsApp via Twilio (configured but inactive — set TWILIO_* env vars to activate)
    const twilioSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioFrom = process.env.TWILIO_WHATSAPP_FROM; // e.g. whatsapp:+14155238886
    const notifyNumber = process.env.NOTIFY_WHATSAPP_NUMBER; // e.g. whatsapp:+919876543210

    if (twilioSid && twilioToken && twilioFrom && notifyNumber) {
      const msg = `✅ *Order Complete: ${order.title}*\n${order.buyerName ? "Buyer: " + order.buyerName + "\n" : ""}Total: ${totalPieces} pieces\n\n${linesSummary}`;
      await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: "Basic " + Buffer.from(twilioSid + ":" + twilioToken).toString("base64"),
          },
          body: new URLSearchParams({ From: twilioFrom, To: notifyNumber, Body: msg }).toString(),
        }
      );
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("Notification error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
