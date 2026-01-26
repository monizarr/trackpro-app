"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Trash2, Package } from "lucide-react"
import { toast } from "@/lib/toast"

// Sewing output item - hasil jahitan yang tersedia untuk finishing
interface SewingOutput {
    productSize: string
    color: string
    quantity: number // Hasil jahitan
}

// Finishing output item - input untuk sub-batch
interface FinishingOutputItem {
    productSize: string
    color: string
    goodQuantity: number // Barang jadi bagus
    rejectKotor: number // Kotor - dicuci di gudang
    rejectSobek: number // Sobek - Bad Stock
    rejectRusakJahit: number // Rusak jahit - Bad Stock
}

interface CreateSubBatchDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    batchId: string
    batchSku: string
    sewingOutputs: SewingOutput[] // Hasil jahitan untuk diproses di finishing
    onSuccess: () => void
}

/**
 * Dialog untuk membuat Sub-Batch di tahap FINISHING
 * 
 * Workflow baru:
 * - Sub-batch dibuat di tahap finishing (bukan sewing)
 * - Digunakan untuk tracking partial delivery ke gudang
 * - Mencatat barang jadi (good) dan reject (kotor, sobek, rusak jahit)
 * - Tahap 4.a sampai 5.c berulang sampai semua hasil jahit selesai diproses
 */
export function CreateSubBatchDialog({
    open,
    onOpenChange,
    batchId,
    batchSku,
    sewingOutputs,
    onSuccess,
}: CreateSubBatchDialogProps) {
    const [items, setItems] = useState<FinishingOutputItem[]>([])
    const [notes, setNotes] = useState("")
    const [submitting, setSubmitting] = useState(false)

    // Get available size/color combinations from sewing outputs
    const getSizeColorOptions = () => {
        const options: { productSize: string; color: string; availableQuantity: number }[] = []

        for (const output of sewingOutputs) {
            if (output.quantity > 0) {
                options.push({
                    productSize: output.productSize,
                    color: output.color,
                    availableQuantity: output.quantity,
                })
            }
        }

        return options
    }

    useEffect(() => {
        if (open) {
            // Reset state when dialog opens
            setItems([])
            setNotes("")
        }
    }, [open])

    const addItem = (productSize: string, color: string) => {
        // Check if already added
        const exists = items.some(
            (item) => item.productSize === productSize && item.color === color
        )
        if (exists) {
            toast.error("Error", "Item sudah ditambahkan")
            return
        }

        setItems([
            ...items,
            {
                productSize,
                color,
                goodQuantity: 0,
                rejectKotor: 0,
                rejectSobek: 0,
                rejectRusakJahit: 0,
            },
        ])
    }

    const removeItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index))
    }

    const updateItem = (index: number, field: keyof FinishingOutputItem, value: number) => {
        const updated = [...items]
        updated[index] = {
            ...updated[index],
            [field]: Math.max(0, value),
        }

        // Validate total doesn't exceed available
        const available = getAvailableQuantity(updated[index].productSize, updated[index].color)
        const total = getTotalForItem(updated[index])

        if (total > available) {
            toast.error(
                "Validasi",
                `Total (${total}) tidak boleh melebihi tersedia (${available}) untuk ${updated[index].productSize} ${updated[index].color}`
            )
            return
        }

        setItems(updated)
    }

    const getTotalForItem = (item: FinishingOutputItem) => {
        return item.goodQuantity + item.rejectKotor + item.rejectSobek + item.rejectRusakJahit
    }

    const getAvailableQuantity = (productSize: string, color: string) => {
        const found = sewingOutputs.find(
            (output) => output.productSize === productSize && output.color === color
        )
        return found?.quantity || 0
    }

    const isItemValid = (item: FinishingOutputItem) => {
        const total = getTotalForItem(item)
        const available = getAvailableQuantity(item.productSize, item.color)
        return total > 0 && total <= available
    }

    const getItemErrorMessage = (item: FinishingOutputItem) => {
        const total = getTotalForItem(item)
        const available = getAvailableQuantity(item.productSize, item.color)

        if (total === 0) {
            return "Total harus lebih dari 0"
        }
        if (total > available) {
            return `Total (${total}) melebihi tersedia (${available})`
        }
        return null
    }

    const getTotals = () => {
        return items.reduce(
            (acc, item) => ({
                good: acc.good + item.goodQuantity,
                kotor: acc.kotor + item.rejectKotor,
                sobek: acc.sobek + item.rejectSobek,
                rusakJahit: acc.rusakJahit + item.rejectRusakJahit,
            }),
            { good: 0, kotor: 0, sobek: 0, rusakJahit: 0 }
        )
    }

    const validateItems = () => {
        if (items.length === 0) {
            toast.error("Error", "Tambahkan minimal 1 item")
            return false
        }

        for (const item of items) {
            const errorMessage = getItemErrorMessage(item)
            if (errorMessage) {
                toast.error(
                    "Validasi Error",
                    `${item.productSize} ${item.color}: ${errorMessage}`
                )
                return false
            }
        }

        return true
    }

    const handleSubmit = async () => {
        if (!validateItems()) return

        setSubmitting(true)
        try {
            const response = await fetch(`/api/production-batches/${batchId}/sub-batches`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    items: items.map((item) => ({
                        productSize: item.productSize,
                        color: item.color,
                        goodQuantity: item.goodQuantity,
                        rejectKotor: item.rejectKotor,
                        rejectSobek: item.rejectSobek,
                        rejectRusakJahit: item.rejectRusakJahit,
                    })),
                    notes: notes || null,
                }),
            })

            const result = await response.json()

            if (result.success) {
                toast.success("Berhasil", result.message || "Sub-batch hasil finishing berhasil dibuat")
                onOpenChange(false)
                onSuccess()
            } else {
                toast.error("Error", result.error || "Gagal membuat sub-batch")
            }
        } catch (error) {
            console.error("Error creating sub-batch:", error)
            toast.error("Error", "Terjadi kesalahan saat membuat sub-batch")
        } finally {
            setSubmitting(false)
        }
    }

    const sizeColorOptions = getSizeColorOptions()
    const totals = getTotals()
    const totalAll = totals.good + totals.kotor + totals.sobek + totals.rusakJahit

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[95vw] sm:max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Package className="h-5 w-5" />
                        Input Hasil Finishing - {batchSku}
                    </DialogTitle>
                    <DialogDescription>
                        Catat hasil finishing yang siap dikirim ke gudang.
                        Proses ini dapat dilakukan berulang untuk partial delivery.
                    </DialogDescription>
                </DialogHeader>

                {/* Summary of available sewing outputs */}
                <Card className="mb-4">
                    <CardHeader className="py-3">
                        <CardTitle className="text-sm">Hasil Jahitan Tersedia</CardTitle>
                    </CardHeader>
                    <CardContent className="py-2">
                        {sizeColorOptions.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                Tidak ada hasil jahitan yang tersedia untuk diproses.
                            </p>
                        ) : (
                            <div className="flex flex-wrap gap-2">
                                {sizeColorOptions.map((opt) => {
                                    const key = `${opt.productSize}-${opt.color}`
                                    const isAdded = items.some(
                                        (item) => item.productSize === opt.productSize && item.color === opt.color
                                    )
                                    return (
                                        <Badge
                                            key={key}
                                            variant={isAdded ? "default" : "outline"}
                                            className="cursor-pointer"
                                            onClick={() => !isAdded && addItem(opt.productSize, opt.color)}
                                        >
                                            {opt.productSize} {opt.color}: {opt.availableQuantity} pcs
                                            {!isAdded && <Plus className="h-3 w-3 ml-1" />}
                                        </Badge>
                                    )
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Items to input */}
                <div className="space-y-4">
                    {items.length === 0 ? (
                        <Card className="border-dashed">
                            <CardContent className="py-8 text-center text-muted-foreground">
                                <p>Klik badge di atas untuk menambahkan item hasil finishing</p>
                            </CardContent>
                        </Card>
                    ) : (
                        items.map((item, index) => {
                            const available = getAvailableQuantity(item.productSize, item.color)
                            const total = getTotalForItem(item)
                            const isValid = isItemValid(item)
                            const errorMsg = getItemErrorMessage(item)

                            return (
                                <Card key={index} className={`border-2 ${errorMsg ? 'border-red-300 bg-red-50' : isValid ? 'border-green-300' : 'border-yellow-300'
                                    }`}>
                                    <CardHeader className="py-3 flex flex-row items-center justify-between">
                                        <CardTitle className="text-sm flex items-center gap-2">
                                            <Badge variant="outline">
                                                {item.productSize} {item.color}
                                            </Badge>
                                            <span className="text-muted-foreground">
                                                Total: {total} / {available} pcs
                                            </span>
                                            {errorMsg && (
                                                <Badge variant="destructive" className="ml-auto">
                                                    {errorMsg}
                                                </Badge>
                                            )}
                                        </CardTitle>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => removeItem(index)}
                                        >
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                            <div className="space-y-2">
                                                <Label className="text-green-600">Barang Jadi</Label>
                                                <Input
                                                    type="number"
                                                    value={item.goodQuantity || ""}
                                                    onChange={(e) =>
                                                        updateItem(index, "goodQuantity", parseInt(e.target.value) || 0)
                                                    }
                                                    min={0}
                                                    max={available}
                                                    placeholder="0"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-yellow-600">Kotor</Label>
                                                <Input
                                                    type="number"
                                                    value={item.rejectKotor || ""}
                                                    onChange={(e) =>
                                                        updateItem(index, "rejectKotor", parseInt(e.target.value) || 0)
                                                    }
                                                    min={0}
                                                    max={available}
                                                    placeholder="0"
                                                />
                                                <p className="text-xs text-muted-foreground">Dicuci di gudang</p>
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-red-600">Sobek</Label>
                                                <Input
                                                    type="number"
                                                    value={item.rejectSobek || ""}
                                                    onChange={(e) =>
                                                        updateItem(index, "rejectSobek", parseInt(e.target.value) || 0)
                                                    }
                                                    min={0}
                                                    max={available}
                                                    placeholder="0"
                                                />
                                                <p className="text-xs text-muted-foreground">Bad Stock</p>
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-red-600">Rusak Jahit</Label>
                                                <Input
                                                    type="number"
                                                    value={item.rejectRusakJahit || ""}
                                                    onChange={(e) =>
                                                        updateItem(index, "rejectRusakJahit", parseInt(e.target.value) || 0)
                                                    }
                                                    min={0}
                                                    max={available}
                                                    placeholder="0"
                                                />
                                                <p className="text-xs text-muted-foreground">Bad Stock</p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            )
                        })
                    )}
                </div>

                {/* Notes */}
                <div className="space-y-2">
                    <Label>Catatan (Opsional)</Label>
                    <Textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Catatan untuk sub-batch ini"
                        rows={2}
                    />
                </div>

                {/* Summary */}
                {items.length > 0 && (
                    <Card className="bg-muted">
                        <CardContent className="py-4">
                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-center">
                                <div>
                                    <p className="text-2xl font-bold text-green-600">{totals.good}</p>
                                    <p className="text-xs text-muted-foreground">Barang Jadi</p>
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-yellow-600">{totals.kotor}</p>
                                    <p className="text-xs text-muted-foreground">Kotor</p>
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-red-600">{totals.sobek}</p>
                                    <p className="text-xs text-muted-foreground">Sobek</p>
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-red-600">{totals.rusakJahit}</p>
                                    <p className="text-xs text-muted-foreground">Rusak Jahit</p>
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">{totalAll}</p>
                                    <p className="text-xs text-muted-foreground">Total</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                <DialogFooter className="flex-col sm:flex-row gap-2">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Batal
                    </Button>
                    <Button onClick={handleSubmit} disabled={submitting || items.length === 0}>
                        {submitting ? "Menyimpan..." : `Buat Sub-Batch (${totalAll} pcs)`}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
