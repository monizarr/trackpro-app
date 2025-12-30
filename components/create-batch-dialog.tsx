"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/lib/toast"
import { Plus, Trash2 } from "lucide-react"

interface Product {
    id: string
    sku: string
    name: string
    materials: Array<{
        materialId: string
        material: {
            id: string
            name: string
            code: string
            unit: string
            color?: string
            currentStock: number
        }
    }>
}

interface MaterialAllocation {
    materialId: string
    materialName: string
    color: string
    rollQuantity: number
    requestedQty: number
    unit: string
    availableStock: number
}

interface SizeColorRequest {
    productSize: string
    color: string
    requestedPieces: number
}

interface CreateBatchDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    products: Product[]
    onSuccess: () => void
}

export function CreateBatchDialog({ open, onOpenChange, products, onSuccess }: CreateBatchDialogProps) {
    const [creating, setCreating] = useState(false)
    const [selectedProductId, setSelectedProductId] = useState("")
    const [notes, setNotes] = useState("")
    const [materialAllocations, setMaterialAllocations] = useState<MaterialAllocation[]>([])
    const [sizeColorRequests, setSizeColorRequests] = useState<SizeColorRequest[]>([
        { productSize: "", color: "", requestedPieces: 0 }
    ])

    const selectedProduct = products.find(p => p.id === selectedProductId)

    const handleProductChange = (productId: string) => {
        setSelectedProductId(productId)
        setMaterialAllocations([])
    }

    const addMaterialAllocation = () => {
        setMaterialAllocations(prev => [
            ...prev,
            {
                materialId: "",
                materialName: "",
                color: "",
                rollQuantity: 0,
                requestedQty: 0,
                unit: "METER",
                availableStock: 0,
            }
        ])
    }

    const removeMaterialAllocation = (index: number) => {
        setMaterialAllocations(prev => prev.filter((_, i) => i !== index))
    }

    const updateMaterialAllocation = (index: number, field: string, value: any) => {
        setMaterialAllocations(prev =>
            prev.map((alloc, i) => {
                if (i === index) {
                    // If materialId changed, update related fields
                    if (field === "materialId" && selectedProduct) {
                        const productMaterial = selectedProduct.materials.find(
                            m => m.material.id === value
                        )
                        if (productMaterial) {
                            return {
                                ...alloc,
                                materialId: value,
                                materialName: productMaterial.material.name,
                                color: productMaterial.material.color || "",
                                unit: productMaterial.material.unit,
                                availableStock: Number(productMaterial.material.currentStock),
                            }
                        }
                    }
                    return { ...alloc, [field]: value }
                }
                return alloc
            })
        )
    }

    const addSizeColorRequest = () => {
        setSizeColorRequests(prev => [
            ...prev,
            { productSize: "", color: "", requestedPieces: 0 }
        ])
    }

    const removeSizeColorRequest = (index: number) => {
        if (sizeColorRequests.length > 1) {
            setSizeColorRequests(prev => prev.filter((_, i) => i !== index))
        }
    }

    const updateSizeColorRequest = (index: number, field: string, value: any) => {
        setSizeColorRequests(prev =>
            prev.map((req, i) =>
                i === index ? { ...req, [field]: value } : req
            )
        )
    }

    const handleCreateBatch = async () => {
        // Validation
        if (!selectedProductId) {
            toast.error("Error", "Produk harus dipilih")
            return
        }

        if (materialAllocations.length === 0) {
            toast.error("Error", "Minimal 1 bahan baku harus ditambahkan")
            return
        }

        const invalidMaterial = materialAllocations.find(
            m => !m.materialId || !m.color || m.rollQuantity <= 0
        )
        if (invalidMaterial) {
            toast.error("Error", "Semua field bahan baku harus diisi dengan benar")
            return
        }

        const invalidRequest = sizeColorRequests.find(
            r => !r.productSize || !r.color || r.requestedPieces <= 0
        )
        if (invalidRequest) {
            toast.error("Error", "Semua field request ukuran/warna harus diisi dengan benar")
            return
        }

        setCreating(true)
        try {
            // Calculate requestedQty for each material (rollQuantity * meterPerRoll)
            // For now, assume 50 meter per roll
            const formattedMaterialAllocations = materialAllocations.map(alloc => ({
                materialId: alloc.materialId,
                color: alloc.color,
                rollQuantity: alloc.rollQuantity,
                requestedQty: alloc.rollQuantity * 50, // TODO: Get from material data
            }))

            const response = await fetch("/api/production-batches", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    productId: selectedProductId,
                    notes,
                    materialAllocations: formattedMaterialAllocations,
                    sizeColorRequests: sizeColorRequests.map(req => ({
                        productSize: req.productSize,
                        color: req.color,
                        requestedPieces: parseInt(req.requestedPieces.toString()),
                    })),
                }),
            })

            const result = await response.json()

            if (result.success) {
                toast.success("Berhasil", "Batch produksi berhasil dibuat")
                resetForm()
                onOpenChange(false)
                onSuccess()
            } else {
                toast.error("Gagal", result.error || "Gagal membuat batch")
            }
        } catch (error) {
            console.error("Error creating batch:", error)
            toast.error("Error", "Terjadi kesalahan saat membuat batch")
        } finally {
            setCreating(false)
        }
    }

    const resetForm = () => {
        setSelectedProductId("")
        setNotes("")
        setMaterialAllocations([])
        setSizeColorRequests([{ productSize: "", color: "", requestedPieces: 0 }])
    }

    const totalRolls = materialAllocations.reduce((sum, alloc) => sum + (alloc.rollQuantity || 0), 0)
    const totalRequestedPieces = sizeColorRequests.reduce((sum, req) => sum + (req.requestedPieces || 0), 0)

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Buat Batch Produksi Baru</DialogTitle>
                    <DialogDescription>
                        Kepala produksi membawa bahan baku ke pemotong dengan request ukuran dan warna
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Product Selection */}
                    <div className="space-y-2">
                        <Label htmlFor="product">Produk *</Label>
                        <Select
                            id="product"
                            value={selectedProductId}
                            onChange={(e) => handleProductChange(e.target.value)}
                        >
                            <option value="">Pilih produk</option>
                            {products.map((product) => (
                                <option key={product.id} value={product.id}>
                                    {product.name} ({product.sku})
                                </option>
                            ))}
                        </Select>
                    </div>

                    {/* Material Allocations */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <Label>Bahan Baku yang Dibawa *</Label>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Tambahkan bahan baku beserta warna dan jumlah roll
                                </p>
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={addMaterialAllocation}
                                disabled={!selectedProductId}
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                Tambah Bahan
                            </Button>
                        </div>

                        {materialAllocations.map((alloc, index) => (
                            <div key={index} className="rounded-lg border p-4 space-y-3">
                                <div className="flex items-start justify-between">
                                    <Label>Bahan #{index + 1}</Label>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removeMaterialAllocation(index)}
                                    >
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div className="space-y-2">
                                        <Label>Material</Label>
                                        <Select
                                            value={alloc.materialId}
                                            onChange={(e) => updateMaterialAllocation(index, "materialId", e.target.value)}
                                        >
                                            <option value="">Pilih material</option>
                                            {selectedProduct?.materials.map((pm) => (
                                                <option key={pm.material.id} value={pm.material.id}>
                                                    {pm.material.name}
                                                </option>
                                            ))}
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Warna</Label>
                                        <Input
                                            type="text"
                                            placeholder="Misal: Putih"
                                            value={alloc.color}
                                            onChange={(e) => updateMaterialAllocation(index, "color", e.target.value)}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Jumlah Roll</Label>
                                        <Input
                                            type="number"
                                            min="1"
                                            placeholder="0"
                                            value={alloc.rollQuantity || ""}
                                            onChange={(e) => updateMaterialAllocation(index, "rollQuantity", parseInt(e.target.value) || 0)}
                                        />
                                    </div>
                                </div>

                                {alloc.materialId && (
                                    <div className="text-sm text-muted-foreground">
                                        Stok tersedia: {alloc.availableStock} {alloc.unit}
                                    </div>
                                )}
                            </div>
                        ))}

                        {materialAllocations.length > 0 && (
                            <div className="text-sm font-medium">
                                Total Roll: {totalRolls}
                            </div>
                        )}
                    </div>

                    {/* Size & Color Requests */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <Label>Request Ukuran & Warna *</Label>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Tentukan berapa banyak potongan untuk setiap ukuran dan warna
                                </p>
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={addSizeColorRequest}
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                Tambah Request
                            </Button>
                        </div>

                        {sizeColorRequests.map((req, index) => (
                            <div key={index} className="rounded-lg border p-4 space-y-3">
                                <div className="flex items-start justify-between">
                                    <Label>Request #{index + 1}</Label>
                                    {sizeColorRequests.length > 1 && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => removeSizeColorRequest(index)}
                                        >
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div className="space-y-2">
                                        <Label>Ukuran</Label>
                                        <Input
                                            type="text"
                                            placeholder="Misal: M, L, XL"
                                            value={req.productSize}
                                            onChange={(e) => updateSizeColorRequest(index, "productSize", e.target.value)}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Warna</Label>
                                        <Input
                                            type="text"
                                            placeholder="Misal: Putih"
                                            value={req.color}
                                            onChange={(e) => updateSizeColorRequest(index, "color", e.target.value)}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Jumlah Potongan</Label>
                                        <Input
                                            type="number"
                                            min="1"
                                            placeholder="0"
                                            value={req.requestedPieces || ""}
                                            onChange={(e) => updateSizeColorRequest(index, "requestedPieces", parseInt(e.target.value) || 0)}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}

                        {sizeColorRequests.length > 0 && (
                            <div className="text-sm font-medium">
                                Total Potongan yang Diharapkan: {totalRequestedPieces} pcs
                            </div>
                        )}
                    </div>

                    {/* Notes */}
                    <div className="space-y-2">
                        <Label htmlFor="notes">Catatan (Opsional)</Label>
                        <Textarea
                            id="notes"
                            placeholder="Tambahkan catatan untuk batch ini..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={3}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => {
                            onOpenChange(false)
                            resetForm()
                        }}
                        disabled={creating}
                    >
                        Batal
                    </Button>
                    <Button onClick={handleCreateBatch} disabled={creating}>
                        {creating ? "Membuat..." : "Buat Batch"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
