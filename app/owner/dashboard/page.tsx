import { Header } from "@/components/layout/header"
import { Package, TrendingUp, Users, AlertTriangle, CheckCircle, Clock } from "lucide-react"

export default function DashboardPage() {
    const stats = [
        {
            title: "Total Products",
            value: "24",
            change: "+12%",
            trend: "up",
            icon: Package,
            color: "from-blue-500 to-blue-600"
        },
        {
            title: "Active Batches",
            value: "8",
            change: "+3",
            trend: "up",
            icon: TrendingUp,
            color: "from-purple-500 to-purple-600"
        },
        {
            title: "Total Employees",
            value: "45",
            change: "+5",
            trend: "up",
            icon: Users,
            color: "from-green-500 to-green-600"
        },
    ]

    const recentBatches = [
        { id: "BATCH-001", product: "Kaos Premium", status: "CUTTING", progress: 35, color: "blue" },
        { id: "BATCH-002", product: "Kemeja Formal", status: "SEWING", progress: 65, color: "purple" },
        { id: "BATCH-003", product: "Jaket Hoodie", status: "FINISHING", progress: 85, color: "green" },
        { id: "BATCH-004", product: "Celana Jeans", status: "PLANNED", progress: 10, color: "gray" },
    ]

    const qualityAlerts = [
        { batch: "BATCH-002", issue: "Minor stitching defect", severity: "warning" },
        { batch: "BATCH-001", issue: "Material shortage", severity: "error" },
    ]

    return (
        <div className="h-full">
            <Header breadcrumbs={[{ label: "Dashboard" }]} />

            <div className="p-6 space-y-6">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {stats.map((stat) => {
                        const Icon = stat.icon
                        return (
                            <div
                                key={stat.title}
                                className="relative overflow-hidden rounded-2xl bg-white border border-gray-100 p-6 shadow-sm hover:shadow-md transition-all duration-200"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="space-y-2">
                                        <p className="text-sm text-gray-600 font-medium">{stat.title}</p>
                                        <div className="flex items-baseline space-x-2">
                                            <h3 className="text-3xl font-bold text-gray-900">{stat.value}</h3>
                                            <span className={`text-sm font-medium ${stat.trend === "up" ? "text-green-600" : "text-red-600"
                                                }`}>
                                                {stat.change}
                                            </span>
                                        </div>
                                    </div>
                                    <div className={`w-14 h-14 rounded-xl bg-linear-to-br ${stat.color} flex items-center justify-center shadow-lg`}>
                                        <Icon className="w-7 h-7 text-white" />
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>

                {/* Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Recent Production Batches */}
                    <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-semibold text-gray-900">Recent Production Batches</h2>
                            <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                                View all
                            </button>
                        </div>
                        <div className="space-y-4">
                            {recentBatches.map((batch) => (
                                <div
                                    key={batch.id}
                                    className="flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors"
                                >
                                    <div className="flex items-center space-x-4 flex-1">
                                        <div className={`w-12 h-12 rounded-xl bg-${batch.color}-50 flex items-center justify-center`}>
                                            <Package className={`w-6 h-6 text-${batch.color}-600`} />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center space-x-2">
                                                <p className="font-medium text-gray-900">{batch.id}</p>
                                                <span className={`px-2 py-0.5 text-xs font-medium rounded-full bg-${batch.color}-50 text-${batch.color}-700`}>
                                                    {batch.status}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-600">{batch.product}</p>
                                            <div className="mt-2 w-full bg-gray-100 rounded-full h-2">
                                                <div
                                                    className={`h-2 rounded-full bg-${batch.color}-500`}
                                                    style={{ width: `${batch.progress}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right ml-4">
                                        <p className="text-sm font-semibold text-gray-900">{batch.progress}%</p>
                                        <p className="text-xs text-gray-500">Complete</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Quality Alerts & Quick Actions */}
                    <div className="space-y-6">
                        {/* Quality Alerts */}
                        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                            <div className="flex items-center space-x-2 mb-4">
                                <AlertTriangle className="w-5 h-5 text-orange-500" />
                                <h2 className="text-lg font-semibold text-gray-900">Quality Alerts</h2>
                            </div>
                            <div className="space-y-3">
                                {qualityAlerts.map((alert, index) => (
                                    <div
                                        key={index}
                                        className={`p-3 rounded-lg border ${alert.severity === "error"
                                                ? "bg-red-50 border-red-200"
                                                : "bg-orange-50 border-orange-200"
                                            }`}
                                    >
                                        <p className="text-sm font-medium text-gray-900">{alert.batch}</p>
                                        <p className="text-xs text-gray-600 mt-1">{alert.issue}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Quick Stats */}
                        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">Today&apos;s Overview</h2>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                                            <CheckCircle className="w-5 h-5 text-green-600" />
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600">Completed</p>
                                            <p className="text-lg font-semibold text-gray-900">12</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                                            <Clock className="w-5 h-5 text-blue-600" />
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600">In Progress</p>
                                            <p className="text-lg font-semibold text-gray-900">8</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center">
                                            <AlertTriangle className="w-5 h-5 text-orange-600" />
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600">Issues</p>
                                            <p className="text-lg font-semibold text-gray-900">2</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

