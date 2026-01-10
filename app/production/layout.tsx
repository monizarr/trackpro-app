import { ProductionSidebar } from "@/components/layout/production-sidebar"
import { ProductionBottomNav } from "@/components/layout/production-bottom-nav"
import { requireRole } from "@/lib/auth-helpers"

export default async function ProductionLayout({
    children,
}: {
    children: React.ReactNode
}) {
    await requireRole(["KEPALA_PRODUKSI"])

    return (
        <div className="flex h-screen overflow-hidden bg-background">
            {/* Desktop Sidebar */}
            <div className="hidden md:block">
                <ProductionSidebar />
            </div>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto pb-16 md:pb-0">{children}</main>

            {/* Mobile Bottom Navigation */}
            <div className="md:hidden">
                <ProductionBottomNav />
            </div>
        </div>
    )
}
