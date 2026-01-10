import { redirect } from "next/navigation"
import { getSession, getDashboardRoute } from "@/lib/auth-helpers"

export default async function Home() {
  const session = await getSession()

  if (!session) {
    redirect("/login")
  }

  // Redirect to role-specific dashboard
  const dashboardUrl = getDashboardRoute(session.user.role)
  redirect(dashboardUrl)
}
