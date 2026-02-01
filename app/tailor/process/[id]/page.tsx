"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter, useParams } from "next/navigation"
import { CheckCircle, Loader2, AlertCircle, Plus, ArrowLeft, AlertTriangle } from "lucide-react"
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
    const [sewingResults, setSewingResults] = useState<Array<{
        productSize: string
        color: string
        actualPieces: number
    }>>([])
    const [notes, setNotes] = useState("")
    const [showSubmitConfirm, setShowSubmitConfirm] = useState(false)
    const firstInputRef = useRef<HTMLInputElement>(null)

    const fetchTask = async () => {
        try {
            const response = await fetch(`/api/sewing-tasks/${taskId}`)
            if (response.ok) {
                const data = await response.json()
                setTask(data)

                // Initialize sewing results from batch data
                if (data.batch.sewingResults && data.batch.sewingResults.length > 0) {
                    setSewingResults(
                        data.batch.sewingResults.map((r: {
                            id: string
                            productSize: string
                            color: string
                            actualPieces: number
                        }) => ({
                            productSize: r.productSize,
                            color: r.color,
                            actualPieces: r.actualPieces
                        }))
                    )
                } else if (data.batch.sizeColorRequests) {
                    setSewingResults(
                        data.batch.sizeColorRequests.map((r: {
                            id: string
                            productSize: string
                            color: string
                            requestedPieces: number
                        }) => ({
                            productSize: r.productSize,
                            color: r.color,
                            actualPieces: r.requestedPieces
                        }))
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
        // Auto-focus pada input pertama saat user membuka form input
        if (task?.batch.status === 'IN_SEWING' && sewingResults.length > 0) {
            setTimeout(() => {
                firstInputRef.current?.focus()
            }, 100)
        }
    }, [task, sewingResults.length])

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

    const handleUpdateProgress = async () => {
        if (!task || task.batch.status !== 'IN_SEWING') return

        // Validation
        const totalActual = sewingResults.reduce((sum, r) => sum + r.actualPieces, 0)
        if (totalActual === 0) {
            toast.error("Gagal", "Total hasil penjahitan harus lebih dari 0")
            return
        }

        setSubmitting(true)
        try {
            const response = await fetch(`/api/sewing-tasks/${task.id}/progress`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sewingResults,
                    notes
                })
            })

            if (response.ok) {
                toast.success("Berhasil", "Progress tersimpan. Anda bisa melanjutkan nanti.")
                fetchTask()
            } else {
                throw new Error('Gagal update progress')
            }
        } catch (error) {
            toast.error("Gagal", "Gagal menyimpan progress" + (error instanceof Error ? `: ${error.message}` : ''))
        } finally {
            setSubmitting(false)
        }
    }

    const handleComplete = async () => {
        if (!task || task.batch.status !== 'IN_SEWING') return

        // Validation
        const totalActual = sewingResults.reduce((sum, r) => sum + r.actualPieces, 0)
        if (totalActual === 0) {
            toast.error("Gagal", "Total hasil penjahitan harus lebih dari 0")
            return
        }

        setSubmitting(true)
        try {
            const response = await fetch(`/api/sewing-tasks/${task.id}/complete`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sewingResults,
                    notes
                })
            })

            if (response.ok) {
                toast.success("Berhasil", "Task selesai dan menunggu verifikasi dari Ka. Produksi")
                router.push("/tailor/process")
            } else {
                const error = await response.json()
                throw new Error(error.error || 'Gagal menyelesaikan task')
            }
        } catch (error) {
            toast.error("Gagal", error instanceof Error ? error.message : "Gagal menyelesaikan task")
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

    const currentBatch = {
        code: task.batch.batchSku,
        startDate: formatDateTime(task.createdAt.toString()),
        finishDate: task.completedAt ? formatDateTime(task.completedAt.toString()) : null,
        product: task.batch.product.name,
        target: task.batch.targetQuantity,
        completed: sewingResults.reduce((sum, r) => sum + r.actualPieces, 0),
        materialReceived: task.batch.cuttingResults?.reduce((sum, r) => sum + r.actualPieces, 0),
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
                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                        <div className="space-y-1">
                            <p className="text-xs sm:text-sm text-muted-foreground">Selesai</p>
                            <p className="text-lg sm:text-2xl font-bold text-green-600">{currentBatch.completed > 0 ? currentBatch.completed + " pcs" : 0}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-xs sm:text-sm text-muted-foreground">Pcs Diterima</p> {/* dari penjahit */}
                            <p className="text-lg sm:text-2xl font-bold">{Number(currentBatch.materialReceived) || 0} Pcs </p>
                        </div>
                    </div>
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

            {/* Hasil jahitan yang sudah diinput */}
            {currentBatch.status !== 'IN_SEWING' && (
                <Card>
                    <CardHeader>
                        <CardTitle>Hasil Jahitan Terakhir</CardTitle>
                        <CardDescription>
                            Data hasil jahitan yang sudah tersimpan
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="border rounded-lg overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/50">
                                        <TableHead className="font-semibold">Ukuran</TableHead>
                                        <TableHead className="font-semibold">Warna</TableHead>
                                        <TableHead className="font-semibold text-right">Qty Jahit</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {sewingResults.map((result: {
                                        productSize: string
                                        color: string
                                        actualPieces: number
                                    }, idx: number) => (
                                        <TableRow key={idx} className="hover:bg-muted/50">
                                            <TableCell className="font-medium">{result.productSize}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline">{result.color}</Badge>
                                            </TableCell>
                                            <TableCell className="text-right font-semibold">
                                                {result.actualPieces} pcs
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    <TableRow className="font-bold bg-muted/50 border-t-2">
                                        <TableCell colSpan={2}>Total Hasil Jahit</TableCell>
                                        <TableCell className="text-right text-lg">
                                            <span className="text-green-600">
                                                {sewingResults.reduce((sum: number, r: { actualPieces: number }) => sum + r.actualPieces, 0)} pcs
                                            </span>
                                        </TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </div>
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
                                    Mulai Pemotongan
                                </>
                            )}
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Update Progress (if IN_SEWING) */}
            {currentBatch.status === 'IN_SEWING' && (
                <Card>
                    <CardHeader>
                        <CardTitle>Input Hasil Penjahitan</CardTitle>
                        <CardDescription>
                            Masukkan jumlah jahitan yang berhasil untuk setiap ukuran dan warna
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Info Message */}
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <div className="flex gap-2">
                                <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                                <div className="text-sm text-blue-800">
                                    <p className="font-medium">Cara input:</p>
                                    <p className="text-xs mt-1">Isi kolom Qty untuk setiap kombinasi ukuran dan warna. Total akan dihitung otomatis.</p>
                                </div>
                            </div>
                        </div>

                        {/* Cutting Results Table */}
                        <div className="border rounded-lg overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/50">
                                        <TableHead className="font-semibold">Ukuran</TableHead>
                                        <TableHead className="font-semibold">Warna</TableHead>
                                        <TableHead className="font-semibold">Qty Jahit</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {sewingResults.map((result, idx) => (
                                        <TableRow key={idx} className="hover:bg-muted/50">
                                            <TableCell className="font-medium">{result.productSize}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline">{result.color}</Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Input
                                                    ref={idx === 0 ? firstInputRef : null}
                                                    type="number"
                                                    value={result.actualPieces}
                                                    onChange={(e) => {
                                                        const updated = [...sewingResults]
                                                        updated[idx].actualPieces = Math.max(0, parseInt(e.target.value) || 0)
                                                        setSewingResults(updated)
                                                    }}
                                                    className="w-24 text-right"
                                                    min="0"
                                                    placeholder="0"
                                                />
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    <TableRow className="font-bold bg-muted/50 border-t-2">
                                        <TableCell colSpan={2}>Total Hasil Jahit</TableCell>
                                        <TableCell className="text-lg">
                                            <span className="text-green-600">
                                                {sewingResults.reduce((sum, r) => sum + r.actualPieces, 0)} Pcs
                                            </span>
                                        </TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </div>

                        {/* Progress Info */}
                        {/* <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Progress:</span>
                                <span className="font-semibold">
                                    {Math.round((cuttingResults.reduce((sum, r) => sum + r.actualPieces, 0) / currentBatch.target) * 100)}%
                                </span>
                            </div>
                            <div className="w-full bg-gray-300 rounded-full h-2">
                                <div
                                    className="bg-green-600 h-2 rounded-full transition-all duration-300"
                                    style={{
                                        width: `${Math.min(
                                            (cuttingResults.reduce((sum, r) => sum + r.actualPieces, 0) / currentBatch.target) * 100,
                                            100
                                        )}%`
                                    }}
                                />
                            </div>
                        </div> */}

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
                                placeholder="Contoh: 'Material kusut di roll 2', 'Scrap 3 meter', dll"
                                className="text-sm"
                            />
                        </div>

                        {/* Action Buttons */}
                        <div className="border-t pt-4 space-y-3">
                            <div className="space-y-2">
                                <p className="text-sm font-medium text-muted-foreground">Pilih aksi:</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {/* Save Progress Button */}
                                    <Button
                                        onClick={handleUpdateProgress}
                                        disabled={submitting}
                                        variant="outline"
                                        className="w-full"
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

                                    {/* Submit Button */}
                                    <Button
                                        onClick={() => setShowSubmitConfirm(true)}
                                        disabled={submitting || sewingResults.reduce((sum, r) => sum + r.actualPieces, 0) === 0}
                                        className="w-full bg-green-600 hover:bg-green-700"
                                    >
                                        {submitting ? (
                                            <>
                                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                Mengirim...
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircle className="h-4 w-4 mr-2" />
                                                Submit Verifikasi
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>

                            {/* Help Text */}
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                                <p className="font-medium flex items-center gap-2 mb-1">
                                    <AlertTriangle className="h-4 w-4" />
                                    Perbedaan Dua Tombol:
                                </p>
                                <ul className="space-y-1 text-xs ml-6 list-disc">
                                    <li><strong>Simpan Progress:</strong> Menyimpan draft, bisa dilanjutkan nanti</li>
                                    <li><strong>Submit Verifikasi:</strong> Menyelesaikan task, tidak bisa diubah lagi</li>
                                </ul>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Submit Confirmation Dialog */}
            <AlertDialog open={showSubmitConfirm} onOpenChange={setShowSubmitConfirm}>
                <AlertDialogContent className="max-w-sm">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Konfirmasi Submit untuk Verifikasi</AlertDialogTitle>
                        <AlertDialogDescription>
                            Anda yakin ingin mengirim hasil jahit ini untuk diverifikasi? Data tidak bisa diubah setelah submit.
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    <div className="bg-muted rounded-lg p-3 space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Total Hasil Jahit:</span>
                            <span className="font-semibold">{sewingResults.reduce((sum, r) => sum + r.actualPieces, 0)} pcs</span>
                        </div>

                        {notes && (
                            <div className="pt-2 border-t">
                                <span className="text-muted-foreground text-xs">Catatan: {notes}</span>
                            </div>
                        )}
                    </div>

                    <AlertDialogCancel disabled={submitting}>Batal</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleComplete}
                        disabled={submitting}
                        className="bg-green-600 hover:bg-green-700"
                    >
                        {submitting ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Mengirim...
                            </>
                        ) : (
                            <>Ya, Submit Verifikasi</>
                        )}
                    </AlertDialogAction>
                </AlertDialogContent>
            </AlertDialog>

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
            {/* <Card>
                <CardHeader>
                    <CardTitle>Riwayat Progress</CardTitle>
                    <CardDescription>
                        Timeline aktivitas untuk batch {task.batch.batchSku}
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
            </Card> */}
        </div>
    )
}
