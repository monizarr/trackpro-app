"use client"

import { useEffect, useState } from "react"
import { Sparkles, CheckCircle, Clock, Loader2, Clock2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"

interface FinishingTask {
    id: string
    batchId: string
    piecesReceived: number
    piecesCompleted: number
    rejectPieces: number
    status: string
    notes: string | null
    startedAt: Date | null
    completedAt: Date | null
    batch: {
        batchSku: string
        targetQuantity: number
        product: {
            name: string
        }
    }
}

export default function FinishingDashboard() {
    const [tasks, setTasks] = useState<FinishingTask[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchTasks = async () => {
            try {
                const response = await fetch('/api/finishing-tasks/me')
                if (response.ok) {
                    const data = await response.json()
                    setTasks(data)
                }
            } catch (error) {
                console.error('Error fetching tasks:', error)
            } finally {
                setLoading(false)
            }
        }

        fetchTasks()
    }, [])

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        )
    }
    const pendingTasks = tasks.filter(t => t.status === 'PENDING')
    const activeTasks = tasks.filter(t => t.status === 'IN_PROGRESS')
    const completedToday = tasks.filter(t => {
        if (t.status !== 'COMPLETED' || !t.completedAt) return false
        const today = new Date()
        const completedDate = new Date(t.completedAt)
        return completedDate.toDateString() === today.toDateString()
    })

    const totalProgress = activeTasks.length > 0
        ? Math.round(activeTasks.reduce((acc, task) => {
            return acc + ((task.piecesCompleted / task.piecesReceived) * 100)
        }, 0) / activeTasks.length)
        : 0

    const stats = [
        { title: "Tugas Menunggu", value: pendingTasks.length.toString(), subtitle: "Menunggu dikerjakan", icon: Clock2 },
        { title: "Tugas Aktif", value: activeTasks.length.toString(), subtitle: "Sedang dikerjakan", icon: Sparkles },
        { title: "Selesai Hari Ini", value: completedToday.length.toString(), subtitle: `${completedToday.reduce((acc, t) => acc + t.piecesCompleted, 0)} pcs total`, icon: CheckCircle },
        { title: "Total Progress", value: `${totalProgress}%`, subtitle: "Rata-rata progress", icon: Clock },
    ]

    return (
        <div className="flex-1 space-y-4 p-4 sm:p-6 md:p-8 pt-4 sm:pt-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Dashboard Finishing</h2>
                    <p className="text-sm sm:text-base text-muted-foreground">
                        Kelola pekerjaan finishing Anda
                    </p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-3">
                {stats.map((stat) => {
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
                    <CardDescription>Pekerjaan finishing yang sedang berlangsung</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {activeTasks.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">Tidak ada batch aktif</p>
                    ) : (
                        activeTasks.map((task) => (
                            <div key={task.id} className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-mono text-sm font-medium">{task.batch.batchSku}</p>
                                        <p className="text-sm text-muted-foreground">{task.batch.product.name}</p>
                                    </div>
                                    <Badge variant={task.status === 'IN_PROGRESS' ? 'default' : 'secondary'}>
                                        {task.status === 'IN_PROGRESS' ? 'Finishing' : 'Menunggu'}
                                    </Badge>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">Progress: {task.piecesCompleted}/{task.piecesReceived} pcs</span>
                                    <span className="text-muted-foreground">{Math.round((task.piecesCompleted / task.piecesReceived) * 100)}%</span>
                                </div>
                                <Progress value={(task.piecesCompleted / task.piecesReceived) * 100} />
                            </div>
                        ))
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
                        <p>Terima jahitan yang sudah diverifikasi</p>
                    </div>
                    <div className="flex items-start gap-2">
                        <div className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />
                        <p>Lakukan quality check dan finishing (setrika, label, packaging)</p>
                    </div>
                    <div className="flex items-start gap-2">
                        <div className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />
                        <p>Update progress secara berkala</p>
                    </div>
                    <div className="flex items-start gap-2">
                        <div className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />
                        <p>Submit produk jadi ke gudang</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
