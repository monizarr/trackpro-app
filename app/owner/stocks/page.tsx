"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
    Package2,
    Plus,
    Search,
    TrendingDown,
    TrendingUp,
    Edit,
    Trash2,
    PackagePlus,
    ArrowUpDown,
} from "lucide-react"
import { toast } from "@/lib/toast"

// Interfaces sesuai dengan struktur database
interface Material {
    id: string
    code: string
    name: string
    description: string | null
    unit: string
    supplier: string | null
}

interface MaterialColorVariant {
    id: string
    materialId: string
    colorName: string
    colorCode: string | null
    stock: number
    minimumStock: number
    price: number
    rollQuantity: number | null
    meterPerRoll: number | null
    purchaseOrderNumber: string | null
    purchaseDate: string | null
    purchaseNotes: string | null
    supplier: string | null
    isActive: boolean
    material: Material
}

interface Statistics {
    totalVariants: number
    lowStockItems: number
    outOfStockItems: number
    totalValue: number
}

export default function StocksPage() {
    const [variants, setVariants] = useState<MaterialColorVariant[]>([])
    const [materials, setMaterials] = useState<Material[]>([])
    const [statistics, setStatistics] = useState<Statistics>({
        totalVariants: 0,
        lowStockItems: 0,
        outOfStockItems: 0,
        totalValue: 0,
    })
    const [isLoading, setIsLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState("")

    // Dialog states
    const [isCreateMaterialOpen, setIsCreateMaterialOpen] = useState(false)
    const [isAddVariantOpen, setIsAddVariantOpen] = useState(false)
    const [isEditVariantOpen, setIsEditVariantOpen] = useState(false)
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
    const [isTransactionOpen, setIsTransactionOpen] = useState(false)
    const [selectedVariant, setSelectedVariant] = useState<MaterialColorVariant | null>(null)
    const [isSaving, setIsSaving] = useState(false)

    // Forms
    const [createMaterialForm, setCreateMaterialForm] = useState({
        code: "",
        name: "",
        description: "",
        supplier: "",
    })

    const [variantForm, setVariantForm] = useState({
        materialId: "",
        colorName: "",
        colorCode: "",
        stock: "",
        minimumStock: "",
        price: "",
        rollQuantity: "",
        meterPerRoll: "",
        purchaseOrderNumber: "",
        purchaseDate: "",
        purchaseNotes: "",
        supplier: "",
    })

    const [transactionForm, setTransactionForm] = useState({
        variantId: "",
        type: "IN" as "IN" | "OUT" | "ADJUSTMENT" | "RETURN",
        quantity: "",
        notes: "",
        rollQuantity: "",
        meterPerRoll: "",
        purchaseOrderNumber: "",
        supplier: "",
        purchaseDate: "",
        purchaseNotes: "",
    })

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        try {
            setIsLoading(true)
            await Promise.all([fetchVariants(), fetchMaterials()])
        } catch (error) {
            console.error("Error fetching data:", error)
        } finally {
            setIsLoading(false)
        }
    }

    const fetchVariants = async () => {
        try {
            const response = await fetch("/api/material-color-variants")
            const data = await response.json()

            if (data.success) {
                setVariants(data.data)

                // Calculate statistics
                const totalValue = data.data.reduce(
                    (sum: number, v: MaterialColorVariant) => sum + v.stock * v.price,
                    0
                )
                const lowStock = data.data.filter(
                    (v: MaterialColorVariant) => v.stock > 0 && v.stock <= v.minimumStock
                ).length
                const outOfStock = data.data.filter(
                    (v: MaterialColorVariant) => v.stock === 0
                ).length

                setStatistics({
                    totalVariants: data.data.length,
                    lowStockItems: lowStock,
                    outOfStockItems: outOfStock,
                    totalValue,
                })
            }
        } catch (error) {
            console.error("Error fetching variants:", error)
            toast.error("Error", "Gagal mengambil data varian")
        }
    }

    const fetchMaterials = async () => {
        try {
            const response = await fetch("/api/materials")
            const data = await response.json()

            if (data.success) {
                setMaterials(data.data)
            }
        } catch (error) {
            console.error("Error fetching materials:", error)
            toast.error("Error", "Gagal mengambil data bahan baku")
        }
    }

    const handleCreateMaterial = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSaving(true)

        try {
            const response = await fetch("/api/materials", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    code: createMaterialForm.code.trim(),
                    name: createMaterialForm.name.trim(),
                    description: createMaterialForm.description.trim() || null,
                    unit: "METER",
                    supplier: createMaterialForm.supplier.trim() || null,
                }),
            })

            const data = await response.json()

            if (data.success) {
                await fetchMaterials()
                setIsCreateMaterialOpen(false)
                setCreateMaterialForm({
                    code: "",
                    name: "",
                    description: "",
                    supplier: "",
                })
                toast.success("Berhasil", `Bahan baku ${createMaterialForm.name} berhasil ditambahkan`)
            } else {
                toast.error("Gagal", data.error || "Tidak dapat menambahkan bahan baku")
            }
        } catch (error) {
            console.error("Error creating material:", error)
            toast.error("Error", "Gagal menambahkan bahan baku")
        } finally {
            setIsSaving(false)
        }
    }

    const handleAddVariant = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSaving(true)

        try {
            const response = await fetch("/api/material-color-variants", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    materialId: variantForm.materialId,
                    colorName: variantForm.colorName.trim(),
                    colorCode: variantForm.colorCode.trim() || null,
                    stock: Number(variantForm.stock),
                    minimumStock: Number(variantForm.minimumStock),
                    price: Number(variantForm.price),
                    rollQuantity: variantForm.rollQuantity ? Number(variantForm.rollQuantity) : null,
                    meterPerRoll: variantForm.meterPerRoll ? Number(variantForm.meterPerRoll) : null,
                    purchaseOrderNumber: variantForm.purchaseOrderNumber.trim() || null,
                    purchaseDate: variantForm.purchaseDate || null,
                    purchaseNotes: variantForm.purchaseNotes.trim() || null,
                    supplier: variantForm.supplier.trim() || null,
                }),
            })

            const data = await response.json()

            if (data.success) {
                await fetchVariants()
                setIsAddVariantOpen(false)
                setVariantForm({
                    materialId: "",
                    colorName: "",
                    colorCode: "",
                    stock: "",
                    minimumStock: "",
                    price: "",
                    rollQuantity: "",
                    meterPerRoll: "",
                    purchaseOrderNumber: "",
                    purchaseDate: "",
                    purchaseNotes: "",
                    supplier: "",
                })
                toast.success("Berhasil", "Varian warna berhasil ditambahkan")
            } else {
                toast.error("Gagal", data.error || "Tidak dapat menambahkan varian")
            }
        } catch (error) {
            console.error("Error adding variant:", error)
            toast.error("Error", "Gagal menambahkan varian")
        } finally {
            setIsSaving(false)
        }
    }

    const handleEditVariant = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedVariant) return

        setIsSaving(true)

        try {
            const response = await fetch(`/api/material-color-variants/${selectedVariant.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    colorCode: variantForm.colorCode.trim() || null,
                    minimumStock: Number(variantForm.minimumStock),
                    price: Number(variantForm.price),
                    rollQuantity: variantForm.rollQuantity ? Number(variantForm.rollQuantity) : null,
                    meterPerRoll: variantForm.meterPerRoll ? Number(variantForm.meterPerRoll) : null,
                    purchaseOrderNumber: variantForm.purchaseOrderNumber.trim() || null,
                    purchaseDate: variantForm.purchaseDate || null,
                    purchaseNotes: variantForm.purchaseNotes.trim() || null,
                    supplier: variantForm.supplier.trim() || null,
                }),
            })

            const data = await response.json()

            if (data.success) {
                await fetchVariants()
                setIsEditVariantOpen(false)
                setSelectedVariant(null)
                toast.success("Berhasil", "Varian berhasil diperbarui")
            } else {
                toast.error("Gagal", data.error || "Tidak dapat memperbarui varian")
            }
        } catch (error) {
            console.error("Error updating variant:", error)
            toast.error("Error", "Gagal memperbarui varian")
        } finally {
            setIsSaving(false)
        }
    }

    const handleDeleteVariant = async () => {
        if (!selectedVariant) return

        setIsSaving(true)

        try {
            const response = await fetch(`/api/material-color-variants/${selectedVariant.id}`, {
                method: "DELETE",
            })

            const data = await response.json()

            if (data.success) {
                await fetchVariants()
                setIsDeleteDialogOpen(false)
                setSelectedVariant(null)
                toast.success("Berhasil", "Varian berhasil dihapus")
            } else {
                toast.error("Gagal", data.error || "Tidak dapat menghapus varian")
            }
        } catch (error) {
            console.error("Error deleting variant:", error)
            toast.error("Error", "Gagal menghapus varian")
        } finally {
            setIsSaving(false)
        }
    }

    const openEditDialog = (variant: MaterialColorVariant) => {
        setSelectedVariant(variant)
        setVariantForm({
            materialId: variant.materialId,
            colorName: variant.colorName,
            colorCode: variant.colorCode || "",
            stock: variant.stock.toString(),
            minimumStock: variant.minimumStock.toString(),
            price: variant.price.toString(),
            rollQuantity: variant.rollQuantity?.toString() || "",
            meterPerRoll: variant.meterPerRoll?.toString() || "",
            purchaseOrderNumber: variant.purchaseOrderNumber || "",
            purchaseDate: variant.purchaseDate ? new Date(variant.purchaseDate).toISOString().split('T')[0] : "",
            purchaseNotes: variant.purchaseNotes || "",
            supplier: variant.supplier || "",
        })
        setIsEditVariantOpen(true)
    }

    const openDeleteDialog = (variant: MaterialColorVariant) => {
        setSelectedVariant(variant)
        setIsDeleteDialogOpen(true)
    }

    const openTransactionDialog = (variant: MaterialColorVariant) => {
        setSelectedVariant(variant)
        setTransactionForm({
            variantId: variant.id,
            type: "IN",
            quantity: "",
            notes: "",
            rollQuantity: "",
            meterPerRoll: "",
            purchaseOrderNumber: "",
            supplier: variant.supplier || "",
            purchaseDate: "",
            purchaseNotes: "",
        })
        setIsTransactionOpen(true)
    }

    const handleTransaction = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedVariant) return

        setIsSaving(true)

        try {
            const payload: Record<string, unknown> = {
                type: transactionForm.type,
                quantity: Number(transactionForm.quantity),
                notes: transactionForm.notes.trim() || null,
            }

            // Add purchase info only for IN transactions
            if (transactionForm.type === "IN") {
                if (transactionForm.rollQuantity) {
                    payload.rollQuantity = Number(transactionForm.rollQuantity)
                }
                if (transactionForm.meterPerRoll) {
                    payload.meterPerRoll = Number(transactionForm.meterPerRoll)
                }
                if (transactionForm.purchaseOrderNumber) {
                    payload.purchaseOrderNumber = transactionForm.purchaseOrderNumber.trim()
                }
                if (transactionForm.supplier) {
                    payload.supplier = transactionForm.supplier.trim()
                }
                if (transactionForm.purchaseDate) {
                    payload.purchaseDate = transactionForm.purchaseDate
                }
                if (transactionForm.purchaseNotes) {
                    payload.purchaseNotes = transactionForm.purchaseNotes.trim()
                }
            }

            const response = await fetch(`/api/material-color-variants/${selectedVariant.id}/transaction`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            })

            const data = await response.json()

            if (data.success) {
                await fetchVariants()
                setIsTransactionOpen(false)
                setSelectedVariant(null)
                const typeLabel = transactionForm.type === "IN" ? "Masuk" : transactionForm.type === "OUT" ? "Keluar" : "Penyesuaian"
                toast.success("Berhasil", `Transaksi ${typeLabel} berhasil dicatat`)
            } else {
                toast.error("Gagal", data.error || "Tidak dapat mencatat transaksi")
            }
        } catch (error) {
            console.error("Error processing transaction:", error)
            toast.error("Error", "Gagal mencatat transaksi")
        } finally {
            setIsSaving(false)
        }
    }

    const getStockStatus = (current: number, minimum: number) => {
        if (current === 0) return { status: "critical", label: "Habis", variant: "destructive" as const }
        if (current <= minimum) return { status: "low", label: "Menipis", variant: "warning" as const }
        return { status: "good", label: "Aman", variant: "default" as const }
    }

    const filteredVariants = variants.filter((variant) =>
        variant.material.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        variant.material.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        variant.colorName.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("id-ID", {
            style: "currency",
            currency: "IDR",
            minimumFractionDigits: 0,
        }).format(amount)
    }

    return (
        <div className="flex-1 space-y-4 p-4 sm:p-8 pt-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Inventaris Bahan Baku</h2>
                    <p className="text-muted-foreground">
                        Kelola bahan baku dan varian warna
                    </p>
                </div>
                <div className="flex gap-2 flex-wrap">
                    <Dialog open={isCreateMaterialOpen} onOpenChange={setIsCreateMaterialOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="mr-2 h-4 w-4" />
                                Bahan Baku Baru
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>Bahan Baku Baru</DialogTitle>
                                <DialogDescription>
                                    Tambahkan bahan baku baru. Setelah ditambahkan, Anda dapat menambahkan varian warna.
                                </DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleCreateMaterial} className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="code">Kode *</Label>
                                        <Input
                                            id="code"
                                            value={createMaterialForm.code}
                                            onChange={(e) =>
                                                setCreateMaterialForm({ ...createMaterialForm, code: e.target.value })
                                            }
                                            placeholder="Contoh: MAT-KAIN-001"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="name">Nama *</Label>
                                        <Input
                                            id="name"
                                            value={createMaterialForm.name}
                                            onChange={(e) =>
                                                setCreateMaterialForm({ ...createMaterialForm, name: e.target.value })
                                            }
                                            placeholder="Contoh: Kain Katun Premium"
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="description">Deskripsi</Label>
                                    <Textarea
                                        id="description"
                                        value={createMaterialForm.description}
                                        onChange={(e) =>
                                            setCreateMaterialForm({ ...createMaterialForm, description: e.target.value })
                                        }
                                        placeholder="Deskripsi..."
                                        rows={3}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="supplier">Supplier</Label>
                                    <Input
                                        id="supplier"
                                        value={createMaterialForm.supplier}
                                        onChange={(e) =>
                                            setCreateMaterialForm({ ...createMaterialForm, supplier: e.target.value })
                                        }
                                        placeholder="Supplier"
                                    />
                                </div>
                                <div className="bg-muted/50 p-3 rounded-md">
                                    <p className="text-sm text-muted-foreground">
                                        <strong>Catatan:</strong> Semua bahan baku menggunakan satuan METER.
                                    </p>
                                </div>
                                <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setIsCreateMaterialOpen(false)}
                                        disabled={isSaving}
                                    >
                                        Batal
                                    </Button>
                                    <Button type="submit" disabled={isSaving}>
                                        {isSaving ? "Menyimpan..." : "Simpan"}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>

                    <Dialog open={isAddVariantOpen} onOpenChange={setIsAddVariantOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline">
                                <PackagePlus className="mr-2 h-4 w-4" />
                                Tambah Varian
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>Varian Warna Baru</DialogTitle>
                                <DialogDescription>
                                    Tambahkan varian warna untuk bahan baku yang sudah ada
                                </DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleAddVariant} className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2 sm:col-span-2">
                                        <Label htmlFor="materialId">Bahan *</Label>
                                        <select
                                            id="materialId"
                                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                            value={variantForm.materialId}
                                            onChange={(e) =>
                                                setVariantForm({ ...variantForm, materialId: e.target.value })
                                            }
                                            required
                                        >
                                            <option value="">Pilih Bahan</option>
                                            {materials.map((material) => (
                                                <option key={material.id} value={material.id}>
                                                    {material.code} - {material.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="colorName">Warna *</Label>
                                        <Input
                                            id="colorName"
                                            value={variantForm.colorName}
                                            onChange={(e) =>
                                                setVariantForm({ ...variantForm, colorName: e.target.value })
                                            }
                                            placeholder="Contoh: Putih"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="colorCode">Kode</Label>
                                        <Input
                                            id="colorCode"
                                            value={variantForm.colorCode}
                                            onChange={(e) =>
                                                setVariantForm({ ...variantForm, colorCode: e.target.value })
                                            }
                                            placeholder="#FFFFFF"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="stock">Stok Awal (M) *</Label>
                                        <Input
                                            id="stock"
                                            type="number"
                                            step="0.01"
                                            value={variantForm.stock}
                                            onChange={(e) =>
                                                setVariantForm({ ...variantForm, stock: e.target.value })
                                            }
                                            placeholder="0"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="minimumStock">Min. Stok (M) *</Label>
                                        <Input
                                            id="minimumStock"
                                            type="number"
                                            step="0.01"
                                            value={variantForm.minimumStock}
                                            onChange={(e) =>
                                                setVariantForm({ ...variantForm, minimumStock: e.target.value })
                                            }
                                            placeholder="0"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="price">Harga/M *</Label>
                                        <Input
                                            id="price"
                                            type="number"
                                            step="0.01"
                                            value={variantForm.price}
                                            onChange={(e) =>
                                                setVariantForm({ ...variantForm, price: e.target.value })
                                            }
                                            placeholder="0"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="rollQuantity">Jml Roll</Label>
                                        <Input
                                            id="rollQuantity"
                                            type="number"
                                            value={variantForm.rollQuantity}
                                            onChange={(e) =>
                                                setVariantForm({ ...variantForm, rollQuantity: e.target.value })
                                            }
                                            placeholder="Jml roll"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="meterPerRoll">M/Roll</Label>
                                        <Input
                                            id="meterPerRoll"
                                            type="number"
                                            step="0.01"
                                            value={variantForm.meterPerRoll}
                                            onChange={(e) =>
                                                setVariantForm({ ...variantForm, meterPerRoll: e.target.value })
                                            }
                                            placeholder="M/roll"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="supplier">Supplier</Label>
                                        <Input
                                            id="supplier"
                                            value={variantForm.supplier}
                                            onChange={(e) =>
                                                setVariantForm({ ...variantForm, supplier: e.target.value })
                                            }
                                            placeholder="Supplier"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="purchaseOrderNumber">No. PO</Label>
                                        <Input
                                            id="purchaseOrderNumber"
                                            value={variantForm.purchaseOrderNumber}
                                            onChange={(e) =>
                                                setVariantForm({ ...variantForm, purchaseOrderNumber: e.target.value })
                                            }
                                            placeholder="Contoh: PO-2024-001"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="purchaseDate">Tgl Beli</Label>
                                        <Input
                                            id="purchaseDate"
                                            type="date"
                                            value={variantForm.purchaseDate}
                                            onChange={(e) =>
                                                setVariantForm({ ...variantForm, purchaseDate: e.target.value })
                                            }
                                        />
                                    </div>
                                    <div className="space-y-2 sm:col-span-2">
                                        <Label htmlFor="purchaseNotes">Catatan Pembelian</Label>
                                        <Textarea
                                            id="purchaseNotes"
                                            value={variantForm.purchaseNotes}
                                            onChange={(e) =>
                                                setVariantForm({ ...variantForm, purchaseNotes: e.target.value })
                                            }
                                            placeholder="Catatan..."
                                            rows={2}
                                        />
                                    </div>
                                </div>
                                <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setIsAddVariantOpen(false)}
                                        disabled={isSaving}
                                    >
                                        Batal
                                    </Button>
                                    <Button type="submit" disabled={isSaving}>
                                        {isSaving ? "Menyimpan..." : "Simpan"}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Statistics Cards */}
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Varian</CardTitle>
                        <Package2 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{statistics.totalVariants}</div>
                        <p className="text-xs text-muted-foreground">Varian warna tersedia</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Stok Menipis</CardTitle>
                        <TrendingDown className="h-4 w-4 text-yellow-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{statistics.lowStockItems}</div>
                        <p className="text-xs text-muted-foreground">Perlu diperhatikan</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Stok Habis</CardTitle>
                        <TrendingUp className="h-4 w-4 text-red-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{statistics.outOfStockItems}</div>
                        <p className="text-xs text-muted-foreground">Perlu segera diisi</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Nilai Total</CardTitle>
                        <Package2 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(statistics.totalValue)}</div>
                        <p className="text-xs text-muted-foreground">Nilai inventaris</p>
                    </CardContent>
                </Card>
            </div>

            {/* Search */}
            <div className="flex items-center gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Cari bahan baku atau warna..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8"
                    />
                </div>
            </div>

            {/* Table - Desktop */}
            <Card className="hidden md:block">
                <CardHeader>
                    <CardTitle>Daftar Varian</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Kode</TableHead>
                                    <TableHead>Bahan</TableHead>
                                    <TableHead>Warna</TableHead>
                                    <TableHead className="text-right">Stok</TableHead>
                                    <TableHead className="text-right">Min</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Harga</TableHead>
                                    <TableHead className="text-right">Nilai</TableHead>
                                    <TableHead className="text-center">Aksi</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={9} className="text-center py-8">
                                            Memuat...
                                        </TableCell>
                                    </TableRow>
                                ) : filteredVariants.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={9} className="text-center py-8">
                                            {searchQuery ? "Tidak ada data yang cocok" : "Belum ada varian warna"}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredVariants.map((variant) => {
                                        const stockStatus = getStockStatus(variant.stock, variant.minimumStock)
                                        return (
                                            <TableRow key={variant.id}>
                                                <TableCell className="font-medium">{variant.material.code}</TableCell>
                                                <TableCell>{variant.material.name}</TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        {variant.colorCode && (
                                                            <div
                                                                className="w-4 h-4 rounded border"
                                                                style={{ backgroundColor: variant.colorCode }}
                                                            />
                                                        )}
                                                        {variant.colorName}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right font-mono">
                                                    {variant.stock.toLocaleString("id-ID")}
                                                </TableCell>
                                                <TableCell className="text-right font-mono">
                                                    {variant.minimumStock.toLocaleString("id-ID")}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={stockStatus.variant}>
                                                        {stockStatus.label}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {formatCurrency(variant.price)}
                                                </TableCell>
                                                <TableCell className="text-right font-medium">
                                                    {formatCurrency(variant.stock * variant.price)}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center justify-center gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => openTransactionDialog(variant)}
                                                            title="Transaksi Stok"
                                                        >
                                                            <ArrowUpDown className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => openEditDialog(variant)}
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => openDeleteDialog(variant)}
                                                        >
                                                            <Trash2 className="h-4 w-4 text-destructive" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* Cards - Mobile */}
            <div className="md:hidden space-y-3">
                <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-lg">Daftar Varian</h3>
                    <span className="text-sm text-muted-foreground">{filteredVariants.length} varian</span>
                </div>

                {isLoading ? (
                    <Card>
                        <CardContent className="py-8 text-center text-muted-foreground">
                            Memuat...
                        </CardContent>
                    </Card>
                ) : filteredVariants.length === 0 ? (
                    <Card>
                        <CardContent className="py-8 text-center text-muted-foreground">
                            {searchQuery ? "Tidak ada data yang cocok" : "Belum ada varian warna"}
                        </CardContent>
                    </Card>
                ) : (
                    filteredVariants.map((variant) => {
                        const stockStatus = getStockStatus(variant.stock, variant.minimumStock)
                        return (
                            <Card key={variant.id} className="overflow-hidden">
                                <CardContent className="p-0">
                                    {/* Header with color indicator */}
                                    <div className="flex items-center justify-between p-3 bg-muted/30 border-b">
                                        <div className="flex items-center gap-2 min-w-0 flex-1">
                                            {variant.colorCode && (
                                                <div
                                                    className="w-5 h-5 rounded-full border-2 border-white shadow-sm shrink-0"
                                                    style={{ backgroundColor: variant.colorCode }}
                                                />
                                            )}
                                            <div className="min-w-0">
                                                <p className="font-semibold truncate">{variant.material.name}</p>
                                                <p className="text-xs text-muted-foreground">{variant.material.code} • {variant.colorName}</p>
                                            </div>
                                        </div>
                                        <Badge variant={stockStatus.variant} className="shrink-0">
                                            {stockStatus.label}
                                        </Badge>
                                    </div>

                                    {/* Stock & Price Info */}
                                    <div className="p-3 space-y-2">
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="bg-muted/50 rounded-lg p-2">
                                                <p className="text-xs text-muted-foreground">Stok</p>
                                                <p className="font-mono font-semibold text-lg">
                                                    {variant.stock.toLocaleString("id-ID")} <span className="text-xs font-normal text-muted-foreground">M</span>
                                                </p>
                                            </div>
                                            <div className="bg-muted/50 rounded-lg p-2">
                                                <p className="text-xs text-muted-foreground">Min. Stok</p>
                                                <p className="font-mono font-medium">
                                                    {variant.minimumStock.toLocaleString("id-ID")} <span className="text-xs font-normal text-muted-foreground">M</span>
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between text-sm pt-1">
                                            <span className="text-muted-foreground">Harga/M</span>
                                            <span className="font-medium">{formatCurrency(variant.price)}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-muted-foreground">Total Nilai</span>
                                            <span className="font-semibold text-primary">{formatCurrency(variant.stock * variant.price)}</span>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex border-t">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="flex-1 rounded-none h-11 gap-2"
                                            onClick={() => openTransactionDialog(variant)}
                                        >
                                            <ArrowUpDown className="h-4 w-4" />
                                            <span>Transaksi</span>
                                        </Button>
                                        <div className="w-px bg-border" />
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="flex-1 rounded-none h-11 gap-2"
                                            onClick={() => openEditDialog(variant)}
                                        >
                                            <Edit className="h-4 w-4" />
                                            <span>Edit</span>
                                        </Button>
                                        <div className="w-px bg-border" />
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="flex-1 rounded-none h-11 gap-2 text-destructive hover:text-destructive"
                                            onClick={() => openDeleteDialog(variant)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                            <span>Hapus</span>
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    })
                )}
            </div>

            {/* Edit Dialog */}
            <Dialog open={isEditVariantOpen} onOpenChange={setIsEditVariantOpen}>
                <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Edit Varian</DialogTitle>
                        <DialogDescription>
                            Edit informasi varian (stok tidak dapat diubah di sini)
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleEditVariant} className="space-y-4">
                        <div className="space-y-2">
                            <Label>Bahan</Label>
                            <Input
                                value={selectedVariant?.material.name || ""}
                                disabled
                                className="bg-muted"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Warna</Label>
                            <Input
                                value={variantForm.colorName}
                                disabled
                                className="bg-muted"
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-colorCode">Kode</Label>
                                <Input
                                    id="edit-colorCode"
                                    value={variantForm.colorCode}
                                    onChange={(e) =>
                                        setVariantForm({ ...variantForm, colorCode: e.target.value })
                                    }
                                    placeholder="#FFFFFF"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-price">Harga/M *</Label>
                                <Input
                                    id="edit-price"
                                    type="number"
                                    step="0.01"
                                    value={variantForm.price}
                                    onChange={(e) =>
                                        setVariantForm({ ...variantForm, price: e.target.value })
                                    }
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-minimumStock">Min. Stok *</Label>
                                <Input
                                    id="edit-minimumStock"
                                    type="number"
                                    step="0.01"
                                    value={variantForm.minimumStock}
                                    onChange={(e) =>
                                        setVariantForm({ ...variantForm, minimumStock: e.target.value })
                                    }
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-supplier">Supplier</Label>
                                <Input
                                    id="edit-supplier"
                                    value={variantForm.supplier}
                                    onChange={(e) =>
                                        setVariantForm({ ...variantForm, supplier: e.target.value })
                                    }
                                    placeholder="Supplier"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-rollQuantity">Jml Roll</Label>
                                <Input
                                    id="edit-rollQuantity"
                                    type="number"
                                    step="0.01"
                                    value={variantForm.rollQuantity}
                                    onChange={(e) =>
                                        setVariantForm({ ...variantForm, rollQuantity: e.target.value })
                                    }
                                    placeholder="Jml roll"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-meterPerRoll">M/Roll</Label>
                                <Input
                                    id="edit-meterPerRoll"
                                    type="number"
                                    step="0.01"
                                    value={variantForm.meterPerRoll}
                                    onChange={(e) =>
                                        setVariantForm({ ...variantForm, meterPerRoll: e.target.value })
                                    }
                                    placeholder="M/roll"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-purchaseOrderNumber">No. PO</Label>
                                <Input
                                    id="edit-purchaseOrderNumber"
                                    value={variantForm.purchaseOrderNumber}
                                    onChange={(e) =>
                                        setVariantForm({ ...variantForm, purchaseOrderNumber: e.target.value })
                                    }
                                    placeholder="Contoh: PO-2026-001"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-purchaseDate">Tgl Beli</Label>
                                <Input
                                    id="edit-purchaseDate"
                                    type="date"
                                    value={variantForm.purchaseDate}
                                    onChange={(e) =>
                                        setVariantForm({ ...variantForm, purchaseDate: e.target.value })
                                    }
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="edit-purchaseNotes">Catatan Pembelian</Label>
                            <Textarea
                                id="edit-purchaseNotes"
                                value={variantForm.purchaseNotes}
                                onChange={(e) =>
                                    setVariantForm({ ...variantForm, purchaseNotes: e.target.value })
                                }
                                placeholder="Catatan..."
                                rows={2}
                            />
                        </div>

                        <div className="bg-muted/50 p-3 rounded-md">
                            <p className="text-sm text-muted-foreground">
                                <strong>Stok saat ini:</strong> {selectedVariant?.stock.toLocaleString("id-ID")} M
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                                Untuk mengubah stok, gunakan menu Transaksi
                            </p>
                        </div>
                        <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsEditVariantOpen(false)}
                                disabled={isSaving}
                            >
                                Batal
                            </Button>
                            <Button type="submit" disabled={isSaving}>
                                {isSaving ? "Menyimpan..." : "Simpan"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Transaction Dialog */}
            <Dialog open={isTransactionOpen} onOpenChange={setIsTransactionOpen}>
                <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Transaksi Stok</DialogTitle>
                        <DialogDescription>
                            {selectedVariant && (
                                <span>
                                    {selectedVariant.material.name} - {selectedVariant.colorName} (Stok saat ini: {selectedVariant.stock} {selectedVariant.material.unit})
                                </span>
                            )}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleTransaction} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="transaction-type">Jenis</Label>
                            <select
                                id="transaction-type"
                                value={transactionForm.type}
                                onChange={(e) =>
                                    setTransactionForm({ ...transactionForm, type: e.target.value as any })
                                }
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                                <option value="IN">Masuk</option>
                                <option value="OUT">Keluar</option>
                                <option value="ADJUSTMENT">Sesuaikan</option>
                                <option value="RETURN">Retur</option>
                            </select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="transaction-quantity">Jumlah</Label>
                            <Input
                                id="transaction-quantity"
                                type="number"
                                step="0.01"
                                value={transactionForm.quantity}
                                onChange={(e) =>
                                    setTransactionForm({ ...transactionForm, quantity: e.target.value })
                                }
                                required
                                placeholder="Jumlah"
                            />
                        </div>

                        {transactionForm.type === "IN" && (
                            <>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="transaction-rollQuantity">Jml Roll</Label>
                                        <Input
                                            id="transaction-rollQuantity"
                                            type="number"
                                            step="0.01"
                                            value={transactionForm.rollQuantity}
                                            onChange={(e) =>
                                                setTransactionForm({ ...transactionForm, rollQuantity: e.target.value })
                                            }
                                            placeholder="Jml roll"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="transaction-meterPerRoll">M/Roll</Label>
                                        <Input
                                            id="transaction-meterPerRoll"
                                            type="number"
                                            step="0.01"
                                            value={transactionForm.meterPerRoll}
                                            onChange={(e) =>
                                                setTransactionForm({ ...transactionForm, meterPerRoll: e.target.value })
                                            }
                                            placeholder="M/roll"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="transaction-purchaseOrderNumber">No. PO</Label>
                                        <Input
                                            id="transaction-purchaseOrderNumber"
                                            value={transactionForm.purchaseOrderNumber}
                                            onChange={(e) =>
                                                setTransactionForm({ ...transactionForm, purchaseOrderNumber: e.target.value })
                                            }
                                            placeholder="No. PO"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="transaction-supplier">Supplier</Label>
                                        <Input
                                            id="transaction-supplier"
                                            value={transactionForm.supplier}
                                            onChange={(e) =>
                                                setTransactionForm({ ...transactionForm, supplier: e.target.value })
                                            }
                                            placeholder="Supplier"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="transaction-purchaseDate">Tgl Beli</Label>
                                    <Input
                                        id="transaction-purchaseDate"
                                        type="date"
                                        value={transactionForm.purchaseDate}
                                        onChange={(e) =>
                                            setTransactionForm({ ...transactionForm, purchaseDate: e.target.value })
                                        }
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="transaction-purchaseNotes">Catatan Pembelian</Label>
                                    <Textarea
                                        id="transaction-purchaseNotes"
                                        value={transactionForm.purchaseNotes}
                                        onChange={(e) =>
                                            setTransactionForm({ ...transactionForm, purchaseNotes: e.target.value })
                                        }
                                        placeholder="Catatan..."
                                        rows={2}
                                    />
                                </div>
                            </>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="transaction-notes">Catatan</Label>
                            <Textarea
                                id="transaction-notes"
                                value={transactionForm.notes}
                                onChange={(e) =>
                                    setTransactionForm({ ...transactionForm, notes: e.target.value })
                                }
                                placeholder="Catatan..."
                                rows={2}
                            />
                        </div>

                        <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsTransactionOpen(false)}
                                disabled={isSaving}
                            >
                                Batal
                            </Button>
                            <Button type="submit" disabled={isSaving}>
                                {isSaving ? "Menyimpan..." : "Simpan"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Hapus Varian?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Yakin ingin menghapus varian{" "}
                            <strong>
                                {selectedVariant?.material.name} - {selectedVariant?.colorName}
                            </strong>
                            ? Tindakan ini tidak dapat dibatalkan.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isSaving}>Batal</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteVariant}
                            disabled={isSaving}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {isSaving ? "Menghapus..." : "Hapus"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
