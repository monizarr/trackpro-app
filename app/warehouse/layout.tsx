import { WarehouseSidebar } from "@/components/layout/warehouse-sidebar"
import { WarehouseBottomNav } from "@/components/layout/warehouse-bottom-nav"
import { requireRole } from "@/lib/auth-helpers"

export default async function WarehouseLayout({
    children,
}: {
    children: React.ReactNode
}) {
    await requireRole(["KEPALA_GUDANG"])

    return (
        <div className="flex h-screen overflow-hidden bg-background">
            {/* Desktop Sidebar */}
            <div className="hidden md:block">
                <WarehouseSidebar />
            </div>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto pb-16 md:pb-0">{children}</main>

            {/* Mobile Bottom Navigation */}
            <div className="md:hidden">
                <WarehouseBottomNav />
            </div>
        </div>
    )
}
