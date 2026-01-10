import { CutterSidebar } from "@/components/layout/cutter-sidebar"
import { CutterBottomNav } from "@/components/layout/cutter-bottom-nav"
import { requireRole } from "@/lib/auth-helpers"

export default async function CutterLayout({
    children,
}: {
    children: React.ReactNode
}) {
    await requireRole(["PEMOTONG"])

    return (
        <div className="flex h-screen overflow-hidden bg-background">
            {/* Desktop Sidebar */}
            <div className="hidden md:block">
                <CutterSidebar />
            </div>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto pb-16 md:pb-0">{children}</main>

            {/* Mobile Bottom Navigation */}
            <div className="md:hidden">
                <CutterBottomNav />
            </div>
        </div>
    )
}
