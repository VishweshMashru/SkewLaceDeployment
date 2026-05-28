import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { orders, orderLines } from "@/db/schema";
import { generateId } from "@/lib/id";
import { desc } from "drizzle-orm";
import { z } from "zod";

const lineSchema = z.object({
  productId: z.string().nullable().optional(),
  productName: z.string().min(1),
  colorCategory: z.string().optional(),
  designNumber: z.string().optional(),
  targetQty: z.number().int().min(1),
});

const createSchema = z.object({
  type: z.enum(["production", "purchase"]).default("production"),
  buyerName: z.string().optional(),
  title: z.string().min(1),
  notes: z.string().optional(),
  orderDate: z.string().optional(),
  lines: z.array(lineSchema).min(1),
});

export async function GET() {
  try {
    const all = await db.query.orders.findMany({
      orderBy: [desc(orders.createdAt)],
      with: { lines: true },
    });
    return NextResponse.json(all);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = createSchema.parse(await req.json());
    const orderId = generateId("ORD");

    const [order] = await db.insert(orders).values({
      id: orderId,
      type: data.type,
      buyerName: data.buyerName,
      title: data.title,
      notes: data.notes,
      orderDate: data.orderDate ? new Date(data.orderDate) : new Date(),
    }).returning();

    const lineValues = data.lines.map(l => ({
      id: generateId("ORL"),
      orderId,
      productId: l.productId ?? null,
      productName: l.productName,
      colorCategory: l.colorCategory ?? null,
      designNumber: l.designNumber ?? null,
      targetQty: l.targetQty,
    }));

    await db.insert(orderLines).values(lineValues);

    return NextResponse.json({ ...order, lines: lineValues }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
