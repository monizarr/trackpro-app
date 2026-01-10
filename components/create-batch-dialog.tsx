"use client"

import { useState, useEffect } from "react"
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
import { MultiSelect } from "@/components/ui/multi-select"
import { toast } from "@/lib/toast"
import { Plus, Trash2 } from "lucide-react"

interface MaterialColorVariant {
    id: string
    materialId: string
    colorName: string
    colorCode?: string
    stock: number
}

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
        }
    }>
}

interface MaterialAllocation {
    materialId: string
    materialColorVariantId: string // ID dari material_color_variants
    materialName: string
    color: string
    rollQuantity: number
    requestedQty: number
    unit: string
    availableStock: number
}

interface SizeRequest {
    color: string // Dari material allocation
    sizes: string[] // Array of size names (S, M, L, XL, etc.)
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
    const [sizeRequests, setSizeRequests] = useState<SizeRequest[]>([])
    const [materialColorVariants, setMaterialColorVariants] = useState<MaterialColorVariant[]>([])

    const selectedProduct = products.find(p => p.id === selectedProductId)

    // Fetch material color variants when material is selected in allocations
    useEffect(() => {
        const materialIds = materialAllocations.map(a => a.materialId).filter(Boolean)
        if (materialIds.length > 0) {
            // Fetch all variants for all materials
            Promise.all(
                materialIds.map(id =>
                    fetch(`/api/material-color-variants?materialId=${id}`)
                        .then(res => res.json())
                )
            ).then(results => {
                const allVariants = results.flatMap(r => r.success ? r.data : [])
                // Deduplicate by variant ID to prevent duplicate colors
                const uniqueVariants = allVariants.filter((variant, index, self) =>
                    index === self.findIndex((v) => v.id === variant.id)
                )
                setMaterialColorVariants(uniqueVariants)
            }).catch(err => console.error("Error fetching material color variants:", err))
        } else {
            setMaterialColorVariants([])
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [materialAllocations.map(a => a.materialId).join(',')])

    // Sync size requests with material allocations colors
    useEffect(() => {
        const selectedColors = materialAllocations
            .filter(alloc => alloc.color)
            .map(alloc => alloc.color)

        // Remove size requests for colors that are no longer selected
        setSizeRequests(prev => {
            const filtered = prev.filter(req => selectedColors.includes(req.color))

            // Add size requests for new colors
            const existingColors = filtered.map(req => req.color)
            const newColors = selectedColors.filter(color => !existingColors.includes(color))

            const newRequests = newColors.map(color => ({
                color,
                sizes: []
            }))

            return [...filtered, ...newRequests]
        })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [materialAllocations.map(alloc => alloc.color).join(',')])

    const handleProductChange = (productId: string) => {
        setSelectedProductId(productId)
        setMaterialAllocations([])
    }

    const addMaterialAllocation = () => {
        setMaterialAllocations(prev => [
            ...prev,
            {
                materialId: "",
                materialColorVariantId: "",
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

    const updateMaterialAllocation = (index: number, field: string, value: string | number) => {
        setMaterialAllocations(prev =>
            prev.map((alloc, i) => {
                if (i === index) {
                    // If materialId changed, update related fields
                    if (field === "materialId" && typeof value === "string" && selectedProduct) {
                        const productMaterial = selectedProduct.materials.find(
                            m => m.material.id === value
                        )
                        if (productMaterial) {
                            return {
                                ...alloc,
                                materialId: value as string,
                                materialColorVariantId: "", // Reset when material changes
                                materialName: productMaterial.material.name,
                                color: "", // Reset color when material changes
                                unit: productMaterial.material.unit,
                                availableStock: 0, // Will be set when color is selected
                            }
                        }
                    }

                    // If color changed, find the variant and set materialColorVariantId
                    if (field === "color" && typeof value === "string") {
                        const variant = materialColorVariants.find(
                            v => v.materialId === alloc.materialId && v.colorName === value
                        )
                        if (variant) {
                            return {
                                ...alloc,
                                color: value as string,
                                materialColorVariantId: variant.id,
                                availableStock: Number(variant.stock),
                            }
                        }
                    }

                    return { ...alloc, [field]: value } as MaterialAllocation
                }
                return alloc
            })
        )
    }

    const updateSizesForColor = (color: string, sizes: string[]) => {
        setSizeRequests(prev =>
            prev.map(req =>
                req.color === color
                    ? { ...req, sizes }
                    : req
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
            m => !m.materialId || !m.color || !m.materialColorVariantId || m.rollQuantity <= 0
        )
        if (invalidMaterial) {
            toast.error("Error", "Semua field bahan baku harus diisi dengan benar")
            return
        }

        // Validate stock availability (1 roll = 95 meters)
        const METER_PER_ROLL = 95
        for (const alloc of materialAllocations) {
            const requiredMeters = alloc.rollQuantity * METER_PER_ROLL
            if (requiredMeters > alloc.availableStock) {
                toast.error(
                    "Stok Tidak Cukup",
                    `${alloc.materialName} - ${alloc.color}: Butuh ${requiredMeters}m (${alloc.rollQuantity} roll), tersedia ${alloc.availableStock}m`
                )
                return
            }
        }

        if (sizeRequests.length === 0) {
            toast.error("Error", "Minimal 1 request ukuran harus ditambahkan")
            return
        }

        const invalidRequest = sizeRequests.find(req => req.sizes.length === 0)
        if (invalidRequest) {
            toast.error("Error", "Setiap warna harus memiliki minimal 1 ukuran")
            return
        }

        setCreating(true)
        try {
            const METER_PER_ROLL = 95
            const formattedMaterialAllocations = materialAllocations.map(alloc => ({
                materialId: alloc.materialId,
                materialColorVariantId: alloc.materialColorVariantId,
                color: alloc.color,
                rollQuantity: alloc.rollQuantity,
                requestedQty: alloc.rollQuantity * METER_PER_ROLL,
                meterPerRoll: METER_PER_ROLL,
            }))

            const response = await fetch("/api/production-batches", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    productId: selectedProductId,
                    notes,
                    materialColorAllocations: formattedMaterialAllocations,
                    sizeColorRequests: sizeRequests.flatMap(req =>
                        req.sizes.map(size => ({
                            productSize: size,
                            color: req.color,
                            requestedPieces: 0, // Will be filled later during confirmation
                        }))
                    ),
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
        setSizeRequests([])
    }

    const totalRolls = materialAllocations.reduce((sum, alloc) => sum + (alloc.rollQuantity || 0), 0)
    const totalSizeVariants = sizeRequests.reduce((sum, req) => sum + req.sizes.length, 0)

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
                                        <Select
                                            value={alloc.color}
                                            onChange={(e) => updateMaterialAllocation(index, "color", e.target.value)}
                                            disabled={!alloc.materialId}
                                        >
                                            <option value="">Pilih warna</option>
                                            {materialColorVariants
                                                .filter(v => v.materialId === alloc.materialId)
                                                .map((variant) => (
                                                    <option key={variant.id} value={variant.colorName}>
                                                        {variant.colorName} (Stok: {variant.stock} {alloc.unit})
                                                    </option>
                                                ))}
                                        </Select>
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

                    {/* Size Requests per Material Color */}
                    <div className="space-y-3">
                        <div>
                            <Label>Request Ukuran (Berdasarkan Warna Bahan) *</Label>
                            <p className="text-sm text-muted-foreground mt-1">
                                Pilih ukuran yang akan diproduksi untuk setiap warna bahan. Jumlah potongan akan diinput saat konfirmasi batch.
                            </p>
                        </div>

                        {sizeRequests.length === 0 && (
                            <div className="text-sm text-muted-foreground italic">
                                Pilih bahan baku dan warna terlebih dahulu
                            </div>
                        )}

                        {sizeRequests.map((req) => (
                            <div key={req.color} className="rounded-lg border p-4 space-y-3">
                                <div className="space-y-2">
                                    <Label className="text-base">Warna: {req.color}</Label>
                                    <MultiSelect
                                        options={["XS", "S", "M", "L", "XL", "XXL", "XXXL"]}
                                        selected={req.sizes}
                                        onChange={(sizes) => updateSizesForColor(req.color, sizes)}
                                        placeholder="Pilih ukuran untuk warna ini..."
                                    />
                                </div>

                                {req.sizes.length > 0 && (
                                    <div className="text-sm text-muted-foreground">
                                        Ukuran terpilih: {req.sizes.join(", ")}
                                    </div>
                                )}
                            </div>
                        ))}

                        {sizeRequests.length > 0 && (
                            <div className="text-sm font-medium">
                                Total Varian Ukuran: {totalSizeVariants}
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
