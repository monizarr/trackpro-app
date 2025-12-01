import { Header } from "@/components/layout/header"

export default function DashboardPage() {
    return (
        <div className="h-full">
            <Header breadcrumbs={[{ label: "Dashboard" }]} />

            <div className="p-6 space-y-6">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-gray-50 rounded-lg border p-6 h-32 animate-pulse" />
                    <div className="bg-gray-50 rounded-lg border p-6 h-32 animate-pulse" />
                    <div className="bg-gray-50 rounded-lg border p-6 h-32 animate-pulse" />
                </div>

                {/* Main Chart */}
                <div className="bg-gray-50 rounded-lg border p-6 h-96 animate-pulse" />
            </div>
        </div>
    )
}
