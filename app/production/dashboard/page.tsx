"use client"

import { Box, TrendingUp, AlertCircle, CheckCircle, Clock, Users } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { useEffect, useState } from "react"
import { SpinnerCustom } from "@/components/ui/spinner"

interface Statistics {
    activeBatches: number
    pendingVerification: number
    completedToday: number
    productivity: number
}

interface ActiveBatch {
    id: string
    code: string
    product: string
    target: number
    stage: string
    progress: number
    status: string
}

interface PendingVerification {
    id: string
    type: string
    code: string
    stage: string
    worker: string
    product: string
    qty: number
    time: Date
}

interface WorkerSummary {
    cutting: number
    sewing: number
    finishing: number
}

export default function ProductionDashboard() {
    const [statistics, setStatistics] = useState<Statistics>({
        activeBatches: 0,
        pendingVerification: 0,
        completedToday: 0,
        productivity: 0,
    })
    const [activeBatches, setActiveBatches] = useState<ActiveBatch[]>([])
    const [pendingVerification, setPendingVerification] = useState<PendingVerification[]>([])
    const [workerSummary, setWorkerSummary] = useState<WorkerSummary>({
        cutting: 0,
        sewing: 0,
        finishing: 0,
    })
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchDashboardData()
    }, [])

    const fetchDashboardData = async () => {
        try {
            const response = await fetch("/api/production/statistics")
            const result = await response.json()

            if (result.success && result.data) {
                // Map API response to statistics object
                setStatistics({
                    activeBatches: result.data.activeBatchesCount || 0,
                    pendingVerification: result.data.pendingVerificationCount || 0,
                    completedToday: result.data.completedBatchesThisMonth || 0,
                    productivity: result.data.activeBatchesCount > 0
                        ? Math.round((result.data.completedBatchesThisMonth / result.data.activeBatchesCount) * 100)
                        : 0
                })

                // Map active batches with stage detection
                const mappedBatches = (result.data.activeBatches || []).map((batch: {
                    id: string
                    code: string
                    product: string
                    targetQuantity: number
                    status: string
                    progress: {
                        cutting: number
                        sewing: number
                        finishing: number
                    }
                }) => {
                    const progress = batch.progress || { cutting: 0, sewing: 0, finishing: 0 }
                    let stage = "Persiapan"
                    let totalProgress = 0

                    if (progress.finishing > 0) {
                        stage = "Finishing"
                        totalProgress = progress.finishing
                    } else if (progress.sewing > 0) {
                        stage = "Penjahitan"
                        totalProgress = progress.sewing
                    } else if (progress.cutting > 0) {
                        stage = "Pemotongan"
                        totalProgress = progress.cutting
                    }

                    return {
                        id: batch.id,
                        code: batch.code,
                        product: batch.product,
                        target: batch.targetQuantity,
                        stage,
                        progress: totalProgress,
                        status: batch.status
                    }
                })
                setActiveBatches(mappedBatches)

                setPendingVerification(result.data.pendingVerification || [])

                // Calculate worker summary from worker array
                const workers = result.data.workerSummary || []
                const cuttingCount = workers.filter((w: { role: string, activeTasks: number }) => w.role === "PEMOTONG" && w.activeTasks > 0).length
                const sewingCount = workers.filter((w: { role: string, activeTasks: number }) => w.role === "PENJAHIT" && w.activeTasks > 0).length
                const finishingCount = workers.filter((w: { role: string, activeTasks: number }) => w.role === "FINISHING" && w.activeTasks > 0).length

                setWorkerSummary({
                    cutting: cuttingCount,
                    sewing: sewingCount,
                    finishing: finishingCount
                })
            }
        } catch (error) {
            console.error("Error fetching dashboard data:", error)
        } finally {
            setLoading(false)
        }
    }

    const getTimeAgo = (date: Date) => {
        const now = new Date()
        const diff = now.getTime() - new Date(date).getTime()
        const minutes = Math.floor(diff / 60000)

        if (minutes < 1) return "baru saja"
        if (minutes < 60) return `${minutes} menit lalu`

        const hours = Math.floor(minutes / 60)
        if (hours < 24) return `${hours} jam lalu`

        const days = Math.floor(hours / 24)
        return `${days} hari lalu`
    }

    if (loading) {
        return (
            <div className="flex-1 space-y-4 p-8 pt-6">
                <SpinnerCustom />
                <div className="text-center">Memuat...</div>
            </div>
        )
    }

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Dashboard Produksi</h2>
                    <p className="text-muted-foreground">
                        Monitor dan kelola proses produksi
                    </p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Batch Aktif
                        </CardTitle>
                        <Box className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{statistics.activeBatches}</div>
                        <p className="text-xs text-muted-foreground">
                            Dalam proses produksi
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Perlu Verifikasi
                        </CardTitle>
                        <AlertCircle className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-500">{statistics.pendingVerification}</div>
                        <p className="text-xs text-muted-foreground">
                            Menunggu approval
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Selesai Hari Ini
                        </CardTitle>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{statistics.completedToday}</div>
                        <p className="text-xs text-muted-foreground">
                            Batch selesai
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Produktivitas
                        </CardTitle>
                        <TrendingUp className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{statistics.productivity}%</div>
                        <p className="text-xs text-muted-foreground">
                            Batch sesuai target
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                {/* Active Batches */}
                <Card className="lg:col-span-4">
                    <CardHeader>
                        <CardTitle>Batch Produksi Aktif</CardTitle>
                        <CardDescription>
                            Progress batch yang sedang berjalan
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-6">
                            {activeBatches.length === 0 ? (
                                <p className="text-center text-sm text-muted-foreground py-4">Tidak ada batch aktif</p>
                            ) : (
                                activeBatches.map((batch) => (
                                    <div key={batch.id} className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="font-mono text-sm font-medium">{batch.code}</p>
                                                <p className="text-sm text-muted-foreground">{batch.product}</p>
                                            </div>
                                            <Badge>{batch.stage}</Badge>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Progress value={batch.progress} className="flex-1" />
                                            <span className="text-sm text-muted-foreground">
                                                {batch.progress}%
                                            </span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Pending Verification */}
                <Card className="lg:col-span-3">
                    <CardHeader>
                        <CardTitle>Perlu Verifikasi</CardTitle>
                        <CardDescription>
                            Hasil kerja menunggu approval
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {pendingVerification.length === 0 ? (
                                <p className="text-center text-sm text-muted-foreground py-4">Tidak ada verifikasi pending</p>
                            ) : (
                                pendingVerification.map((item) => (
                                    <div key={`${item.type}-${item.id}`} className="flex items-start gap-3 p-3 rounded-lg border border-orange-200 bg-orange-50 dark:bg-orange-950 dark:border-orange-900">
                                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900">
                                            <Clock className="h-4 w-4 text-orange-600" />
                                        </div>
                                        <div className="flex-1 space-y-1">
                                            <p className="font-mono text-sm font-medium">{item.code}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {item.stage} • {item.worker}
                                            </p>
                                            <p className="text-xs text-muted-foreground">{getTimeAgo(item.time)}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Workers Summary */}
            <Card>
                <CardHeader>
                    <CardTitle>Status Pekerja</CardTitle>
                    <CardDescription>Ringkasan aktivitas tim produksi</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-3">
                        <div className="flex items-center gap-3 p-4 rounded-lg border">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900">
                                <Users className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{workerSummary.cutting}</p>
                                <p className="text-sm text-muted-foreground">Pemotong Aktif</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-4 rounded-lg border">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900">
                                <Users className="h-5 w-5 text-green-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{workerSummary.sewing}</p>
                                <p className="text-sm text-muted-foreground">Penjahit Aktif</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-4 rounded-lg border">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900">
                                <Users className="h-5 w-5 text-purple-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{workerSummary.finishing}</p>
                                <p className="text-sm text-muted-foreground">Finishing Aktif</p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
