"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter, useParams } from "next/navigation"
import { CheckCircle, Loader2, AlertCircle, Plus, ArrowLeft, AlertTriangle, History, Send } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/lib/toast";
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { SpinnerCustom } from "@/components/ui/spinner"
import { formatDateTime } from "@/lib/utils"

interface SubBatchItemData {
    id: string
    productSize: string
    color: string
    goodQuantity: number
}

interface SewingSubBatch {
    id: string
    subBatchSku: string
    finishingGoodOutput: number
    status: string
    notes?: string | null
    createdAt: string
    items: SubBatchItemData[]
}

interface SewingTask {
    id: string
    batchId: string
    materialReceived: number
    piecesCompleted: number
    rejectPieces: number
    wasteQty: number | null
    status: string
    notes: string | null
    createdAt: Date
    startedAt: Date | null
    completedAt: Date | null
    batch: {
        id: string
        batchSku: string
        startDate: string
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
        subBatches?: SewingSubBatch[]
        materialColorAllocations: Array<{
            materialColorVariant: {
                unit: string
            }
        }>
    }
}

export default function SewingTaskDetailPage() {
    const router = useRouter()
    const params = useParams()
    const taskId = params.id as string

    const [task, setTask] = useState<SewingTask | null>(null)
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    // newSewingInputs: partial input for THIS session (only new quantities)
    const [newSewingInputs, setNewSewingInputs] = useState<Array<{
        productSize: string
        color: string
        actualPieces: number
        maxRemaining: number // how many left to sew
    }>>([])
    const [notes, setNotes] = useState("")
    const [showSubmitConfirm, setShowSubmitConfirm] = useState(false)
    const firstInputRef = useRef<HTMLInputElement>(null)

    // Calculate accumulated sewing per size/color from sub-batches
    const getAlreadySewnMap = () => {
        const map = new Map<string, number>()
        if (task?.batch.subBatches) {
            for (const sb of task.batch.subBatches) {
                for (const item of sb.items) {
                    const key = `${item.productSize}|${item.color}`
                    map.set(key, (map.get(key) || 0) + item.goodQuantity)
                }
            }
        }
        return map
    }

    const fetchTask = async () => {
        try {
            const response = await fetch(`/api/sewing-tasks/${taskId}`)
            if (response.ok) {
                const data = await response.json()
                setTask(data)

                // Build new input entries from cutting results with remaining quantities
                if (data.batch.cuttingResults) {
                    const alreadySewn = new Map<string, number>()
                    if (data.batch.subBatches) {
                        for (const sb of data.batch.subBatches) {
                            for (const item of sb.items) {
                                const key = `${item.productSize}|${item.color}`
                                alreadySewn.set(key, (alreadySewn.get(key) || 0) + item.goodQuantity)
                            }
                        }
                    }

                    setNewSewingInputs(
                        data.batch.cuttingResults.map((cr: {
                            productSize: string
                            color: string
                            actualPieces: number
                        }) => {
                            const key = `${cr.productSize}|${cr.color}`
                            const sewn = alreadySewn.get(key) || 0
                            const remaining = Math.max(0, cr.actualPieces - sewn)
                            return {
                                productSize: cr.productSize,
                                color: cr.color,
                                actualPieces: 0, // start at 0, user enters new amount
                                maxRemaining: remaining,
                            }
                        })
                    )
                }

                setNotes(data.notes || "")
            } else {
                toast.error("Gagal", "Task tidak ditemukan")
                router.push("/tailor/process")
            }
        } catch (err) {
            toast.error("Gagal", "Gagal memuat data task: " + err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchTask()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [taskId])

    useEffect(() => {
        if (task?.batch.status === 'IN_SEWING' && newSewingInputs.length > 0) {
            setTimeout(() => {
                firstInputRef.current?.focus()
            }, 100)
        }
    }, [task, newSewingInputs.length])

    const handleStart = async () => {
        if (!task || task.batch.status !== 'ASSIGNED_TO_SEWER') {
            toast.error("Gagal", "Task tidak dapat dimulai")
            return
        }

        setSubmitting(true)
        try {
            const response = await fetch(`/api/sewing-tasks/${task.id}/start`, {
                method: 'PATCH'
            })

            if (response.ok) {
                toast.success("Berhasil", "Task penjahitan dimulai")
                fetchTask()
            } else {
                throw new Error('Gagal memulai task')
            }
        } catch {
            toast.error("Gagal", "Gagal memulai task")
        } finally {
            setSubmitting(false)
        }
    }

    const handleSubmitSubBatch = async () => {
        if (!task || task.status !== 'IN_PROGRESS') return

        // Only send non-zero entries
        const nonZeroResults = newSewingInputs
            .filter(r => r.actualPieces > 0)
            .map(r => ({
                productSize: r.productSize,
                color: r.color,
                actualPieces: r.actualPieces,
            }))

        if (nonZeroResults.length === 0) {
            toast.error("Gagal", "Masukkan jumlah hasil jahitan minimal 1 item")
            return
        }

        setSubmitting(true)
        try {
            // Create sewing sub-batch via progress API
            const response = await fetch(`/api/sewing-tasks/${task.id}/progress`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sewingResults: nonZeroResults,
                    notes
                })
            })

            const data = await response.json()
            if (response.ok && data.success) {
                const totalInput = nonZeroResults.reduce((sum, r) => sum + r.actualPieces, 0)
                toast.success("Berhasil", `Sub-batch berhasil dibuat (${totalInput} pcs dikirim ke finishing)`)

                // Check if all pieces are sewn → auto-complete
                const newTotal = task.piecesCompleted + totalInput
                const totalCuttingOutput = task.batch.cuttingResults?.reduce((sum, r) => sum + r.actualPieces, 0) || 0

                if (newTotal >= totalCuttingOutput) {
                    // All pieces sewn, try to auto-complete
                    const completeRes = await fetch(`/api/sewing-tasks/${task.id}/complete`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ notes })
                    })
                    const completeData = await completeRes.json()
                    if (completeRes.ok && completeData.success && completeData.completed) {
                        toast.success("Selesai", "Semua potongan sudah dijahit! Task selesai dan menunggu verifikasi.")
                        router.push("/tailor/process")
                        return
                    }
                }

                fetchTask() // Refresh to show new sub-batch
            } else {
                throw new Error(data.error || 'Gagal membuat sub-batch')
            }
        } catch (error) {
            toast.error("Gagal", error instanceof Error ? error.message : "Gagal mengirim sub-batch")
        } finally {
            setSubmitting(false)
            setShowSubmitConfirm(false)
        }
    }

    const getStatusBadge = (status: string) => {
        const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", label: string }> = {
            'ASSIGNED_TO_SEWER': { variant: 'outline', label: 'Menunggu Dimulai' },
            'IN_SEWING': { variant: 'default', label: 'Sedang Proses' },
            'SEWING_COMPLETED': { variant: 'secondary', label: 'Selesai' },
            'SEWING_VERIFIED': { variant: 'secondary', label: 'Terverifikasi' }
        }
        const config = variants[status] || { variant: 'outline', label: status }
        return <Badge variant={config.variant}>{config.label}</Badge>
    }

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center min-h-screen">
                <SpinnerCustom />
            </div>
        )
    }

    if (!task) {
        return (
            <div className="flex-1 space-y-4 p-4 sm:p-6 md:p-8 pt-4 sm:pt-6">
                <Button variant="outline" onClick={() => router.push("/tailor/process")}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Kembali
                </Button>
                <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                        Task tidak ditemukan.
                    </AlertDescription>
                </Alert>
            </div>
        )
    }

    const alreadySewnMap = getAlreadySewnMap()
    const totalAlreadySewn = task.piecesCompleted
    const totalCuttingOutput = task.batch.cuttingResults?.reduce((sum, r) => sum + r.actualPieces, 0) || 0
    const totalRemaining = Math.max(0, totalCuttingOutput - totalAlreadySewn)
    const hasAnyRemaining = newSewingInputs.some(r => r.maxRemaining > 0)

    const currentBatch = {
        code: task.batch.batchSku,
        startDate: formatDateTime(task.createdAt.toString()),
        finishDate: task.completedAt ? formatDateTime(task.completedAt.toString()) : null,
        product: task.batch.product.name,
        target: task.batch.targetQuantity,
        completed: totalAlreadySewn,
        materialReceived: totalCuttingOutput,
        totalRoll: task.batch.totalRolls,
        status: task.batch.status
    }

    return (
        <div className="flex-1 space-y-4 p-4 sm:p-6 md:p-8 pt-4 sm:pt-6">
            {/* Header dengan tombol kembali */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push("/tailor/process")}
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Detail Task Penjahitan</h2>
                        <p className="text-sm sm:text-base text-muted-foreground">
                            {currentBatch.code}
                        </p>
                    </div>
                </div>
            </div>

            {/* Current Batch Info */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <CardTitle className="font-mono text-lg sm:text-xl">{currentBatch.code}</CardTitle>
                            <CardDescription>{currentBatch.product}</CardDescription>
                        </div>
                        {getStatusBadge(currentBatch.status)}
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-3 gap-3 sm:gap-4">
                        <div className="space-y-1">
                            <p className="text-xs sm:text-sm text-muted-foreground">Dari Potongan</p>
                            <p className="text-lg sm:text-2xl font-bold">{currentBatch.materialReceived} pcs</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-xs sm:text-sm text-muted-foreground">Sudah Dijahit</p>
                            <p className="text-lg sm:text-2xl font-bold text-green-600">{currentBatch.completed > 0 ? currentBatch.completed + " pcs" : 0}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-xs sm:text-sm text-muted-foreground">Sisa</p>
                            <p className="text-lg sm:text-2xl font-bold text-orange-600">{totalRemaining} pcs</p>
                        </div>
                    </div>
                    {/* Progress bar */}
                    {currentBatch.materialReceived > 0 && (
                        <div className="space-y-1">
                            <div className="flex justify-between text-xs text-muted-foreground">
                                <span>Progress Jahitan</span>
                                <span>{Math.round((currentBatch.completed / currentBatch.materialReceived) * 100)}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                    className="bg-green-600 h-2 rounded-full transition-all duration-300"
                                    style={{
                                        width: `${Math.min((currentBatch.completed / currentBatch.materialReceived) * 100, 100)}%`
                                    }}
                                />
                            </div>
                        </div>
                    )}
                    <div className="pt-2 border-t">
                        <div className="text-xs text-muted-foreground mt-2 flex justify-between">
                            Ditugaskan pada : <Badge variant="outline">{currentBatch.startDate}</Badge>
                        </div>
                        {currentBatch.finishDate && (
                            <div className="text-xs text-muted-foreground mt-2 flex justify-between">
                                Selesai pada : <Badge variant="outline">{currentBatch.finishDate}</Badge>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Riwayat Sub-Batch Jahitan */}
            {task.batch.subBatches && task.batch.subBatches.length > 0 && (
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <History className="h-5 w-5 text-muted-foreground" />
                            <div>
                                <CardTitle>Riwayat Sub-Batch Jahitan</CardTitle>
                                <CardDescription>
                                    Sub-batch yang sudah dikirim ke finishing ({task.batch.subBatches.length} sub-batch)
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {/* Per size/color summary */}
                        <div className="border rounded-lg overflow-x-auto mb-4">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/50">
                                        <TableHead className="font-semibold">Ukuran</TableHead>
                                        <TableHead className="font-semibold">Warna</TableHead>
                                        <TableHead className="font-semibold text-right">Dari Potong</TableHead>
                                        <TableHead className="font-semibold text-right">Dijahit</TableHead>
                                        <TableHead className="font-semibold text-right">Sisa</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {(task.batch.cuttingResults || []).map((cr, idx) => {
                                        const key = `${cr.productSize}|${cr.color}`
                                        const sewn = alreadySewnMap.get(key) || 0
                                        const remaining = Math.max(0, cr.actualPieces - sewn)
                                        return (
                                            <TableRow key={idx} className="hover:bg-muted/50">
                                                <TableCell className="font-medium">{cr.productSize}</TableCell>
                                                <TableCell><Badge variant="outline">{cr.color}</Badge></TableCell>
                                                <TableCell className="text-right">{cr.actualPieces}</TableCell>
                                                <TableCell className="text-right font-semibold text-green-600">{sewn}</TableCell>
                                                <TableCell className="text-right">
                                                    {remaining > 0 ? (
                                                        <span className="text-orange-600 font-medium">{remaining}</span>
                                                    ) : (
                                                        <Badge variant="secondary" className="text-xs">Selesai</Badge>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })}
                                    <TableRow className="font-bold bg-muted/50 border-t-2">
                                        <TableCell colSpan={2}>Total</TableCell>
                                        <TableCell className="text-right">{totalCuttingOutput}</TableCell>
                                        <TableCell className="text-right text-green-600">{totalAlreadySewn}</TableCell>
                                        <TableCell className="text-right text-orange-600">{totalRemaining}</TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </div>

                        {/* Detail sub-batches */}
                        <details className="group">
                            <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-2">
                                <Send className="h-3.5 w-3.5" />
                                Lihat detail per sub-batch ({task.batch.subBatches.length} pengiriman)
                            </summary>
                            <div className="space-y-3">
                                {task.batch.subBatches.map((sb) => (
                                    <div key={sb.id} className="border rounded-lg p-3">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="font-mono text-sm font-medium">{sb.subBatchSku}</span>
                                            <span className="text-xs text-muted-foreground">{formatDateTime(sb.createdAt)}</span>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {sb.items.map((item, i) => (
                                                <Badge key={i} variant="outline" className="text-xs">
                                                    {item.productSize} {item.color}: {item.goodQuantity} pcs
                                                </Badge>
                                            ))}
                                        </div>
                                        <div className="mt-1 text-xs text-muted-foreground">
                                            Total: <strong>{sb.finishingGoodOutput} pcs</strong>
                                            {sb.notes && <span className="ml-2">• {sb.notes}</span>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </details>
                    </CardContent>
                </Card>
            )}

            {/* Start Task (if ASSIGNED_TO_SEWER) */}
            {currentBatch.status === 'ASSIGNED_TO_SEWER' && (
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
                            size="lg"
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

            {/* Input & Submit Sub-Batch (if sewing task is still IN_PROGRESS) */}
            {task.status === 'IN_PROGRESS' && (
                <Card>
                    <CardHeader>
                        <CardTitle>Kirim Hasil Jahitan ke Finishing</CardTitle>
                        <CardDescription>
                            Masukkan jumlah jahitan yang siap dikirim ke finishing. Setiap pengiriman akan dibuat sebagai sub-batch.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Info Message */}
                        {totalAlreadySewn > 0 && (
                            <Alert>
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>
                                    Sudah dikirim <strong>{totalAlreadySewn} pcs</strong> ke finishing via {task.batch.subBatches?.length || 0} sub-batch.
                                    Masukkan hanya jumlah BARU yang siap dikirim.
                                </AlertDescription>
                            </Alert>
                        )}

                        {!hasAnyRemaining ? (
                            <Alert>
                                <CheckCircle className="h-4 w-4" />
                                <AlertDescription>
                                    Semua potongan sudah dijahit dan dikirim ke finishing! Task telah selesai.
                                </AlertDescription>
                            </Alert>
                        ) : (
                            <>
                                {/* Input Table */}
                                <div className="border rounded-lg overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-muted/50">
                                                <TableHead className="font-semibold">Ukuran</TableHead>
                                                <TableHead className="font-semibold">Warna</TableHead>
                                                <TableHead className="font-semibold text-right">Sisa Potong</TableHead>
                                                <TableHead className="font-semibold">Jumlah Kirim</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {newSewingInputs.map((item, idx) => (
                                                <TableRow key={idx} className={`hover:bg-muted/50 ${item.maxRemaining === 0 ? 'opacity-50' : ''}`}>
                                                    <TableCell className="font-medium">{item.productSize}</TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline">{item.color}</Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        {item.maxRemaining > 0 ? (
                                                            <span className="text-orange-600 font-medium">{item.maxRemaining} pcs</span>
                                                        ) : (
                                                            <Badge variant="secondary" className="text-xs">Selesai</Badge>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        {item.maxRemaining > 0 ? (
                                                            <Input
                                                                ref={idx === newSewingInputs.findIndex(r => r.maxRemaining > 0) ? firstInputRef : null}
                                                                type="number"
                                                                value={item.actualPieces || ''}
                                                                onChange={(e) => {
                                                                    const updated = [...newSewingInputs]
                                                                    const val = Math.max(0, Math.min(parseInt(e.target.value) || 0, item.maxRemaining))
                                                                    updated[idx] = { ...updated[idx], actualPieces: val }
                                                                    setNewSewingInputs(updated)
                                                                }}
                                                                className="w-24 text-right"
                                                                min="0"
                                                                max={item.maxRemaining}
                                                                placeholder="0"
                                                            />
                                                        ) : (
                                                            <span className="text-muted-foreground text-sm">-</span>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                            <TableRow className="font-bold bg-muted/50 border-t-2">
                                                <TableCell colSpan={2}>Total Kirim Sesi Ini</TableCell>
                                                <TableCell />
                                                <TableCell className="text-lg">
                                                    <span className="text-green-600">
                                                        {newSewingInputs.reduce((sum, r) => sum + r.actualPieces, 0)} pcs
                                                    </span>
                                                </TableCell>
                                            </TableRow>
                                        </TableBody>
                                    </Table>
                                </div>
                            </>
                        )}

                        {/* Notes Section */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="notes" className="font-semibold">Catatan (Opsional)</Label>
                                <span className="text-xs text-muted-foreground">{notes.length}/200</span>
                            </div>
                            <Input
                                id="notes"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value.slice(0, 200))}
                                placeholder="Contoh: 'Pengiriman batch pertama ke finishing'"
                                className="text-sm"
                            />
                        </div>

                        {/* Action Button - Single submit */}
                        {hasAnyRemaining && (
                            <div className="border-t pt-4">
                                <Button
                                    onClick={() => setShowSubmitConfirm(true)}
                                    disabled={submitting || newSewingInputs.reduce((sum, r) => sum + r.actualPieces, 0) === 0}
                                    className="w-full bg-green-600 hover:bg-green-700"
                                    size="lg"
                                >
                                    {submitting ? (
                                        <>
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            Mengirim...
                                        </>
                                    ) : (
                                        <>
                                            <Send className="h-4 w-4 mr-2" />
                                            Kirim Sub-Batch ke Finishing
                                        </>
                                    )}
                                </Button>
                                <p className="text-xs text-muted-foreground mt-2 text-center">
                                    Setiap pengiriman akan dibuat sebagai sub-batch baru. Jika semua potongan sudah dikirim, task otomatis selesai.
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Submit Confirmation Dialog */}
            <AlertDialog open={showSubmitConfirm} onOpenChange={setShowSubmitConfirm}>
                <AlertDialogContent className="max-w-sm">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Konfirmasi Kirim Sub-Batch</AlertDialogTitle>
                        <AlertDialogDescription>
                            Anda yakin ingin mengirim hasil jahitan ke finishing sebagai sub-batch baru?
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    <div className="bg-muted rounded-lg p-3 space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Sudah dikirim sebelumnya:</span>
                            <span className="font-semibold">{totalAlreadySewn} pcs</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Kirim sesi ini:</span>
                            <span className="font-semibold text-green-600">
                                +{newSewingInputs.reduce((sum, r) => sum + r.actualPieces, 0)} pcs
                            </span>
                        </div>
                        <div className="flex justify-between pt-2 border-t font-bold">
                            <span>Total setelah kirim:</span>
                            <span>
                                {totalAlreadySewn + newSewingInputs.reduce((sum, r) => sum + r.actualPieces, 0)} pcs
                            </span>
                        </div>
                        {(() => {
                            const thisTotal = newSewingInputs.reduce((sum, r) => sum + r.actualPieces, 0)
                            const afterTotal = totalAlreadySewn + thisTotal
                            if (afterTotal >= totalCuttingOutput) {
                                return (
                                    <div className="pt-2 border-t">
                                        <p className="text-green-600 text-xs flex items-center gap-1">
                                            <CheckCircle className="h-3.5 w-3.5" />
                                            Semua potongan akan terjahit. Task otomatis selesai.
                                        </p>
                                    </div>
                                )
                            }
                            const remaining = totalCuttingOutput - afterTotal
                            return (
                                <div className="pt-2 border-t">
                                    <p className="text-amber-600 text-xs flex items-center gap-1">
                                        <AlertTriangle className="h-3.5 w-3.5" />
                                        Masih ada {remaining} pcs yang belum dijahit
                                    </p>
                                </div>
                            )
                        })()}
                        {notes && (
                            <div className="pt-2 border-t">
                                <span className="text-muted-foreground text-xs">Catatan: {notes}</span>
                            </div>
                        )}
                    </div>

                    <AlertDialogCancel disabled={submitting}>Batal</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleSubmitSubBatch}
                        disabled={submitting}
                        className="bg-green-600 hover:bg-green-700"
                    >
                        {submitting ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Mengirim...
                            </>
                        ) : (
                            <>Ya, Kirim Sub-Batch</>
                        )}
                    </AlertDialogAction>
                </AlertDialogContent>
            </AlertDialog>

            {/* Task Completed */}
            {(task.status === 'COMPLETED' || task.status === 'VERIFIED') && (
                <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                        Task ini sudah {task.status === 'VERIFIED' ? 'terverifikasi' : 'selesai dan menunggu verifikasi'}.
                    </AlertDescription>
                </Alert>
            )}
        </div>
    )
}
