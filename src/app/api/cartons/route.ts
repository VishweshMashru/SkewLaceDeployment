import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { cartons, finishedGoods, products } from "@/db/schema";
import { generateCartonNumber, generateId } from "@/lib/id";
import { z } from "zod";
import { desc, eq } from "drizzle-orm";

const createCartonSchema = z.object({
  notes: z.string().optional(),
  batchId: z.string().optional(),
  purpose: z.enum(["dispatch", "storage"]).default("dispatch"),
  storageLocation: z.string().optional(),
});

export async function GET() {
  try {
    const all = await db.select().from(cartons).orderBy(desc(cartons.createdAt));
    return NextResponse.json(all);
  } catch (e) {
    console.error("GET /api/cartons error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = createCartonSchema.parse(body);
    const id = generateId("CTN");
    const cartonNumber = generateCartonNumber();
    const [carton] = await db
      .insert(cartons)
      .values({
        id,
        cartonNumber,
        notes: data.notes,
        batchId: data.batchId,
        purpose: data.purpose,
        storageLocation: data.storageLocation,
      })
      .returning();
    return NextResponse.json(carton, { status: 201 });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error' }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create carton" }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
