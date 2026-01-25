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
import { Plus, Trash2, AlertTriangle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface MaterialColorVariant {
    id: string
    materialId: string
    colorName: string
    colorCode?: string
    stock: number
    unit: string
    rollQuantity?: number
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
    colorVariants?: Array<{
        id: string
        colorName: string
        colorCode?: string
    }>
    sizeVariants?: Array<{
        id: string
        sizeName: string
        sizeOrder: number
    }>
}

interface MaterialAllocation {
    materialId: string
    materialColorVariantId: string // ID dari material_color_variants
    materialName: string
    color: string
    rollQuantity: number
    allocatedQty: number // Jumlah dalam kg/yard sesuai unit varian
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
    const [selectedProductColorId, setSelectedProductColorId] = useState("")
    const [notes, setNotes] = useState("")
    const [materialAllocations, setMaterialAllocations] = useState<MaterialAllocation[]>([])
    const [sizeRequests, setSizeRequests] = useState<SizeRequest[]>([])
    const [materialColorVariants, setMaterialColorVariants] = useState<MaterialColorVariant[]>([])

    const selectedProduct = products.find(p => p.id === selectedProductId)
    const selectedProductColor = selectedProduct?.colorVariants?.find(c => c.id === selectedProductColorId)
    const productSizeOptions = selectedProduct?.sizeVariants?.map(s => s.sizeName) || []

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
    console.log("materialColorVariants", materialColorVariants)
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
        setSelectedProductColorId("")
        setMaterialAllocations([])
        setSizeRequests([])
    }

    const handleProductColorChange = (colorId: string) => {
        setSelectedProductColorId(colorId)
        // Reset size requests when product color changes
        const product = products.find(p => p.id === selectedProductId)
        const color = product?.colorVariants?.find(c => c.id === colorId)
        if (color) {
            setSizeRequests([{
                color: color.colorName,
                sizes: []
            }])
        } else {
            setSizeRequests([])
        }
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
                allocatedQty: 0,
                unit: "",
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
                                unit: variant.unit || alloc.unit, // Use variant unit if available
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

        if (!selectedProductColorId) {
            toast.error("Error", "Warna produk harus dipilih")
            return
        }

        if (materialAllocations.length === 0) {
            toast.error("Error", "Minimal 1 bahan baku harus ditambahkan")
            return
        }

        const invalidMaterial = materialAllocations.find(
            m => !m.materialId || !m.color || !m.materialColorVariantId || m.rollQuantity <= 0 || m.allocatedQty <= 0
        )
        if (invalidMaterial) {
            toast.error("Error", "Semua field bahan baku harus diisi dengan benar (termasuk jumlah roll dan kuantitas)")
            return
        }

        // Validate stock availability based on allocatedQty
        for (const alloc of materialAllocations) {
            if (alloc.allocatedQty > alloc.availableStock) {
                toast.error(
                    "Stok Tidak Cukup",
                    `${alloc.materialName} - ${alloc.color}: Butuh ${alloc.allocatedQty} ${alloc.unit}, tersedia ${alloc.availableStock} ${alloc.unit}`
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
            const formattedMaterialAllocations = materialAllocations.map(alloc => ({
                materialId: alloc.materialId,
                materialColorVariantId: alloc.materialColorVariantId,
                color: alloc.color,
                rollQuantity: alloc.rollQuantity,
                allocatedQty: alloc.allocatedQty, // Jumlah aktual dalam kg/yard
                meterPerRoll: alloc.rollQuantity > 0 ? alloc.allocatedQty / alloc.rollQuantity : 0, // Hitung rata-rata per roll
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
        setSelectedProductColorId("")
        setNotes("")
        setMaterialAllocations([])
        setSizeRequests([])
    }

    const totalRolls = materialAllocations.reduce((sum, alloc) => sum + (alloc.rollQuantity || 0), 0)
    const totalSizeVariants = sizeRequests.reduce((sum, req) => sum + req.sizes.length, 0)

    // Check if material has matching color variant for selected product color
    const hasMatchingMaterialColor = (materialId: string) => {
        if (!selectedProductColor) return true
        const variants = materialColorVariants.filter(v => v.materialId === materialId)
        return variants.some(v => v.colorName.toLowerCase() === selectedProductColor.colorName.toLowerCase())
    }

    // Get warning message for missing material color
    const getMaterialColorWarning = () => {
        if (!selectedProductColor || materialAllocations.length === 0) return null

        const missingColors = materialAllocations
            .filter(alloc => alloc.materialId && !hasMatchingMaterialColor(alloc.materialId))
            .map(alloc => alloc.materialName)

        if (missingColors.length === 0) return null

        return `Bahan ${missingColors.join(", ")} belum memiliki varian warna "${selectedProductColor.colorName}". Tambahkan varian warna pada halaman stok bahan baku.`
    }

    const materialColorWarning = getMaterialColorWarning()

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
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

                        <div className="space-y-2">
                            <Label htmlFor="productColor">Warna Produk *</Label>
                            <Select
                                id="productColor"
                                value={selectedProductColorId}
                                onChange={(e) => handleProductColorChange(e.target.value)}
                                disabled={!selectedProductId || !selectedProduct?.colorVariants?.length}
                            >
                                <option value="">Pilih warna produk</option>
                                {selectedProduct?.colorVariants?.map((color) => (
                                    <option key={color.id} value={color.id}>
                                        {color.colorName} {color.colorCode ? `(${color.colorCode})` : ""}
                                    </option>
                                ))}
                            </Select>
                            {selectedProductId && (!selectedProduct?.colorVariants || selectedProduct.colorVariants.length === 0) && (
                                <p className="text-xs text-destructive">
                                    ⚠️ Produk ini belum memiliki varian warna. Tambahkan varian warna di halaman detail produk.
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Warning if no size variants */}
                    {selectedProductId && (!selectedProduct?.sizeVariants || selectedProduct.sizeVariants.length === 0) && (
                        <Alert variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>
                                Produk ini belum memiliki varian ukuran. Tambahkan varian ukuran di halaman detail produk sebelum membuat batch produksi.
                            </AlertDescription>
                        </Alert>
                    )}

                    {/* Material Color Warning */}
                    {materialColorWarning && (
                        <Alert>
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>{materialColorWarning}</AlertDescription>
                        </Alert>
                    )}

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
                                                        {variant.colorName} (Stok: {variant.stock} {variant.unit || alloc.unit})
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

                                {/* Input untuk kuantitas aktual (kg/yard) */}
                                {alloc.materialId && alloc.color && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div className="space-y-2">
                                            <Label>Jumlah Alokasi ({alloc.unit})</Label>
                                            <Input
                                                type="number"
                                                min="0.01"
                                                step="0.01"
                                                placeholder={`Masukkan jumlah dalam ${alloc.unit}`}
                                                value={alloc.allocatedQty || ""}
                                                onChange={(e) => updateMaterialAllocation(index, "allocatedQty", parseFloat(e.target.value) || 0)}
                                            />
                                            <p className="text-xs text-muted-foreground">
                                                Jumlah bahan baku yang akan dialokasikan untuk batch ini
                                            </p>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Stok Tersedia</Label>
                                            <div className="h-10 px-3 py-2 rounded-md border bg-muted/50 flex items-center">
                                                {(() => {
                                                    const variant = materialColorVariants.find(
                                                        v => v.materialId === alloc.materialId && v.colorName === alloc.color
                                                    )
                                                    if (variant?.rollQuantity) {
                                                        return `${variant.rollQuantity} roll (${alloc.availableStock} ${alloc.unit})`
                                                    }
                                                    return `${alloc.availableStock} ${alloc.unit}`
                                                })()}
                                            </div>
                                            {alloc.allocatedQty > alloc.availableStock && (
                                                <p className="text-xs text-destructive font-medium">
                                                    ⚠️ Melebihi stok tersedia!
                                                </p>
                                            )}
                                        </div>
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
                            <Label>Request Ukuran (Berdasarkan Warna Produk) *</Label>
                            <p className="text-sm text-muted-foreground mt-1">
                                Pilih ukuran yang akan diproduksi untuk warna produk yang dipilih. Jumlah potongan akan diinput saat konfirmasi batch.
                            </p>
                        </div>

                        {!selectedProductColor && (
                            <div className="text-sm text-muted-foreground italic">
                                Pilih warna produk terlebih dahulu
                            </div>
                        )}

                        {productSizeOptions.length === 0 && selectedProductColor && (
                            <Alert variant="destructive">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertDescription>
                                    Produk ini belum memiliki varian ukuran. Tambahkan varian ukuran di halaman detail produk.
                                </AlertDescription>
                            </Alert>
                        )}

                        {sizeRequests.map((req) => (
                            <div key={req.color} className="rounded-lg border p-4 space-y-3">
                                <div className="space-y-2">
                                    <Label className="text-base">Warna Produk: {req.color}</Label>
                                    <MultiSelect
                                        options={productSizeOptions.length > 0 ? productSizeOptions : ["XS", "S", "M", "L", "XL", "XXL", "XXXL"]}
                                        selected={req.sizes}
                                        onChange={(sizes) => updateSizesForColor(req.color, sizes)}
                                        placeholder={productSizeOptions.length > 0 ? "Pilih ukuran produk..." : "Pilih ukuran untuk warna ini..."}
                                    />
                                    {productSizeOptions.length === 0 && (
                                        <p className="text-xs text-amber-600">
                                            ⚠️ Menggunakan ukuran standar karena produk belum memiliki varian ukuran
                                        </p>
                                    )}
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
