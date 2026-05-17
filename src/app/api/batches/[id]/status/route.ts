import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { batches, cartons } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { status } = z.object({
      status: z.enum(["preparing", "sealed", "dispatched"]),
    }).parse(await req.json());

    const [batch] = await db.update(batches).set({ status }).where(eq(batches.id, id)).returning();
    if (!batch) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Cascade to cartons
    if (status === "dispatched") {
      await db.update(cartons).set({ status: "dispatched" }).where(eq(cartons.batchId, id));
    } else if (status === "sealed") {
      await db.update(cartons).set({ status: "sealed" }).where(eq(cartons.batchId, id));
    }

    return NextResponse.json(batch);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
