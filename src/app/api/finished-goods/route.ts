import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { finishedGoods, products, orderLines, orders } from "@/db/schema";
import { generateId } from "@/lib/id";
import { z } from "zod";
import { desc, eq, and, sql } from "drizzle-orm";

const createFGSchema = z.object({
  productId: z.string().min(1),
  trackingType: z.enum(["piece", "dozen", "manual"]),
  quantity: z.number().int().positive(),
  orderLineId: z.string().optional(), // manually chosen order line
});

export async function GET() {
  try {
    const all = await db
      .select({ fg: finishedGoods, product: products })
      .from(finishedGoods)
      .leftJoin(products, eq(finishedGoods.productId, products.id))
      .orderBy(desc(finishedGoods.createdAt));
    return NextResponse.json(all);
  } catch (e) {
    return NextResponse.json({ error: "Failed to fetch finished goods" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = createFGSchema.parse(body);

    const product = await db.query.products.findFirst({ where: eq(products.id, data.productId) });
    if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

    const qty = data.trackingType === "piece" ? 1 : data.trackingType === "dozen" ? 12 : data.quantity;
    const trackingLabel = data.trackingType === "piece" ? "1 pc" : data.trackingType === "dozen" ? "1 dozen" : `${qty} pcs`;
    const label = `${product.name}${product.designNumber ? ` - Design ${product.designNumber}` : ""} (${trackingLabel})`;
    const id = generateId("FG");

    // Auto-match to open order line if not manually specified
    let resolvedOrderLineId = data.orderLineId ?? null;
    let openOrderLines: any[] = [];

    if (!resolvedOrderLineId) {
      // Find open order lines for this product
      const matchingLines = await db
        .select({ line: orderLines, order: orders })
        .from(orderLines)
        .innerJoin(orders, eq(orderLines.orderId, orders.id))
        .where(
          and(
            eq(orderLines.productId, data.productId),
            sql`${orderLines.status} != 'completed'`,
            sql`${orders.status} != 'completed'`,
            sql`${orders.status} != 'cancelled'`
          )
        )
        .orderBy(orderLines.createdAt);

      if (matchingLines.length === 1) {
        // Only one match — auto-assign
        resolvedOrderLineId = matchingLines[0].line.id;
      } else if (matchingLines.length > 1) {
        // Multiple matches — return them for user to pick
        return NextResponse.json({
          requiresOrderPick: true,
          openOrderLines: matchingLines.map(m => ({
            lineId: m.line.id,
            orderId: m.order.id,
            orderTitle: m.order.title,
            buyerName: m.order.buyerName,
            productName: m.line.productName,
            colorCategory: m.line.colorCategory,
            targetQty: m.line.targetQty,
            actualQty: m.line.actualQty,
          })),
          productId: data.productId,
          trackingType: data.trackingType,
          quantity: data.quantity,
        }, { status: 202 });
      }
      // 0 matches = no open order, just create the label freely
    }

    // Create the label
    const [fg] = await db.insert(finishedGoods).values({
      id,
      productId: data.productId,
      trackingType: data.trackingType,
      quantity: qty,
      label,
      orderLineId: resolvedOrderLineId,
    }).returning();

    // Update order line actual qty if linked
    if (resolvedOrderLineId) {
      const line = await db.query.orderLines.findFirst({ where: eq(orderLines.id, resolvedOrderLineId) });
      if (line) {
        const newActual = (line.actualQty ?? 0) + qty;
        const newStatus = newActual >= line.targetQty ? "completed" : "in_progress";
        await db.update(orderLines)
          .set({
            actualQty: newActual,
            status: newStatus,
            completedAt: newStatus === "completed" ? new Date() : null,
          })
          .where(eq(orderLines.id, resolvedOrderLineId));

        // Check if all lines in the order are now complete
        if (newStatus === "completed") {
          const allLines = await db.query.orderLines.findMany({ where: eq(orderLines.orderId, line.orderId) });
          const allDone = allLines.every(l => l.id === resolvedOrderLineId ? true : l.status === "completed");
          if (allDone) {
            await db.update(orders).set({ status: "completed" }).where(eq(orders.id, line.orderId));
            // Send email notification
            try {
              await fetch(new URL("/api/notify-order-complete", process.env.NEXTAUTH_URL!).toString(), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ orderId: line.orderId }),
              });
            } catch {} // non-blocking
          } else {
            // At least one line in progress → order is in_progress
            await db.update(orders).set({ status: "in_progress" }).where(eq(orders.id, line.orderId));
          }
        }
      }
    }

    return NextResponse.json({ ...fg, product }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
