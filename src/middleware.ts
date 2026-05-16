import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

// Pages that anyone (including unauthenticated) can view
const PUBLIC_VIEW_PAGES = [
  "/finished-goods/",
  "/cartons/",
  "/login",
];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;
  const role = (session?.user as any)?.role ?? null;

  // Always allow auth API and static
  if (pathname.startsWith("/api/auth")) return NextResponse.next();

  // All API GETs are public
  if (req.method === "GET" && pathname.startsWith("/api/")) return NextResponse.next();

  // Write APIs need session
  if (req.method !== "GET" && pathname.startsWith("/api/")) {
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.next();
  }

  // Login page — redirect to home if already logged in
  if (pathname === "/login") {
    if (session) return NextResponse.redirect(new URL("/", req.url));
    return NextResponse.next();
  }

  // Public view pages (QR scan targets) — always accessible
  if (PUBLIC_VIEW_PAGES.some(p => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Not logged in — redirect to login
  if (!session) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Logged in as viewer — only allow the public view pages, redirect everything else to home
  if (role === "viewer") {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
