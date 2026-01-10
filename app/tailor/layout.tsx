import { TailorSidebar } from "@/components/layout/tailor-sidebar"
import { TailorBottomNav } from "@/components/layout/tailor-bottom-nav"
import { requireRole } from "@/lib/auth-helpers"

export default async function TailorLayout({
    children,
}: {
    children: React.ReactNode
}) {
    await requireRole(["PENJAHIT"])

    return (
        <div className="flex h-screen overflow-hidden bg-background">
            {/* Desktop Sidebar */}
            <div className="hidden md:block">
                <TailorSidebar />
            </div>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto pb-16 md:pb-0">{children}</main>

            {/* Mobile Bottom Navigation */}
            <div className="md:hidden">
                <TailorBottomNav />
            </div>
        </div>
    )
}
