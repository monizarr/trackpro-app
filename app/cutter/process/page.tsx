"use client"

import { useEffect, useState } from "react"
import { Plus, CheckCircle, Loader2, AlertCircle, Clock, Play, Zap } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

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
    const [activeTab, setActiveTab] = useState("MENUNGGU")
    const [selectedMonth, setSelectedMonth] = useState(() => {
        const now = new Date()
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    })
    const [cuttingResults, setCuttingResults] = useState<Array<{
        productSize: string
        color: string
        actualPieces: number
    }>>([])
    const [notes, setNotes] = useState("")
    const { toast } = useToast()
    // Status groups untuk tabs
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
                console.log("Fetching cutting tasks, response:", data)
                setTasks(data)

                // If we have a currently selected task, try to find it in the new data
                if (selectedTask) {
                    const updatedSelectedTask = data.find((t: CuttingTask) => t.id === selectedTask.id)
                    if (updatedSelectedTask) {
                        setSelectedTask(updatedSelectedTask)

                        // Initialize cutting results from batch data
                        if (updatedSelectedTask.batch.cuttingResults && updatedSelectedTask.batch.cuttingResults.length > 0) {
                            setCuttingResults(updatedSelectedTask.batch.cuttingResults.map((r: {
                                id: string
                                productSize: string
                                color: string
                                actualPieces: number
                            }) => ({
                                productSize: r.productSize,
                                color: r.color,
                                actualPieces: r.actualPieces
                            })))
                        } else if (updatedSelectedTask.batch.sizeColorRequests) {
                            setCuttingResults(updatedSelectedTask.batch.sizeColorRequests.map((r: {
                                id: string
                                productSize: string
                                color: string
                                requestedPieces: number
                            }) => ({
                                productSize: r.productSize,
                                color: r.color,
                                actualPieces: r.requestedPieces
                            })))
                        }

                        setNotes(updatedSelectedTask.notes || "")
                        // Fetch timeline for the selected task
                        fetchTimeline(updatedSelectedTask.batchId)
                        return
                    }
                }

                // Auto-select first task based on cutting status priority
                const activeTask = data.find((t: CuttingTask) =>
                    t.batch.status === 'IN_CUTTING' || t.batch.status === 'ASSIGNED_TO_CUTTER'
                ) || data[0]

                if (activeTask) {
                    setSelectedTask(activeTask)

                    // Initialize cutting results from batch data
                    if (activeTask.batch.cuttingResults && activeTask.batch.cuttingResults.length > 0) {
                        setCuttingResults(activeTask.batch.cuttingResults.map((r: {
                            id: string
                            productSize: string
                            color: string
                            actualPieces: number
                        }) => ({
                            productSize: r.productSize,
                            color: r.color,
                            actualPieces: r.actualPieces
                        })))
                    } else if (activeTask.batch.sizeColorRequests) {
                        setCuttingResults(activeTask.batch.sizeColorRequests.map((r: {
                            id: string
                            productSize: string
                            color: string
                            requestedPieces: number
                        }) => ({
                            productSize: r.productSize,
                            color: r.color,
                            actualPieces: r.requestedPieces
                        })))
                    }

                    setNotes(activeTask.notes || "")
                    // Fetch timeline for the active task
                    fetchTimeline(activeTask.batchId)
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
        if (!selectedTask || selectedTask.batch.status !== 'ASSIGNED_TO_CUTTER') {
            toast({
                variant: "destructive",
                title: "Gagal",
                description: "Task tidak dapat dimulai"
            })
        }

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

        // Validation
        const totalActual = cuttingResults.reduce((sum, r) => sum + r.actualPieces, 0)
        if (totalActual === 0) {
            toast({
                variant: "destructive",
                title: "Gagal",
                description: "Total actual pieces harus lebih dari 0"
            })
            return
        }

        setSubmitting(true)
        try {
            const response = await fetch(`/api/cutting-tasks/${selectedTask.id}/progress`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    cuttingResults,
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

        // Validation
        const totalActual = cuttingResults.reduce((sum, r) => sum + r.actualPieces, 0)
        if (totalActual === 0) {
            toast({
                variant: "destructive",
                title: "Gagal",
                description: "Total actual pieces harus lebih dari 0"
            })
            return
        }

        setSubmitting(true)
        try {
            const response = await fetch(`/api/cutting-tasks/${selectedTask.id}/complete`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    cuttingResults,
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
                setCuttingResults([])
                setNotes("")
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

    const filterTasks = (groupStatuses: string[]) => {
        return tasks.filter(task => {
            const matchesStatus = groupStatuses.includes(task.batch.status)

            // Filter by month - if no date, include in current month
            let taskDate: Date
            if (task.startedAt) {
                taskDate = new Date(task.startedAt)
            } else if (task.completedAt) {
                taskDate = new Date(task.completedAt)
            } else {
                // If no date available, always include (don't filter by month)
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

            // Filter by month - if no date, include in current month
            let taskDate: Date
            if (task.startedAt) {
                taskDate = new Date(task.startedAt)
            } else if (task.completedAt) {
                taskDate = new Date(task.completedAt)
            } else {
                // If no date available, always include (don't filter by month)
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
        completed: cuttingResults.reduce((sum, r) => sum + r.actualPieces, 0),
        materialReceived: selectedTask.materialReceived,
        totalRoll: selectedTask.batch.totalRolls,
        status: selectedTask.batch.status
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

    console.log("Cutting Tasks:", tasks)
    console.log("Selected Task:", selectedTask)
    return (
        <div className="flex-1 space-y-4 p-4 sm:p-6 md:p-8 pt-4 sm:pt-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Proses Pemotongan</h2>
                    <p className="text-sm sm:text-base text-muted-foreground">
                        Update progress pekerjaan pemotongan
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
                                <>
                                    {/* Task Selection for this tab */}
                                    <Card>
                                        <CardHeader>
                                            <CardTitle>Pilih Task</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="grid gap-2">
                                                {filteredTasks.map((task) => (
                                                    <Button
                                                        key={task.id}
                                                        variant={selectedTask?.id === task.id ? "default" : "outline"}
                                                        className="justify-start h-auto py-3"
                                                        onClick={() => {
                                                            setSelectedTask(task)

                                                            // Initialize cutting results
                                                            if (task.batch.cuttingResults && task.batch.cuttingResults.length > 0) {
                                                                setCuttingResults(task.batch.cuttingResults.map(r => ({
                                                                    productSize: r.productSize,
                                                                    color: r.color,
                                                                    actualPieces: r.actualPieces
                                                                })))
                                                            } else if (task.batch.sizeColorRequests) {
                                                                setCuttingResults(task.batch.sizeColorRequests.map(r => ({
                                                                    productSize: r.productSize,
                                                                    color: r.color,
                                                                    actualPieces: r.requestedPieces
                                                                })))
                                                            }

                                                            setNotes(task.notes || "")
                                                            fetchTimeline(task.batchId)
                                                        }}
                                                    >
                                                        <div className="flex items-center justify-between w-full flex-col sm:flex-row gap-2">
                                                            <div className="text-left">
                                                                <p className="font-mono font-medium">{task.batch.batchSku}</p>
                                                                <p className="text-sm text-muted-foreground">{task.batch.product.name}</p>
                                                            </div>
                                                            {getStatusBadge(task.status)}
                                                        </div>
                                                    </Button>
                                                ))}
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* Show current batch info only if a task from this tab is selected */}
                                    {selectedTask && group.statuses.includes(selectedTask.batch.status) && currentBatch && (
                                        <>
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
                                                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                                                        <div className="space-y-1">
                                                            <p className="text-xs sm:text-sm text-muted-foreground">Material Diterima</p>
                                                            <p className="text-xl sm:text-2xl font-bold">{currentBatch.totalRoll || 0} ROLL</p>
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>

                                            {/* Start Task (if ASSIGNED_TO_CUTTER) */}
                                            {currentBatch.status === 'ASSIGNED_TO_CUTTER' && (
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

                                            {/* Update Progress (if IN_CUTTING) */}
                                            {(currentBatch.status === 'IN_CUTTING') && (
                                                <Card>
                                                    <CardHeader>
                                                        <CardTitle>Update Progress</CardTitle>
                                                        <CardDescription>Input hasil potongan per ukuran dan warna</CardDescription>
                                                    </CardHeader>
                                                    <CardContent className="space-y-4">
                                                        {/* Cutting Results Table */}
                                                        <div className="border rounded-lg overflow-hidden">
                                                            <Table>
                                                                <TableHeader>
                                                                    <TableRow>
                                                                        <TableHead>Ukuran</TableHead>
                                                                        <TableHead>Warna</TableHead>
                                                                        <TableHead className="text-right">Qty</TableHead>
                                                                    </TableRow>
                                                                </TableHeader>
                                                                <TableBody>
                                                                    {cuttingResults.map((result, idx) => (
                                                                        <TableRow key={idx}>
                                                                            <TableCell className="font-medium">{result.productSize}</TableCell>
                                                                            <TableCell>
                                                                                <Badge variant="outline">{result.color}</Badge>
                                                                            </TableCell>
                                                                            <TableCell className="text-right">
                                                                                <Input
                                                                                    type="number"
                                                                                    value={result.actualPieces}
                                                                                    onChange={(e) => {
                                                                                        const updated = [...cuttingResults]
                                                                                        updated[idx].actualPieces = parseInt(e.target.value) || 0
                                                                                        setCuttingResults(updated)
                                                                                    }}
                                                                                    className="w-20 text-right"
                                                                                    min="0"
                                                                                />
                                                                            </TableCell>
                                                                        </TableRow>
                                                                    ))}
                                                                    <TableRow className="font-bold bg-muted/50">
                                                                        <TableCell colSpan={2}>Total</TableCell>
                                                                        <TableCell className="text-right">
                                                                            {cuttingResults.reduce((sum, r) => sum + r.actualPieces, 0)}
                                                                        </TableCell>
                                                                    </TableRow>
                                                                </TableBody>
                                                            </Table>
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
                                            {(currentBatch.status === 'CUTTING_COMPLETED' || currentBatch.status === 'CUTTING_VERIFIED') && (
                                                <Alert>
                                                    <CheckCircle className="h-4 w-4" />
                                                    <AlertDescription>
                                                        Task ini sudah {currentBatch.status === 'CUTTING_VERIFIED' ? 'terverifikasi' : 'selesai dan menunggu verifikasi'}.
                                                    </AlertDescription>
                                                </Alert>
                                            )}

                                            {/* Timeline History */}
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
                                                                        <span className="text-2xl">{getEventIcon(event.event)}</span>
                                                                        {index < timeline.length - 1 && (
                                                                            <div className="h-12 w-0.5 bg-border my-2"></div>
                                                                        )}
                                                                    </div>
                                                                    <div className="flex-1 pb-6">
                                                                        <p className="font-medium">{getEventLabel(event.event)}</p>
                                                                        {event.details && (
                                                                            <p className="text-sm text-muted-foreground">{event.details}</p>
                                                                        )}
                                                                        <p className="text-xs text-muted-foreground mt-1">{formatDateTime(event.createdAt)}</p>
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
                                        </>
                                    )}
                                </>
                            )}
                        </TabsContent>
                    )
                })}
            </Tabs>
        </div>
    )
}
