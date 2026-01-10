import { FinishingSidebar } from "@/components/layout/finishing-sidebar"
import { FinishingBottomNav } from "@/components/layout/finishing-bottom-nav"
import { requireRole } from "@/lib/auth-helpers"

export default async function FinishingLayout({
    children,
}: {
    children: React.ReactNode
}) {
    await requireRole(["FINISHING"])

    return (
        <div className="flex h-screen overflow-hidden bg-background">
            {/* Desktop Sidebar */}
            <div className="hidden md:block">
                <FinishingSidebar />
            </div>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto pb-16 md:pb-0">{children}</main>

            {/* Mobile Bottom Navigation */}
            <div className="md:hidden">
                <FinishingBottomNav />
            </div>
        </div>
    )
}
