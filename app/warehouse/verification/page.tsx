"use client"

import { useEffect, useState } from "react"
import { CheckCircle, Loader2, AlertCircle, Package, XCircle } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface FinishingTask {
    piecesCompleted: number
    rejectPieces: number
    notes: string | null
    completedAt: Date | null
}

interface Batch {
    id: string
    batchSku: string
    targetQuantity: number
    status: string
    createdAt: Date
    product: {
        name: string
        sku: string
    }
    finishingTask: FinishingTask | null
}

export default function WarehouseVerificationPage() {
    const [batches, setBatches] = useState<Batch[]>([])
    const [loading, setLoading] = useState(true)
    const [verifying, setVerifying] = useState(false)
    const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null)
    const [showVerifyDialog, setShowVerifyDialog] = useState(false)
    const [goodsLocation, setGoodsLocation] = useState("")
    const [warehouseNotes, setWarehouseNotes] = useState("")
    const { toast } = useToast()

    const fetchBatches = async () => {
        try {
            const response = await fetch('/api/production-batches?status=FINISHING_COMPLETED')

            if (response.ok) {
                const result = await response.json()
                setBatches(result.data || [])
            }
        } catch (err) {
            toast({
                variant: "destructive",
                title: "Error",
                description: "Gagal memuat data batch: " + err
            })
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchBatches()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const openVerifyDialog = (batch: Batch) => {
        setSelectedBatch(batch)
        setGoodsLocation("")
        setWarehouseNotes("")
        setShowVerifyDialog(true)
    }

    const handleVerify = async () => {
        if (!selectedBatch) return

        if (!goodsLocation.trim()) {
            toast({
                variant: "destructive",
                title: "Error",
                description: "Lokasi penyimpanan harus diisi"
            })
            return
        }

        setVerifying(true)
        try {
            const response = await fetch(`/api/production-batches/${selectedBatch.id}/verify-warehouse`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    goodsLocation,
                    warehouseNotes
                })
            })

            if (response.ok) {
                const result = await response.json()
                toast({
                    title: "Berhasil",
                    description: `Batch ${selectedBatch.batchSku} telah diverifikasi. Finished: ${result.finishedGoods.quantity}, Reject: ${result.rejectGoods?.quantity || 0}`
                })
                setShowVerifyDialog(false)
                fetchBatches()
            } else {
                const error = await response.json()
                throw new Error(error.error || 'Failed to verify')
            }
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Error",
                description: error instanceof Error ? error.message : "Gagal memverifikasi batch"
            })
        } finally {
            setVerifying(false)
        }
    }

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        )
    }

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Verifikasi Gudang</h2>
                    <p className="text-muted-foreground">
                        Verifikasi batch finishing dan simpan sebagai barang jadi
                    </p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Menunggu Verifikasi
                        </CardTitle>
                        <AlertCircle className="h-4 w-4 text-yellow-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{batches.length}</div>
                        <p className="text-xs text-muted-foreground">
                            Batch finishing selesai
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Total Pieces
                        </CardTitle>
                        <Package className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {batches.reduce((sum, b) => sum + (b.finishingTask?.piecesCompleted || 0), 0)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Total barang jadi siap disimpan
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Total Reject
                        </CardTitle>
                        <XCircle className="h-4 w-4 text-red-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {batches.reduce((sum, b) => sum + (b.finishingTask?.rejectPieces || 0), 0)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Total barang gagal
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Batch List */}
            {batches.length === 0 ? (
                <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                        Tidak ada batch yang menunggu verifikasi gudang.
                    </AlertDescription>
                </Alert>
            ) : (
                <Card>
                    <CardHeader>
                        <CardTitle>Batch Menunggu Verifikasi</CardTitle>
                        <CardDescription>
                            Klik &ldquo;Verifikasi&rdquo; untuk menyimpan batch sebagai barang jadi di gudang
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {batches.map((batch) => (
                                <Card key={batch.id} className="border-2">
                                    <CardContent className="p-6">
                                        <div className="flex items-start justify-between">
                                            <div className="space-y-1 flex-1">
                                                <div className="flex items-center gap-2">
                                                    <p className="font-mono font-bold text-lg">{batch.batchSku}</p>
                                                    <Badge variant="outline">FINISHING_COMPLETED</Badge>
                                                </div>
                                                <p className="text-sm text-muted-foreground">{batch.product.name}</p>
                                                <p className="text-xs text-muted-foreground">SKU: {batch.product.sku}</p>

                                                {batch.finishingTask && (
                                                    <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t">
                                                        <div>
                                                            <p className="text-xs text-muted-foreground">Target</p>
                                                            <p className="text-lg font-bold">{batch.targetQuantity} pcs</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs text-muted-foreground">Finished</p>
                                                            <p className="text-lg font-bold text-green-600">
                                                                {batch.finishingTask.piecesCompleted} pcs
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs text-muted-foreground">Reject</p>
                                                            <p className="text-lg font-bold text-red-600">
                                                                {batch.finishingTask.rejectPieces} pcs
                                                            </p>
                                                        </div>
                                                    </div>
                                                )}

                                                {batch.finishingTask?.notes && (
                                                    <div className="mt-3 p-3 bg-muted rounded-md">
                                                        <p className="text-xs text-muted-foreground">Catatan Finishing:</p>
                                                        <p className="text-sm">{batch.finishingTask.notes}</p>
                                                    </div>
                                                )}
                                            </div>

                                            <Button
                                                onClick={() => openVerifyDialog(batch)}
                                                size="lg"
                                                className="ml-4"
                                            >
                                                <CheckCircle className="h-4 w-4 mr-2" />
                                                Verifikasi
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Verify Dialog */}
            <Dialog open={showVerifyDialog} onOpenChange={setShowVerifyDialog}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Verifikasi Batch ke Gudang</DialogTitle>
                        <DialogDescription>
                            Simpan batch sebagai barang jadi dan barang gagal di gudang
                        </DialogDescription>
                    </DialogHeader>

                    {selectedBatch && (
                        <div className="space-y-4">
                            {/* Batch Info */}
                            <div className="p-4 border rounded-lg space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-sm text-muted-foreground">Batch:</span>
                                    <span className="font-mono font-bold">{selectedBatch.batchSku}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-muted-foreground">Produk:</span>
                                    <span className="font-medium">{selectedBatch.product.name}</span>
                                </div>
                                <div className="flex justify-between pt-2 border-t">
                                    <span className="text-sm text-muted-foreground">Barang Jadi:</span>
                                    <span className="font-bold text-green-600">
                                        {selectedBatch.finishingTask?.piecesCompleted || 0} pcs
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-muted-foreground">Barang Gagal:</span>
                                    <span className="font-bold text-red-600">
                                        {selectedBatch.finishingTask?.rejectPieces || 0} pcs
                                    </span>
                                </div>
                            </div>

                            <Alert>
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>
                                    Barang jadi akan disimpan di lokasi yang Anda tentukan.
                                    Barang gagal otomatis disimpan di area reject.
                                </AlertDescription>
                            </Alert>

                            {/* Form */}
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="goodsLocation">
                                        Lokasi Penyimpanan Barang Jadi <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="goodsLocation"
                                        value={goodsLocation}
                                        onChange={(e) => setGoodsLocation(e.target.value)}
                                        placeholder="Contoh: RAK-A-01, SHELF-B-05"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="warehouseNotes">Catatan Gudang</Label>
                                    <Textarea
                                        id="warehouseNotes"
                                        value={warehouseNotes}
                                        onChange={(e) => setWarehouseNotes(e.target.value)}
                                        placeholder="Tambahkan catatan jika diperlukan"
                                        rows={3}
                                    />
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2 justify-end pt-4 border-t">
                                <Button
                                    variant="outline"
                                    onClick={() => setShowVerifyDialog(false)}
                                    disabled={verifying}
                                >
                                    Batal
                                </Button>
                                <Button
                                    onClick={handleVerify}
                                    disabled={verifying || !goodsLocation.trim()}
                                >
                                    {verifying ? (
                                        <>
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            Memverifikasi...
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle className="h-4 w-4 mr-2" />
                                            Verifikasi & Simpan
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}
