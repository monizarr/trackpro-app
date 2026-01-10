import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

// Role to dashboard route mapping
const ROLE_ROUTES: Record<string, string> = {
  OWNER: "/owner/dashboard",
  KEPALA_GUDANG: "/warehouse/dashboard",
  KEPALA_PRODUKSI: "/production/dashboard",
  PEMOTONG: "/cutter/dashboard",
  PENJAHIT: "/tailor/dashboard",
  FINISHING: "/finishing/dashboard",
};

export async function getSession() {
  return await getServerSession(authOptions);
}

export async function getCurrentUser() {
  const session = await getSession();
  return session?.user;
}

export async function requireAuth() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  return session;
}

export async function requireRole(allowedRoles: string[]) {
  const session = await requireAuth();
  if (!allowedRoles.includes(session.user.role)) {
    // Redirect to their own dashboard
    const dashboardRoute = ROLE_ROUTES[session.user.role] || "/login";
    redirect(dashboardRoute);
  }
  return session;
}

export function getDashboardRoute(role: string): string {
  return ROLE_ROUTES[role] || "/login";
}
