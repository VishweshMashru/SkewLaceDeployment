"use client";
import { SessionProvider as NextAuthProvider, useSession } from "next-auth/react";
import { createContext, useContext } from "react";

type Role = "admin" | "staff" | "viewer";

interface AppSession {
  user: { id: string; name: string; email: string; role: Role } | null;
  role: Role;
  isAdmin: boolean;
  isStaff: boolean;
  canEdit: boolean;
  canDelete: boolean;
  isPending: boolean;
}

const SessionContext = createContext<AppSession>({
  user: null, role: "viewer",
  isAdmin: false, isStaff: false,
  canEdit: false, canDelete: false,
  isPending: true,
});

function InnerProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const role = ((session?.user as any)?.role ?? "viewer") as Role;
  const isAdmin  = role === "admin";
  const isStaff  = role === "staff" || isAdmin;

  return (
    <SessionContext.Provider value={{
      user: session?.user ? {
        id: (session.user as any).id ?? "",
        name: session.user.name ?? "",
        email: session.user.email ?? "",
        role,
      } : null,
      role, isAdmin, isStaff,
      canEdit: isStaff,
      canDelete: isAdmin,
      isPending: status === "loading",
    }}>
      {children}
    </SessionContext.Provider>
  );
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextAuthProvider>
      <InnerProvider>{children}</InnerProvider>
    </NextAuthProvider>
  );
}

export function useAppSession() {
  return useContext(SessionContext);
}
