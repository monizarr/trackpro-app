"use client"

import { useEffect, useState } from "react"
import { Plus, CheckCircle, Loader2, AlertCircle } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { Alert, AlertDescription } from "@/components/ui/alert"

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

export default function FinishingProcessPage() {
    const [tasks, setTasks] = useState<FinishingTask[]>([])
    const [selectedTask, setSelectedTask] = useState<FinishingTask | null>(null)
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [piecesCompleted, setPiecesCompleted] = useState("")
    const [rejectPieces, setRejectPieces] = useState("")
    const [notes, setNotes] = useState("")
    const [qualityChecks, setQualityChecks] = useState<Record<string, boolean>>({})
    const { toast } = useToast()

    const qualityCheckList = [
        { id: "qc1", label: "Cek jahitan rapi dan kuat" },
        { id: "qc2", label: "Cek ukuran sesuai spesifikasi" },
        { id: "qc3", label: "Cek warna tidak luntur" },
        { id: "qc4", label: "Setrika dengan rapi" },
        { id: "qc5", label: "Pasang label dan tag" },
        { id: "qc6", label: "Packaging dengan plastik" },
    ]

    const fetchTasks = async () => {
        try {
            const response = await fetch('/api/finishing-tasks/me')

            if (response.ok) {
                const data = await response.json()
                setTasks(data)

                // If we have a currently selected task, try to find it in the new data
                if (selectedTask) {
                    const updatedSelectedTask = data.find((t: FinishingTask) => t.id === selectedTask.id)
                    if (updatedSelectedTask) {
                        setSelectedTask(updatedSelectedTask)
                        // Only reset fields if status actually changed
                        if (updatedSelectedTask.status !== selectedTask.status) {
                            setPiecesCompleted("0")
                            setRejectPieces("0")
                            setNotes(updatedSelectedTask.notes || "")
                        }
                        return
                    }
                }

                // Auto-select first task in progress or pending
                const activeTask = data.find((t: FinishingTask) =>
                    t.status === 'IN_PROGRESS' || t.status === 'PENDING'
                ) || data[0]

                if (activeTask) {
                    setSelectedTask(activeTask)
                    setPiecesCompleted("0")
                    setRejectPieces("0")
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
            const response = await fetch(`/api/finishing-tasks/${selectedTask.id}/start`, {
                method: 'PATCH'
            })

            if (response.ok) {
                toast({
                    title: "Berhasil",
                    description: "Task finishing dimulai"
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
            const response = await fetch(`/api/finishing-tasks/${selectedTask.id}/progress`, {
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
            const response = await fetch(`/api/finishing-tasks/${selectedTask.id}/complete`, {
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
                setPiecesCompleted("0")
                setRejectPieces("0")
                setNotes("")
                setQualityChecks({})
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

    const getStatusBadge = (status: string) => {
        const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", label: string }> = {
            'PENDING': { variant: 'outline', label: 'Menunggu' },
            'IN_PROGRESS': { variant: 'default', label: 'Sedang Proses' },
            'COMPLETED': { variant: 'secondary', label: 'Selesai' },
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
            <div className="flex-1 space-y-4 p-8 pt-6">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Proses Finishing</h2>
                    <p className="text-muted-foreground">
                        Quality check dan finishing produk
                    </p>
                </div>
                <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                        Tidak ada task finishing yang ditugaskan saat ini.
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
        received: selectedTask.piecesReceived,
        status: selectedTask.status
    } : null

    if (!currentBatch) {
        return (
            <div className="flex-1 space-y-4 p-8 pt-6">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Proses Finishing</h2>
                    <p className="text-muted-foreground">
                        Quality check dan finishing produk
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

    return (
        <div className="flex-1 space-y-4 p-4 sm:p-6 md:p-8 pt-4 sm:pt-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Proses Finishing</h2>
                    <p className="text-sm sm:text-base text-muted-foreground">
                        Quality check dan finishing produk
                    </p>
                </div>
            </div>

            {/* Task Selection */}
            {tasks.length > 1 && (
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
                                        setPiecesCompleted("0")
                                        setRejectPieces("0")
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
                            <span className="font-medium">{currentBatch.completed}/{currentBatch.received} pcs ({Math.round((currentBatch.completed / currentBatch.received) * 100)}%)</span>
                        </div>
                        <Progress value={(currentBatch.completed / currentBatch.received) * 100} />
                    </div>

                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                        <div className="space-y-1">
                            <p className="text-xs sm:text-sm text-muted-foreground">Pieces Diterima</p>
                            <p className="text-xl sm:text-2xl font-bold">{currentBatch.received} pcs</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm text-muted-foreground">Target Asli</p>
                            <p className="text-2xl font-bold">{currentBatch.target} pcs</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                        <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                            <p className="text-xs sm:text-sm text-muted-foreground">Completed</p>
                            <p className="text-lg sm:text-xl font-bold text-green-600 dark:text-green-400">{currentBatch.completed}</p>
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
                        <CardTitle>Mulai Finishing</CardTitle>
                        <CardDescription>Klik tombol di bawah untuk memulai proses finishing</CardDescription>
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
                                    Mulai Finishing
                                </>
                            )}
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Quality Check & Update Progress (if IN_PROGRESS) */}
            {currentBatch.status === 'IN_PROGRESS' && (
                <>
                    {/* Quality Check */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Quality Check</CardTitle>
                            <CardDescription>Pastikan semua checklist terpenuhi sebelum finishing</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {qualityCheckList.map((check) => (
                                <div key={check.id} className="flex items-center space-x-2">
                                    <Checkbox
                                        id={check.id}
                                        checked={qualityChecks[check.id] || false}
                                        onCheckedChange={(checked) =>
                                            setQualityChecks(prev => ({ ...prev, [check.id]: checked as boolean }))
                                        }
                                    />
                                    <label
                                        htmlFor={check.id}
                                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                    >
                                        {check.label}
                                    </label>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    {/* Update Progress */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Update Progress</CardTitle>
                            <CardDescription>Catat progress finishing yang telah diselesaikan</CardDescription>
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
                                            Submit Selesai
                                        </>
                                    )}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </>
            )}

            {/* Task Completed */}
            {currentBatch.status === 'COMPLETED' && (
                <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                        Task ini sudah selesai.
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
