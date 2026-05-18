import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const PUBLIC_VIEW_PAGES = [
  "/finished-goods/",
  "/cartons/",
  "/login",
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const method = req.method;

  // Always allow auth routes
  if (pathname.startsWith("/api/auth")) return NextResponse.next();

  // All GET API requests are public
  if (method === "GET" && pathname.startsWith("/api/")) return NextResponse.next();

  // Get token directly from cookie — no HTTP call
  const token = await getToken({ 
    req, 
    secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET 
  });
  const role = (token?.role as string) ?? null;

  // Write API requests need auth
  if (method !== "GET" && pathname.startsWith("/api/")) {
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.next();
  }

  // Login page — always accessible
  if (pathname === "/login") {
    return NextResponse.next();
  }

  // Public QR scan pages — always accessible
  if (PUBLIC_VIEW_PAGES.some(p => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Not logged in — redirect to login
  if (!token) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Viewer role — only public pages
  if (role === "viewer") {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};