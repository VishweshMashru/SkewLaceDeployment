import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { batches } from "@/db/schema";
import { generateId } from "@/lib/id";
import { z } from "zod";
import { desc } from "drizzle-orm";

const createSchema = z.object({
  name: z.string().min(1),
  destination: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET() {
  try {
    const all = await db.select().from(batches).orderBy(desc(batches.createdAt));
    return NextResponse.json(all);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = createSchema.parse(await req.json());
    const [batch] = await db.insert(batches).values({
      id: generateId("BTH"),
      ...data,
    }).returning();
    return NextResponse.json(batch, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
