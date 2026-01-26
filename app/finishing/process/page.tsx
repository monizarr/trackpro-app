"use client"

import { useEffect, useState } from "react"
import { Plus, CheckCircle, Loader2, AlertCircle, Clock } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
    createdAt?: string
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
    const [activeTab, setActiveTab] = useState("PENDING")
    const [selectedMonth, setSelectedMonth] = useState(() => {
        const now = new Date()
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    })
    const { toast } = useToast()

    const STATUS_GROUPS = {
        PENDING: {
            label: "Menunggu",
            statuses: ["PENDING"],
        },
        IN_PROGRESS: {
            label: "Sedang Proses",
            statuses: ["IN_PROGRESS"],
        },
        COMPLETED: {
            label: "Selesai",
            statuses: ["COMPLETED"],
        }
    }

    const qualityCheckList = [
        { id: "qc1", label: "Cek jahitan rapi dan kuat" },
        { id: "qc2", label: "Cek ukuran sesuai spesifikasi" },
        { id: "qc3", label: "Cek warna tidak luntur" },
        { id: "qc4", label: "Setrika dengan rapi" },
        { id: "qc5", label: "Pasang label dan tag" },
        { id: "qc6", label: "Packaging dengan plastik" },
    ]

    const filterTasks = (groupStatuses: string[]) => {
        return tasks.filter(task => {
            const matchesStatus = groupStatuses.includes(task.status)

            // Filter by month
            const taskDate = new Date(task.startedAt || task.createdAt || new Date())
            const taskMonth = `${taskDate.getFullYear()}-${String(taskDate.getMonth() + 1).padStart(2, '0')}`
            const matchesMonth = taskMonth === selectedMonth

            return matchesStatus && matchesMonth
        })
    }

    const getGroupStats = (groupStatuses: string[]) => {
        const groupTasks = filterTasks(groupStatuses)
        return {
            total: groupTasks.length,
            completed: groupTasks.reduce((sum, t) => sum + t.piecesCompleted, 0),
            reject: groupTasks.reduce((sum, t) => sum + t.rejectPieces, 0),
        }
    }

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
                title: "Gagal",
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

    // Handle tab and month change - auto-select appropriate task
    useEffect(() => {
        const currentGroupStatuses = STATUS_GROUPS[activeTab as keyof typeof STATUS_GROUPS]?.statuses || []
        const filteredTabTasks = filterTasks(currentGroupStatuses)

        // Check if current selectedTask is still in filtered tasks
        if (selectedTask) {
            const taskStillExists = filteredTabTasks.some(t => t.id === selectedTask.id)
            if (taskStillExists) {
                // Keep current selection if it's in the new filtered list
                return
            }
        }

        // Auto-select first task from new filtered list
        if (filteredTabTasks.length > 0) {
            const autoSelectTask = filteredTabTasks[0]
            setSelectedTask(autoSelectTask)
            setPiecesCompleted("0")
            setRejectPieces("0")
            setNotes(autoSelectTask.notes || "")
        } else {
            // No tasks in this filter - clear selection
            setSelectedTask(null)
            setPiecesCompleted("0")
            setRejectPieces("0")
            setNotes("")
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab, selectedMonth])

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
                throw new Error('Gagal memulai task')
            }
        } catch {
            toast({
                variant: "destructive",
                title: "Gagal",
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
                title: "Gagal",
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
                throw new Error('Gagal update progress')
            }
        } catch {
            toast({
                variant: "destructive",
                title: "Gagal",
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
                title: "Gagal",
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
                throw new Error(error.error || 'Gagal menyelesaikan task')
            }
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Gagal",
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

    const filteredTasks = filterTasks(STATUS_GROUPS[activeTab as keyof typeof STATUS_GROUPS]?.statuses || [])
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _ = filteredTasks // filteredTasks adalah variable lokal untuk setiap tab rendering

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

            {/* Filter Section - Month */}
            <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
                <div className="w-full sm:w-auto">
                    <Label className="text-sm text-muted-foreground mb-2 block">Filter Bulan</Label>
                    <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                        {Array.from({ length: 12 }, (_, i) => {
                            const date = new Date()
                            date.setMonth(date.getMonth() - i)
                            const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
                            const label = date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
                            return (
                                <option key={month} value={month}>
                                    {label}
                                </option>
                            )
                        })}
                    </select>
                </div>
            </div>

            {/* Tabs by Status */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <TabsList className="grid w-full grid-cols-3">
                    {Object.entries(STATUS_GROUPS).map(([key, group]) => {
                        const stats = getGroupStats(group.statuses)
                        return (
                            <TabsTrigger key={key} value={key} className="relative">
                                <span>{group.label}</span>
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
                    const tabFilteredTasks = filterTasks(group.statuses)
                    const stats = getGroupStats(group.statuses)

                    return (
                        <TabsContent key={key} value={key} className="space-y-4">
                            {/* Stats Cards */}
                            <div className="grid gap-4 md:grid-cols-3">
                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">Total Task</CardTitle>
                                        <Clock className="h-4 w-4 text-muted-foreground" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">{stats.total}</div>
                                        <p className="text-xs text-muted-foreground">
                                            task bulan {selectedMonth}
                                        </p>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">Total Selesai</CardTitle>
                                        <CheckCircle className="h-4 w-4 text-green-600" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">{stats.completed}</div>
                                        <p className="text-xs text-muted-foreground">
                                            pieces
                                        </p>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">Total Reject</CardTitle>
                                        <AlertCircle className="h-4 w-4 text-red-600" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">{stats.reject}</div>
                                        <p className="text-xs text-muted-foreground">
                                            pieces
                                        </p>
                                    </CardContent>
                                </Card>
                            </div>

                            {tabFilteredTasks.length === 0 ? (
                                <Alert>
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertDescription>
                                        Tidak ada task dengan status ini untuk bulan {selectedMonth}.
                                    </AlertDescription>
                                </Alert>
                            ) : (
                                <>
                                    {/* Task Selection */}
                                    {tabFilteredTasks.length > 1 && (
                                        <Card>
                                            <CardHeader>
                                                <CardTitle>Pilih Task</CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="grid gap-2">
                                                    {tabFilteredTasks.map((task) => (
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
                                                                <Badge variant={task.status === 'PENDING' ? 'outline' : task.status === 'IN_PROGRESS' ? 'default' : 'secondary'}>
                                                                    {task.status === 'PENDING' ? 'Menunggu' : task.status === 'IN_PROGRESS' ? 'Sedang Proses' : 'Selesai'}
                                                                </Badge>
                                                            </div>
                                                        </Button>
                                                    ))}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    )}

                                    {/* Single task - auto-select */}
                                    {tabFilteredTasks.length === 1 && (
                                        <>
                                            {(() => {
                                                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                                                const _ = tabFilteredTasks[0]
                                                return null
                                            })()}
                                        </>
                                    )}
                                </>
                            )}
                        </TabsContent>
                    )
                })}
            </Tabs>

            {/* Current Batch Info and Actions - shown outside tabs */}
            {currentBatch && (
                <>
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
                </>
            )}
        </div>
    )
}
