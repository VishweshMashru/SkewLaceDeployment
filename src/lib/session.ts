import { auth } from "@/lib/auth";

export type Role = "admin" | "staff" | "viewer";

export async function getSession() {
  return auth();
}

export async function getRole(): Promise<Role> {
  const session = await auth();
  return ((session?.user as any)?.role ?? "viewer") as Role;
}

export function canEdit(role: Role) {
  return role === "admin" || role === "staff";
}

export function canDelete(role: Role) {
  return role === "admin";
}
