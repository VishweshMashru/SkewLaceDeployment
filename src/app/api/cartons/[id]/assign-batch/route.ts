import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { cartons } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { batchId } = z.object({ batchId: z.string().nullable() }).parse(await req.json());

    const [carton] = await db.update(cartons)
      .set({ batchId })
      .where(eq(cartons.id, id))
      .returning();

    if (!carton) return NextResponse.json({ error: "Carton not found" }, { status: 404 });
    return NextResponse.json(carton);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
