import { Sidebar } from "@/components/layout/sidebar"
import { OwnerBottomNav } from "@/components/layout/owner-bottom-nav"
import { requireRole } from "@/lib/auth-helpers"

export default async function OwnerLayout({
    children,
}: {
    children: React.ReactNode
}) {
    await requireRole(["OWNER"])

    return (
        <div className="flex h-screen overflow-hidden bg-background">
            {/* Desktop Sidebar */}
            <div className="hidden md:block">
                <Sidebar />
            </div>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto pb-16 md:pb-0">{children}</main>

            {/* Mobile Bottom Navigation */}
            <div className="md:hidden">
                <OwnerBottomNav />
            </div>
        </div>
    )
}
