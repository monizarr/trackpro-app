"use client"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertCircle, CheckCircle, ChevronRight, Clock, Loader2, Play, Zap } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "@/lib/toast"
import { useEffect, useState } from "react"

interface CuttingTask {
    id: string
    batchId: string
    materialReceived: number
    piecesCompleted: number
    rejectPieces: number
    wasteQty: number | null
    status: string
    notes: string | null
    startedAt: Date | null
    completedAt: Date | null
    batch: {
        id: string
        batchSku: string
        status: string
        targetQuantity: number
        totalRolls: number | null
        product: {
            name: string
        }
        sizeColorRequests?: Array<{
            id: string
            productSize: string
            color: string
            requestedPieces: number
        }>
        cuttingResults?: Array<{
            id: string
            productSize: string
            color: string
            actualPieces: number
        }>
    }
}

export default function CuttingProcessPage() {
    const router = useRouter()
    const [tasks, setTasks] = useState<CuttingTask[]>([])
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState("MENUNGGU")
    const [selectedMonth, setSelectedMonth] = useState(() => {
        const now = new Date()
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    })

    const STATUS_GROUPS = {
        MENUNGGU: {
            label: "Menunggu",
            statuses: ["ASSIGNED_TO_CUTTER"],
            icon: Clock,
            color: "text-yellow-600"
        },
        PROSES: {
            label: "Proses",
            statuses: ["IN_CUTTING"],
            icon: Play,
            color: "text-blue-600"
        },
        SELESAI: {
            label: "Selesai",
            statuses: ["CUTTING_COMPLETED"],
            icon: CheckCircle,
            color: "text-orange-600"
        },
        TERVERIFIKASI: {
            label: "Terverifikasi",
            statuses: ["CUTTING_VERIFIED", "IN_SEWING", "SEWING_COMPLETED", "SEWING_VERIFIED", "FINISHING_COMPLETED", "COMPLETED", "ASSIGNED_TO_SEWER", "IN_FINISHING", "WAREHOUSE_VERIFIED", "ASSIGNED_TO_FINISHING"],
            icon: Zap,
            color: "text-green-600"
        }
    }

    const fetchTasks = async () => {
        try {
            const response = await fetch('/api/cutting-tasks/me')
            if (response.ok) {
                const data = await response.json()
                setTasks(data)
            }
        } catch (err) {
            toast.error("Gagal", "Gagal memuat data task: " + err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchTasks()
    }, [])

    const filterTasks = (groupStatuses: string[]) => {
        return tasks.filter(task => {
            const matchesStatus = groupStatuses.includes(task.batch.status)

            let taskDate: Date
            if (task.startedAt) {
                taskDate = new Date(task.startedAt)
            } else if (task.completedAt) {
                taskDate = new Date(task.completedAt)
            } else {
                return matchesStatus
            }

            const taskMonth = `${taskDate.getFullYear()}-${String(taskDate.getMonth() + 1).padStart(2, '0')}`
            const matchesMonth = taskMonth === selectedMonth

            return matchesStatus && matchesMonth
        })
    }

    const getGroupStats = (groupStatuses: string[]) => {
        const groupTasks = tasks.filter(task => {
            const matchesStatus = groupStatuses.includes(task.batch.status)

            let taskDate: Date
            if (task.startedAt) {
                taskDate = new Date(task.startedAt)
            } else if (task.completedAt) {
                taskDate = new Date(task.completedAt)
            } else {
                return matchesStatus
            }

            const taskMonth = `${taskDate.getFullYear()}-${String(taskDate.getMonth() + 1).padStart(2, '0')}`
            const matchesMonth = taskMonth === selectedMonth

            return matchesStatus && matchesMonth
        })
        return {
            total: groupTasks.length,
        }
    }

    const getStatusBadge = (status: string) => {
        const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", label: string }> = {
            'ASSIGNED_TO_CUTTER': { variant: 'outline', label: 'Menunggu Dimulai' },
            'IN_CUTTING': { variant: 'default', label: 'Sedang Proses' },
            'CUTTING_COMPLETED': { variant: 'secondary', label: 'Selesai' },
            'CUTTING_VERIFIED': { variant: 'secondary', label: 'Terverifikasi' }
        }
        const config = variants[status] || { variant: 'outline', label: status }
        return <Badge variant={config.variant}>{config.label}</Badge>
    }

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        )
    }

    if (tasks.length === 0) {
        return (
            <div className="flex-1 space-y-4 p-4 sm:p-6 md:p-8 pt-4 sm:pt-6">
                <div>
                    <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Daftar Task Pemotongan</h2>
                    <p className="text-sm sm:text-base text-muted-foreground">
                        Pilih task pemotongan untuk memulai
                    </p>
                </div>
                <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                        Tidak ada task pemotongan yang ditugaskan saat ini.
                    </AlertDescription>
                </Alert>
            </div>
        )
    }

    return (
        <div className="flex-1 space-y-4 p-4 sm:p-6 md:p-8 pt-4 sm:pt-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Daftar Task Pemotongan</h2>
                    <p className="text-sm sm:text-base text-muted-foreground">
                        Pilih task pemotongan untuk mulai atau melanjutkan pekerjaan
                    </p>
                </div>
            </div>

            {/* Filter by Month */}
            <div className="flex gap-4 items-end flex-wrap">
                <div className="flex-1 min-w-[200px]">
                    <label className="text-sm text-muted-foreground mb-2 block">Filter Bulan</label>
                    <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm"
                    >
                        {[...Array(12)].map((_, i) => {
                            const date = new Date()
                            date.setMonth(date.getMonth() - i)
                            const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
                            const label = date.toLocaleDateString("id-ID", { month: "long", year: "numeric" })
                            return (
                                <option key={value} value={value}>
                                    {label}
                                </option>
                            )
                        })}
                    </select>
                </div>
            </div>

            {/* Tabs by Status Group */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <TabsList className="grid w-full grid-cols-4">
                    {Object.entries(STATUS_GROUPS).map(([key, group]) => {
                        const stats = getGroupStats(group.statuses)
                        const Icon = group.icon
                        return (
                            <TabsTrigger key={key} value={key} className="relative">
                                <Icon className={`h-4 w-4 mr-2 ${group.color}`} />
                                <span className="hidden sm:inline">{group.label}</span>
                                {stats.total > 0 && (
                                    <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                                        {stats.total}
                                    </Badge>
                                )}
                            </TabsTrigger>
                        )
                    })}
                </TabsList>

                {Object.entries(STATUS_GROUPS).map(([key, group]) => {
                    const filteredTasks = filterTasks(group.statuses)

                    return (
                        <TabsContent key={key} value={key} className="space-y-4">
                            {filteredTasks.length === 0 ? (
                                <Alert>
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertDescription>
                                        Tidak ada task dengan status {group.label.toLowerCase()}.
                                    </AlertDescription>
                                </Alert>
                            ) : (
                                <div className="grid gap-3">
                                    {filteredTasks.map((task) => (
                                        <Card
                                            key={task.id}
                                            className="cursor-pointer hover:shadow-md transition-shadow"
                                            onClick={() => router.push(`/cutter/process/${task.id}`)}
                                        >
                                            <CardContent className="p-4">
                                                <div className="flex items-center justify-between gap-4">
                                                    <div className="flex-1 min-w-0">
                                                        <div className="font-mono font-medium text-sm sm:text-base truncate">{task.batch.batchSku}</div>
                                                        <div className="text-xs sm:text-sm text-muted-foreground truncate">{task.batch.product.name}</div>
                                                        <div className="text-xs text-muted-foreground mt-1">
                                                            Target: {task.batch.targetQuantity} pcs
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <div className="text-right">
                                                            {getStatusBadge(task.batch.status)}
                                                        </div>
                                                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </TabsContent>
                    )
                })}
            </Tabs>
        </div>
    )
}
