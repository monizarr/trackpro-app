"use client"

import { useEffect, useState } from "react"
import { Plus, CheckCircle, Loader2, AlertCircle } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/hooks/use-toast"
import { Alert, AlertDescription } from "@/components/ui/alert"

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
        batchSku: string
        targetQuantity: number
        product: {
            name: string
        }
    }
}

interface TimelineEvent {
    id: string
    batchId: string
    event: string
    details: string | null
    createdAt: string
}

export default function CuttingProcessPage() {
    const [tasks, setTasks] = useState<CuttingTask[]>([])
    const [selectedTask, setSelectedTask] = useState<CuttingTask | null>(null)
    const [timeline, setTimeline] = useState<TimelineEvent[]>([])
    const [loading, setLoading] = useState(true)
    const [loadingTimeline, setLoadingTimeline] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [piecesCompleted, setPiecesCompleted] = useState("")
    const [rejectPieces, setRejectPieces] = useState("")
    const [wasteQty, setWasteQty] = useState("")
    const [notes, setNotes] = useState("")
    const { toast } = useToast()

    const fetchTasks = async () => {
        try {
            const response = await fetch('/api/cutting-tasks/me')

            if (response.ok) {
                const data = await response.json()
                setTasks(data)

                // If we have a currently selected task, try to find it in the new data
                if (selectedTask) {
                    const updatedSelectedTask = data.find((t: CuttingTask) => t.id === selectedTask.id)
                    if (updatedSelectedTask) {
                        setSelectedTask(updatedSelectedTask)
                        setPiecesCompleted(updatedSelectedTask.piecesCompleted?.toString() || "0")
                        setRejectPieces(updatedSelectedTask.rejectPieces?.toString() || "0")
                        setWasteQty(updatedSelectedTask.wasteQty?.toString() || "0")
                        setNotes(updatedSelectedTask.notes || "")
                        // Fetch timeline for the selected task
                        fetchTimeline(updatedSelectedTask.batchId)
                        return
                    }
                }

                // Auto-select first task in progress or pending, or just the first task
                const activeTask = data.find((t: CuttingTask) =>
                    t.status === 'IN_PROGRESS' || t.status === 'PENDING'
                ) || data[0]

                if (activeTask) {
                    setSelectedTask(activeTask)
                    setPiecesCompleted(activeTask.piecesCompleted?.toString() || "0")
                    setRejectPieces(activeTask.rejectPieces?.toString() || "0")
                    setWasteQty(activeTask.wasteQty?.toString() || "0")
                    setNotes(activeTask.notes || "")
                    // Fetch timeline for the active task
                    fetchTimeline(activeTask.batchId)
                }
            }
        } catch (err) {
            toast({
                variant: "destructive",
                title: "Error",
                description: "Gagal memuat data task: " + err
            })
        } finally {
            setLoading(false)
        }
    }

    const fetchTimeline = async (batchId: string) => {
        try {
            setLoadingTimeline(true)
            const response = await fetch(`/api/production-batches/${batchId}/timeline`)

            if (response.ok) {
                const data = await response.json()
                if (data.success) {
                    setTimeline(data.data || [])
                }
            }
        } catch (err) {
            console.error("Error fetching timeline:", err)
        } finally {
            setLoadingTimeline(false)
        }
    }

    useEffect(() => {
        fetchTasks()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const handleStart = async () => {
        if (!selectedTask || selectedTask.status !== 'PENDING') return

        setSubmitting(true)
        try {
            const response = await fetch(`/api/cutting-tasks/${selectedTask.id}/start`, {
                method: 'PATCH'
            })

            if (response.ok) {
                toast({
                    title: "Berhasil",
                    description: "Task pemotongan dimulai"
                })
                fetchTasks()
            } else {
                throw new Error('Failed to start task')
            }
        } catch {
            toast({
                variant: "destructive",
                title: "Error",
                description: "Gagal memulai task"
            })
        } finally {
            setSubmitting(false)
        }
    }

    const handleUpdateProgress = async () => {
        if (!selectedTask || selectedTask.status !== 'IN_PROGRESS') return

        setSubmitting(true)
        try {
            const response = await fetch(`/api/cutting-tasks/${selectedTask.id}/progress`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    piecesCompleted: parseInt(piecesCompleted) || 0,
                    rejectPieces: parseInt(rejectPieces) || 0,
                    wasteQty: parseFloat(wasteQty) || 0,
                    notes
                })
            })

            if (response.ok) {
                toast({
                    title: "Berhasil",
                    description: "Progress berhasil disimpan"
                })
                fetchTasks()
            } else {
                throw new Error('Failed to update progress')
            }
        } catch {
            toast({
                variant: "destructive",
                title: "Error",
                description: "Gagal menyimpan progress"
            })
        } finally {
            setSubmitting(false)
        }
    }

    const handleComplete = async () => {
        if (!selectedTask || selectedTask.status !== 'IN_PROGRESS') return

        if (!piecesCompleted || !rejectPieces || !wasteQty) {
            toast({
                variant: "destructive",
                title: "Error",
                description: "Harap isi semua field sebelum submit"
            })
            return
        }

        setSubmitting(true)
        try {
            const response = await fetch(`/api/cutting-tasks/${selectedTask.id}/complete`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    piecesCompleted: parseInt(piecesCompleted),
                    rejectPieces: parseInt(rejectPieces),
                    wasteQty: parseFloat(wasteQty),
                    notes
                })
            })

            if (response.ok) {
                toast({
                    title: "Berhasil",
                    description: "Task selesai dan menunggu verifikasi"
                })
                fetchTasks()
                // Reset form
                setPiecesCompleted("0")
                setRejectPieces("0")
                setWasteQty("0")
                setNotes("")
            } else {
                const error = await response.json()
                throw new Error(error.error || 'Failed to complete task')
            }
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Error",
                description: error instanceof Error ? error.message : "Gagal menyelesaikan task"
            })
        } finally {
            setSubmitting(false)
        }
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
            <div className="flex-1 space-y-4 p-8 pt-6">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Proses Pemotongan</h2>
                    <p className="text-muted-foreground">
                        Update progress pekerjaan pemotongan
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

    const currentBatch = selectedTask ? {
        code: selectedTask.batch.batchSku,
        product: selectedTask.batch.product.name,
        target: selectedTask.batch.targetQuantity,
        completed: selectedTask.piecesCompleted || 0,
        reject: selectedTask.rejectPieces || 0,
        waste: selectedTask.wasteQty || 0,
        materialReceived: selectedTask.materialReceived,
        status: selectedTask.status
    } : null

    if (!currentBatch) {
        return (
            <div className="flex-1 space-y-4 p-8 pt-6">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Proses Pemotongan</h2>
                    <p className="text-muted-foreground">
                        Update progress pekerjaan pemotongan
                    </p>
                </div>
                <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                        Tidak ada task yang dipilih.
                    </AlertDescription>
                </Alert>
            </div>
        )
    }

    const getStatusBadge = (status: string) => {
        const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", label: string }> = {
            'PENDING': { variant: 'outline', label: 'Menunggu' },
            'IN_PROGRESS': { variant: 'default', label: 'Sedang Proses' },
            'COMPLETED': { variant: 'secondary', label: 'Selesai' },
            'VERIFIED': { variant: 'secondary', label: 'Terverifikasi' }
        }
        const config = variants[status] || { variant: 'outline', label: status }
        return <Badge variant={config.variant}>{config.label}</Badge>
    }

    const getEventLabel = (event: string) => {
        const labels: Record<string, string> = {
            'BATCH_CREATED': 'Batch Dibuat',
            'MATERIAL_REQUESTED': 'Material Diminta',
            'MATERIAL_ALLOCATED': 'Material Dialokasikan',
            'ASSIGNED_TO_CUTTER': 'Ditugaskan ke Pemotong',
            'CUTTING_STARTED': 'Pemotongan Dimulai',
            'CUTTING_COMPLETED': 'Pemotongan Selesai',
            'CUTTING_VERIFIED': 'Pemotongan Diverifikasi',
            'ASSIGNED_TO_SEWER': 'Ditugaskan ke Penjahit',
            'SEWING_STARTED': 'Penjahitan Dimulai',
            'SEWING_COMPLETED': 'Penjahitan Selesai',
            'SEWING_VERIFIED': 'Penjahitan Diverifikasi',
            'ASSIGNED_TO_FINISHING': 'Ditugaskan ke Finishing',
            'FINISHING_STARTED': 'Finishing Dimulai',
            'FINISHING_COMPLETED': 'Finishing Selesai',
            'WAREHOUSE_VERIFIED': 'Diverifikasi Gudang',
            'BATCH_COMPLETED': 'Batch Selesai',
            'BATCH_CANCELLED': 'Batch Dibatalkan',
        }
        return labels[event] || event
    }

    const getEventIcon = (event: string) => {
        if (event.includes('CUTTING')) {
            return '✂️'
        } else if (event.includes('SEWING')) {
            return '🧵'
        } else if (event.includes('FINISHING')) {
            return '✨'
        } else if (event.includes('MATERIAL')) {
            return '📦'
        } else if (event.includes('VERIFIED')) {
            return '✅'
        } else if (event.includes('COMPLETED')) {
            return '🎉'
        } else if (event.includes('CANCELLED')) {
            return '❌'
        }
        return '📌'
    }

    const formatDateTime = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("id-ID", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        })
    }

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Proses Pemotongan</h2>
                    <p className="text-muted-foreground">
                        Update progress pekerjaan pemotongan
                    </p>
                </div>
            </div>

            {/* Task Selection */}
            {tasks.length >= 1 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Pilih Task</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-2">
                            {tasks.map((task) => (
                                <Button
                                    key={task.id}
                                    variant={selectedTask?.id === task.id ? "default" : "outline"}
                                    className="justify-start"
                                    onClick={() => {
                                        setSelectedTask(task)
                                        setPiecesCompleted(task.piecesCompleted?.toString() || "0")
                                        setRejectPieces(task.rejectPieces?.toString() || "0")
                                        setWasteQty(task.wasteQty?.toString() || "0")
                                        setNotes(task.notes || "")
                                        fetchTimeline(task.batchId)
                                    }}
                                >
                                    <div className="flex items-center justify-between w-full">
                                        <span>{task.batch.batchSku} - {task.batch.product.name}</span>
                                        {getStatusBadge(task.status)}
                                    </div>
                                </Button>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Current Batch Info */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="font-mono">{currentBatch.code}</CardTitle>
                            <CardDescription>{currentBatch.product}</CardDescription>
                        </div>
                        {getStatusBadge(currentBatch.status)}
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <div className="flex justify-between text-sm mb-2">
                            <span className="text-muted-foreground">Progress</span>
                            <span className="font-medium">{currentBatch.completed}/{currentBatch.target} pcs ({Math.round((currentBatch.completed / currentBatch.target) * 100)}%)</span>
                        </div>
                        <Progress value={(currentBatch.completed / currentBatch.target) * 100} />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <p className="text-sm text-muted-foreground">Material Diterima</p>
                            <p className="text-2xl font-bold">{currentBatch.materialReceived} meter</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm text-muted-foreground">Target</p>
                            <p className="text-2xl font-bold">{currentBatch.target} pcs</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                            <p className="text-sm text-muted-foreground">Completed</p>
                            <p className="text-xl font-bold text-green-600 dark:text-green-400">{currentBatch.completed}</p>
                        </div>
                        <div className="p-3 bg-red-50 dark:bg-red-950 rounded-lg">
                            <p className="text-sm text-muted-foreground">Reject</p>
                            <p className="text-xl font-bold text-red-600 dark:text-red-400">{currentBatch.reject}</p>
                        </div>
                        <div className="p-3 bg-orange-50 dark:bg-orange-950 rounded-lg">
                            <p className="text-sm text-muted-foreground">Waste</p>
                            <p className="text-xl font-bold text-orange-600 dark:text-orange-400">{currentBatch.waste}m</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Start Task (if PENDING) */}
            {currentBatch.status === 'PENDING' && (
                <Card>
                    <CardHeader>
                        <CardTitle>Mulai Pemotongan</CardTitle>
                        <CardDescription>Klik tombol di bawah untuk memulai proses pemotongan</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button
                            onClick={handleStart}
                            disabled={submitting}
                            className="w-full"
                        >
                            {submitting ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Memulai...
                                </>
                            ) : (
                                <>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Mulai Pemotongan
                                </>
                            )}
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Update Progress (if IN_PROGRESS) */}
            {currentBatch.status === 'IN_PROGRESS' && (
                <Card>
                    <CardHeader>
                        <CardTitle>Update Progress</CardTitle>
                        <CardDescription>Catat progress pemotongan yang telah diselesaikan</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="piecesCompleted">Jumlah Selesai</Label>
                                <Input
                                    id="piecesCompleted"
                                    type="number"
                                    value={piecesCompleted}
                                    onChange={(e) => setPiecesCompleted(e.target.value)}
                                    placeholder="0"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="rejectPieces">Reject</Label>
                                <Input
                                    id="rejectPieces"
                                    type="number"
                                    value={rejectPieces}
                                    onChange={(e) => setRejectPieces(e.target.value)}
                                    placeholder="0"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="wasteQty">Waste (meter)</Label>
                                <Input
                                    id="wasteQty"
                                    type="number"
                                    step="0.1"
                                    value={wasteQty}
                                    onChange={(e) => setWasteQty(e.target.value)}
                                    placeholder="0"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="notes">Catatan</Label>
                            <Input
                                id="notes"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Tambahkan catatan jika ada kendala atau informasi penting"
                            />
                        </div>

                        <div className="flex gap-2">
                            <Button
                                onClick={handleUpdateProgress}
                                disabled={submitting}
                                className="flex-1"
                            >
                                {submitting ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Menyimpan...
                                    </>
                                ) : (
                                    <>
                                        <Plus className="h-4 w-4 mr-2" />
                                        Simpan Progress
                                    </>
                                )}
                            </Button>
                            <Button
                                variant="default"
                                onClick={handleComplete}
                                disabled={submitting}
                                className="flex-1 bg-green-600 hover:bg-green-700"
                            >
                                {submitting ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Submitting...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle className="h-4 w-4 mr-2" />
                                        Submit untuk Verifikasi
                                    </>
                                )}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Task Completed */}
            {(currentBatch.status === 'COMPLETED' || currentBatch.status === 'VERIFIED') && (
                <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                        Task ini sudah selesai dan {currentBatch.status === 'VERIFIED' ? 'telah diverifikasi' : 'menunggu verifikasi'}.
                    </AlertDescription>
                </Alert>
            )}

            {/* All Tasks List */}
            <Card>
                <CardHeader>
                    <CardTitle>Semua Task</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {tasks.map((task) => (
                            <div key={task.id} className="flex items-center justify-between p-3 border rounded-lg">
                                <div>
                                    <p className="font-medium font-mono">{task.batch.batchSku}</p>
                                    <p className="text-sm text-muted-foreground">{task.batch.product.name}</p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {task.piecesCompleted}/{task.batch.targetQuantity} pcs • Reject: {task.rejectPieces} • Waste: {task.wasteQty || 0}m
                                    </p>
                                </div>
                                {getStatusBadge(task.status)}
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Timeline History */}
            {selectedTask && (
                <Card>
                    <CardHeader>
                        <CardTitle>Riwayat Progress Pemotongan</CardTitle>
                        <CardDescription>
                            Timeline aktivitas untuk batch {selectedTask.batch.batchSku}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loadingTimeline ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="h-6 w-6 animate-spin" />
                            </div>
                        ) : timeline.length > 0 ? (
                            <div className="space-y-4">
                                {timeline.map((event, index) => (
                                    <div key={event.id} className="flex gap-4">
                                        <div className="flex flex-col items-center">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-lg">
                                                {getEventIcon(event.event)}
                                            </div>
                                            {index < timeline.length - 1 && (
                                                <div className="w-px h-full bg-border mt-2" />
                                            )}
                                        </div>
                                        <div className="flex-1 pb-6">
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <p className="font-medium">{getEventLabel(event.event)}</p>
                                                    {event.details && (
                                                        <p className="text-sm text-muted-foreground mt-1">
                                                            {event.details}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-2">
                                                {formatDateTime(event.createdAt)}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-muted-foreground">
                                <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-20" />
                                <p className="text-sm">Belum ada riwayat untuk batch ini</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
