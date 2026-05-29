import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { cartons, finishedGoods } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const updateSchema = z.object({
  status: z.enum(["open", "sealed", "dispatched"]).optional(),
  notes: z.string().optional(),
  storageLocation: z.string().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const data = updateSchema.parse(body);

    const updateData: any = {};
    if (data.status) updateData.status = data.status;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.storageLocation !== undefined) updateData.storageLocation = data.storageLocation;

    const [carton] = await db
      .update(cartons)
      .set(updateData)
      .where(eq(cartons.id, id))
      .returning();

    if (!carton) {
      return NextResponse.json({ error: "Carton not found" }, { status: 404 });
    }

    // If dispatched, mark all items as dispatched too
    if (data.status === "dispatched") {
      await db
        .update(finishedGoods)
        .set({ status: "dispatched" })
        .where(eq(finishedGoods.cartonId, id));
    }

    return NextResponse.json(carton);
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error' }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to update status" }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
