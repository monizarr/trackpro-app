"use client"

import { useEffect, useState } from "react"
import { Scissors, CheckCircle, Clock, Loader2, AlertCircle, Clock2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface Stats {
    pendingTask: number
    activeTasks: number
    completedToday: number
    completedYesterday: number
    progressPercentage: number
}

interface ActiveTask {
    id: string
    batchId: string
    piecesReceived: number
    piecesCompleted: number
    rejectPieces: number
    status: string
    createdAt: string
    batch: {
        batchSku: string
        targetQuantity: number
        startDate: string
        product: {
            name: string
        }
    }
}

export default function TailorDashboard() {
    const [stats, setStats] = useState<Stats | null>(null)
    const [activeTasks, setActiveTasks] = useState<ActiveTask[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true)

                // Fetch stats
                const statsRes = await fetch('/api/sewing-tasks/stats')
                if (!statsRes.ok) throw new Error('Gagal mengambil statistik')
                const statsData = await statsRes.json()
                setStats(statsData)

                // Fetch active tasks
                const tasksRes = await fetch('/api/sewing-tasks/active')
                if (!tasksRes.ok) throw new Error('Gagal mengambil data task')
                const tasksData = await tasksRes.json()
                setActiveTasks(tasksData)
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Gagal memuat data')
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [])
    console.log(stats)
    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex-1 space-y-4 p-8 pt-6">
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            </div>
        )
    }

    const statsCards = stats ? [
        {
            title: "Tugas Menunggu",
            value: stats.pendingTask.toString(),
            subtitle: "Menunggu dikerjakan",
            icon: Clock2
        },
        {
            title: "Tugas Aktif",
            value: stats.activeTasks.toString(),
            subtitle: "Sedang dikerjakan",
            icon: Scissors
        },
        {
            title: "Selesai Hari Ini",
            value: stats.completedToday.toString(),
            subtitle: stats.completedToday > stats.completedYesterday
                ? `+${stats.completedToday - stats.completedYesterday} dari kemarin`
                : stats.completedToday < stats.completedYesterday
                    ? `-${stats.completedYesterday - stats.completedToday} dari kemarin`
                    : "Sama dengan kemarin",
            icon: CheckCircle
        },
        {
            title: "Total Progress",
            value: `${stats.progressPercentage}%`,
            subtitle: "Dari semua task",
            icon: Clock
        },
    ] : []

    return (
        <div className="flex-1 space-y-4 p-4 sm:p-6 md:p-8 pt-4 sm:pt-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Dashboard Penjahit</h2>
                    <p className="text-sm sm:text-base text-muted-foreground">
                        Kelola pekerjaan penjahitan Anda
                    </p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {statsCards.map((stat) => {
                    const Icon = stat.icon
                    return (
                        <Card key={stat.title}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                                <Icon className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{stat.value}</div>
                                <p className="text-xs text-muted-foreground">{stat.subtitle}</p>
                            </CardContent>
                        </Card>
                    )
                })}
            </div>

            {/* Active Batches */}
            <Card>
                <CardHeader>
                    <CardTitle>Batch Aktif</CardTitle>
                    <CardDescription>Pekerjaan penjahitan yang sedang berlangsung</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {activeTasks.length === 0 ? (
                        <Alert>
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                                Tidak ada task aktif saat ini.
                            </AlertDescription>
                        </Alert>
                    ) : (
                        activeTasks.map((task) => {
                            const progress = (task.piecesCompleted / task.piecesReceived) * 100
                            const getStatusLabel = (status: string) => {
                                const labels: Record<string, string> = {
                                    'PENDING': 'Menunggu',
                                    'IN_PROGRESS': 'Sedang Proses',
                                    'COMPLETED': 'Selesai',
                                    'VERIFIED': 'Terverifikasi'
                                }
                                return labels[status] || status
                            }

                            return (
                                <div key={task.id} className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-mono text-sm font-medium">{task.batch.batchSku}</p>
                                            <p className="text-sm text-muted-foreground">{task.batch.product.name}</p>
                                        </div>
                                        <Badge variant={task.status === 'IN_PROGRESS' ? 'default' : 'outline'}>
                                            {getStatusLabel(task.status)}
                                        </Badge>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground">
                                            Progress: {task.piecesCompleted}/{task.piecesReceived} pcs
                                            {task.rejectPieces > 0 && ` • Reject: ${task.rejectPieces}`}
                                        </span>
                                        <span className="text-muted-foreground">{Math.round(progress)}%</span>
                                    </div>
                                    <Progress value={progress} />
                                    <p className="text-xs text-muted-foreground">
                                        Target batch: {task.batch.targetQuantity} pcs
                                    </p>
                                </div>
                            )
                        })
                    )}
                </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
                <CardHeader>
                    <CardTitle>Panduan Kerja</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                    <div className="flex items-start gap-2">
                        <div className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />
                        <p>Terima potongan yang sudah diverifikasi</p>
                    </div>
                    <div className="flex items-start gap-2">
                        <div className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />
                        <p>Lakukan penjahitan sesuai spesifikasi</p>
                    </div>
                    <div className="flex items-start gap-2">
                        <div className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />
                        <p>Update progress secara berkala</p>
                    </div>
                    <div className="flex items-start gap-2">
                        <div className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />
                        <p>Submit untuk verifikasi setelah selesai</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
