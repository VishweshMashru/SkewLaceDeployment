import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { appUsers } from "@/db/schema";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { desc } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { generateId } from "@/lib/id";

async function isAdmin() {
  const session = await auth();
  return (session?.user as any)?.role === "admin";
}

export async function GET() {
  if (!await isAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const users = await db.select({
    id: appUsers.id, name: appUsers.name,
    email: appUsers.email, role: appUsers.role,
    createdAt: appUsers.createdAt,
  }).from(appUsers).orderBy(desc(appUsers.createdAt));
  return NextResponse.json(users);
}

const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["admin", "staff", "viewer"]),
});

export async function POST(req: NextRequest) {
  if (!await isAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const data = createSchema.parse(await req.json());
    const passwordHash = await bcrypt.hash(data.password, 10);
    const [created] = await db.insert(appUsers).values({
      id: generateId("USR"),
      name: data.name,
      email: data.email,
      passwordHash,
      role: data.role,
    }).returning();
    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: "Validation error" }, { status: 400 });
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
