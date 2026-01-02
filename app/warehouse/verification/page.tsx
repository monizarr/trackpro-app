"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { AlertCircle, Package, XCircle, Loader2, CheckCircle, MapPin, User, Shirt } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface SubBatchItem {
    id: string
    productSize: string
    color: string
    piecesAssigned: number
    sewingOutput: number
    finishingOutput: number
}

interface SubBatch {
    id: string
    subBatchSku: string
    status: string
    piecesAssigned: number
    sewingOutput: number
    sewingReject: number
    finishingOutput: number
    finishingReject: number
    submittedToWarehouseAt: Date | null
    batch: {
        id: string
        batchSku: string
        product: {
            id: string
            name: string
            sku: string
        }
    }
    assignedSewer: { id: string; name: string }
    assignedFinisher?: { id: string; name: string }
    items: SubBatchItem[]
}

export default function WarehouseVerificationPage() {
    const [subBatches, setSubBatches] = useState<SubBatch[]>([])
    const [loading, setLoading] = useState(true)
    const [verifying, setVerifying] = useState(false)
    const [selectedSubBatch, setSelectedSubBatch] = useState<SubBatch | null>(null)
    const [showVerifyDialog, setShowVerifyDialog] = useState(false)
    const [goodsLocation, setGoodsLocation] = useState("")
    const [warehouseNotes, setWarehouseNotes] = useState("")
    const { toast } = useToast()

    const fetchSubBatches = async () => {
        try {
            const response = await fetch('/api/sub-batches?status=SUBMITTED_TO_WAREHOUSE')

            if (response.ok) {
                const result = await response.json()
                setSubBatches(result.data || [])
            }
        } catch (err) {
            toast({
                variant: "destructive",
                title: "Error",
                description: "Gagal memuat data sub-batch: " + err
            })
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchSubBatches()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const openVerifyDialog = (subBatch: SubBatch) => {
        setSelectedSubBatch(subBatch)
        setGoodsLocation("")
        setWarehouseNotes("")
        setShowVerifyDialog(true)
    }

    const handleVerify = async () => {
        if (!selectedSubBatch) return

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
            const response = await fetch(`/api/sub-batches/${selectedSubBatch.id}/verify-warehouse`, {
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
                    description: result.message || `Sub-batch ${selectedSubBatch.subBatchSku} telah diverifikasi`
                })
                setShowVerifyDialog(false)
                fetchSubBatches()
            } else {
                const error = await response.json()
                throw new Error(error.error || 'Failed to verify')
            }
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Error",
                description: error instanceof Error ? error.message : "Gagal memverifikasi sub-batch"
            })
        } finally {
            setVerifying(false)
        }
    }

    // Group sub-batches by parent batch
    const groupedByBatch = subBatches.reduce((acc, sb) => {
        const batchSku = sb.batch.batchSku
        if (!acc[batchSku]) {
            acc[batchSku] = {
                batch: sb.batch,
                subBatches: []
            }
        }
        acc[batchSku].subBatches.push(sb)
        return acc
    }, {} as Record<string, { batch: SubBatch['batch']; subBatches: SubBatch[] }>)

    const totalPieces = subBatches.reduce((sum, sb) => sum + sb.finishingOutput, 0)
    const totalReject = subBatches.reduce((sum, sb) => sum + sb.sewingReject + sb.finishingReject, 0)

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        )
    }

    return (
        <div className="flex-1 space-y-4 p-4 sm:p-6 md:p-8 pt-4 sm:pt-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Verifikasi Gudang</h2>
                    <p className="text-sm sm:text-base text-muted-foreground">
                        Verifikasi sub-batch finishing dan simpan sebagai barang jadi
                    </p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Menunggu Verifikasi
                        </CardTitle>
                        <AlertCircle className="h-4 w-4 text-yellow-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{subBatches.length}</div>
                        <p className="text-xs text-muted-foreground">
                            Sub-batch siap diverifikasi
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Total Batches
                        </CardTitle>
                        <Package className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {Object.keys(groupedByBatch).length}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Batch produksi terkait
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Total Pieces
                        </CardTitle>
                        <CheckCircle className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                            {totalPieces}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Barang jadi siap disimpan
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
                        <div className="text-2xl font-bold text-red-600">
                            {totalReject}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Barang gagal
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Sub-Batch List */}
            {subBatches.length === 0 ? (
                <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                        Tidak ada sub-batch yang menunggu verifikasi gudang.
                    </AlertDescription>
                </Alert>
            ) : (
                <div className="space-y-6">
                    {Object.entries(groupedByBatch).map(([batchSku, { batch, subBatches: batchSubBatches }]) => (
                        <Card key={batchSku}>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle className="font-mono">{batchSku}</CardTitle>
                                        <CardDescription>{batch.product.name}</CardDescription>
                                    </div>
                                    <Badge variant="outline">
                                        {batchSubBatches.length} sub-batch
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {batchSubBatches.map((subBatch) => (
                                        <div
                                            key={subBatch.id}
                                            className="border rounded-lg p-4 space-y-3"
                                        >
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <p className="font-mono font-medium text-sm">
                                                        {subBatch.subBatchSku}
                                                    </p>
                                                    <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                                                        <span className="flex items-center gap-1">
                                                            <User className="h-3 w-3" />
                                                            {subBatch.assignedSewer?.name || "-"}
                                                        </span>
                                                        {subBatch.assignedFinisher && (
                                                            <span className="flex items-center gap-1">
                                                                <Shirt className="h-3 w-3" />
                                                                {subBatch.assignedFinisher.name}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <Button
                                                    size="sm"
                                                    onClick={() => openVerifyDialog(subBatch)}
                                                >
                                                    <CheckCircle className="h-4 w-4 mr-1" />
                                                    Verifikasi
                                                </Button>
                                            </div>

                                            {/* Items breakdown */}
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                                                <div className="bg-muted/50 p-2 rounded">
                                                    <p className="text-muted-foreground text-xs">Assigned</p>
                                                    <p className="font-medium">{subBatch.piecesAssigned} pcs</p>
                                                </div>
                                                <div className="bg-green-50 dark:bg-green-950 p-2 rounded">
                                                    <p className="text-muted-foreground text-xs">Finishing Output</p>
                                                    <p className="font-medium text-green-600">{subBatch.finishingOutput} pcs</p>
                                                </div>
                                                <div className="bg-red-50 dark:bg-red-950 p-2 rounded">
                                                    <p className="text-muted-foreground text-xs">Sewing Reject</p>
                                                    <p className="font-medium text-red-600">{subBatch.sewingReject} pcs</p>
                                                </div>
                                                <div className="bg-red-50 dark:bg-red-950 p-2 rounded">
                                                    <p className="text-muted-foreground text-xs">Finishing Reject</p>
                                                    <p className="font-medium text-red-600">{subBatch.finishingReject} pcs</p>
                                                </div>
                                            </div>

                                            {/* Size/Color breakdown */}
                                            <div className="flex flex-wrap gap-1">
                                                {subBatch.items.map((item) => (
                                                    <Badge
                                                        key={item.id}
                                                        variant="secondary"
                                                        className="text-xs"
                                                    >
                                                        {item.productSize} {item.color}: {item.finishingOutput}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Verify Dialog */}
            <Dialog open={showVerifyDialog} onOpenChange={setShowVerifyDialog}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Verifikasi Sub-Batch ke Gudang</DialogTitle>
                        <DialogDescription>
                            Simpan hasil finishing sebagai barang jadi di gudang
                        </DialogDescription>
                    </DialogHeader>

                    {selectedSubBatch && (
                        <div className="space-y-4">
                            {/* Sub-batch info */}
                            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-sm text-muted-foreground">Sub-Batch</span>
                                    <span className="font-mono font-medium">{selectedSubBatch.subBatchSku}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-muted-foreground">Batch</span>
                                    <span className="font-mono">{selectedSubBatch.batch.batchSku}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-muted-foreground">Produk</span>
                                    <span>{selectedSubBatch.batch.product.name}</span>
                                </div>
                            </div>

                            {/* Quantity summary */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg text-center">
                                    <p className="text-sm text-muted-foreground">Barang Jadi</p>
                                    <p className="text-3xl font-bold text-green-600">
                                        {selectedSubBatch.finishingOutput}
                                    </p>
                                    <p className="text-xs text-muted-foreground">pieces</p>
                                </div>
                                <div className="bg-red-50 dark:bg-red-950 p-4 rounded-lg text-center">
                                    <p className="text-sm text-muted-foreground">Barang Gagal</p>
                                    <p className="text-3xl font-bold text-red-600">
                                        {selectedSubBatch.sewingReject + selectedSubBatch.finishingReject}
                                    </p>
                                    <p className="text-xs text-muted-foreground">pieces</p>
                                </div>
                            </div>

                            {/* Items detail */}
                            <div>
                                <Label className="text-sm text-muted-foreground">Detail per Size/Warna</Label>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {selectedSubBatch.items.map((item) => (
                                        <Badge key={item.id} variant="outline">
                                            {item.productSize} {item.color}: {item.finishingOutput} pcs
                                        </Badge>
                                    ))}
                                </div>
                            </div>

                            {/* Location input */}
                            <div className="space-y-2">
                                <Label htmlFor="location">
                                    Lokasi Penyimpanan <span className="text-destructive">*</span>
                                </Label>
                                <div className="relative">
                                    <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="location"
                                        placeholder="Contoh: Rak A-01, Gudang Utama"
                                        value={goodsLocation}
                                        onChange={(e) => setGoodsLocation(e.target.value)}
                                        className="pl-10"
                                    />
                                </div>
                            </div>

                            {/* Notes */}
                            <div className="space-y-2">
                                <Label htmlFor="notes">Catatan (Opsional)</Label>
                                <Textarea
                                    id="notes"
                                    placeholder="Catatan tambahan..."
                                    value={warehouseNotes}
                                    onChange={(e) => setWarehouseNotes(e.target.value)}
                                    rows={2}
                                />
                            </div>

                            <DialogFooter className="flex-col sm:flex-row gap-2">
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
                            </DialogFooter>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}
