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

interface SewingTask {
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

export default function SewingProcessPage() {
    const [tasks, setTasks] = useState<SewingTask[]>([])
    const [selectedTask, setSelectedTask] = useState<SewingTask | null>(null)
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [piecesCompleted, setPiecesCompleted] = useState("")
    const [rejectPieces, setRejectPieces] = useState("")
    const [notes, setNotes] = useState("")
    const { toast } = useToast()

    const fetchTasks = async () => {
        try {
            const response = await fetch('/api/sewing-tasks/me')

            if (response.ok) {
                const data = await response.json()
                setTasks(data)

                // If we have a currently selected task, try to find it in the new data
                if (selectedTask) {
                    const updatedSelectedTask = data.find((t: SewingTask) => t.id === selectedTask.id)
                    if (updatedSelectedTask) {
                        setSelectedTask(updatedSelectedTask)
                        setPiecesCompleted(updatedSelectedTask.piecesCompleted?.toString() || "0")
                        setRejectPieces(updatedSelectedTask.rejectPieces?.toString() || "0")
                        setNotes(updatedSelectedTask.notes || "")
                        return
                    }
                }

                // Auto-select first task in progress or pending, or just the first task
                const activeTask = data.find((t: SewingTask) =>
                    t.status === 'IN_PROGRESS' || t.status === 'PENDING'
                ) || data[0]

                if (activeTask) {
                    setSelectedTask(activeTask)
                    setPiecesCompleted(activeTask.piecesCompleted?.toString() || "0")
                    setRejectPieces(activeTask.rejectPieces?.toString() || "0")
                    setNotes(activeTask.notes || "")
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

    useEffect(() => {
        fetchTasks()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const handleStart = async () => {
        if (!selectedTask || selectedTask.status !== 'PENDING') return

        setSubmitting(true)
        try {
            const response = await fetch(`/api/sewing-tasks/${selectedTask.id}/start`, {
                method: 'PATCH'
            })

            if (response.ok) {
                toast({
                    title: "Berhasil",
                    description: "Task penjahitan dimulai"
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

        const completedToAdd = parseInt(piecesCompleted) || 0
        const rejectToAdd = parseInt(rejectPieces) || 0

        if (completedToAdd === 0 && rejectToAdd === 0) {
            toast({
                variant: "destructive",
                title: "Error",
                description: "Harap isi minimal satu field untuk update progress"
            })
            return
        }

        setSubmitting(true)
        try {
            const response = await fetch(`/api/sewing-tasks/${selectedTask.id}/progress`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    piecesCompleted: completedToAdd,
                    rejectPieces: rejectToAdd,
                    notes
                })
            })

            if (response.ok) {
                toast({
                    title: "Berhasil",
                    description: `Progress ditambahkan: +${completedToAdd} completed, +${rejectToAdd} reject`
                })
                // Reset input fields after save
                setPiecesCompleted("0")
                setRejectPieces("0")
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

        const completedToAdd = parseInt(piecesCompleted) || 0
        const rejectToAdd = parseInt(rejectPieces) || 0

        // Calculate final totals
        const finalCompleted = selectedTask.piecesCompleted + completedToAdd
        const finalReject = selectedTask.rejectPieces + rejectToAdd

        // Validate total pieces
        if (finalCompleted + finalReject > selectedTask.piecesReceived) {
            toast({
                variant: "destructive",
                title: "Error",
                description: `Total pieces (${finalCompleted + finalReject}) melebihi pieces yang diterima (${selectedTask.piecesReceived})`
            })
            return
        }

        setSubmitting(true)
        try {
            const response = await fetch(`/api/sewing-tasks/${selectedTask.id}/complete`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    piecesCompleted: finalCompleted,
                    rejectPieces: finalReject,
                    notes
                })
            })

            if (response.ok) {
                toast({
                    title: "Berhasil",
                    description: `Task selesai. Total: ${finalCompleted} completed, ${finalReject} reject`
                })
                fetchTasks()
                // Reset form
                setPiecesCompleted("0")
                setRejectPieces("0")
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
                    <h2 className="text-3xl font-bold tracking-tight">Proses Penjahitan</h2>
                    <p className="text-muted-foreground">
                        Update progress pekerjaan penjahitan
                    </p>
                </div>
                <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                        Tidak ada task penjahitan yang ditugaskan saat ini.
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
        piecesReceived: selectedTask.piecesReceived,
        status: selectedTask.status
    } : null

    if (!currentBatch) {
        return (
            <div className="flex-1 space-y-4 p-8 pt-6">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Proses Penjahitan</h2>
                    <p className="text-muted-foreground">
                        Update progress pekerjaan penjahitan
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

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Proses Penjahitan</h2>
                    <p className="text-muted-foreground">
                        Update progress pekerjaan penjahitan
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
                                        setNotes(task.notes || "")
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
                            <span className="font-medium">{currentBatch.completed}/{currentBatch.piecesReceived} pcs ({Math.round((currentBatch.completed / currentBatch.piecesReceived) * 100)}%)</span>
                        </div>
                        <Progress value={(currentBatch.completed / currentBatch.piecesReceived) * 100} />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <p className="text-sm text-muted-foreground">Pieces Diterima</p>
                            <p className="text-2xl font-bold">{currentBatch.piecesReceived} pcs</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm text-muted-foreground">Target Asli</p>
                            <p className="text-2xl font-bold">{currentBatch.target} pcs</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                            <p className="text-sm text-muted-foreground">Completed</p>
                            <p className="text-xl font-bold text-green-600 dark:text-green-400">{currentBatch.completed}</p>
                        </div>
                        <div className="p-3 bg-red-50 dark:bg-red-950 rounded-lg">
                            <p className="text-sm text-muted-foreground">Reject</p>
                            <p className="text-xl font-bold text-red-600 dark:text-red-400">{currentBatch.reject}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Start Task (if PENDING) */}
            {currentBatch.status === 'PENDING' && (
                <Card>
                    <CardHeader>
                        <CardTitle>Mulai Penjahitan</CardTitle>
                        <CardDescription>Klik tombol di bawah untuk memulai proses penjahitan</CardDescription>
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
                                    Mulai Penjahitan
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
                        <CardDescription>Catat progress penjahitan yang telah diselesaikan</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="piecesCompleted">Tambah Selesai</Label>
                                <Input
                                    id="piecesCompleted"
                                    type="number"
                                    value={piecesCompleted}
                                    onChange={(e) => setPiecesCompleted(e.target.value)}
                                    placeholder="0"
                                />
                                <p className="text-xs text-muted-foreground">Total saat ini: {currentBatch.completed} pcs</p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="rejectPieces">Tambah Reject</Label>
                                <Input
                                    id="rejectPieces"
                                    type="number"
                                    value={rejectPieces}
                                    onChange={(e) => setRejectPieces(e.target.value)}
                                    placeholder="0"
                                />
                                <p className="text-xs text-muted-foreground">Total saat ini: {currentBatch.reject} pcs</p>
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
                                        {task.piecesCompleted}/{task.piecesReceived} pcs • Reject: {task.rejectPieces}
                                    </p>
                                </div>
                                {getStatusBadge(task.status)}
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
