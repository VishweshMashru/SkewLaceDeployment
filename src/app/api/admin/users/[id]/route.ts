import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { appUsers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { z } from "zod";

async function isAdmin() {
  const session = await auth();
  return (session?.user as any)?.role === "admin";
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await isAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const { role } = z.object({ role: z.enum(["admin", "staff", "viewer"]) }).parse(await req.json());
  await db.update(appUsers).set({ role }).where(eq(appUsers.id, id));
  return NextResponse.json({ success: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await isAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const session = await auth();
  if (id === (session?.user as any)?.id) {
    return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });
  }
  await db.delete(appUsers).where(eq(appUsers.id, id));
  return NextResponse.json({ success: true });
}

export const dynamic = "force-dynamic";
