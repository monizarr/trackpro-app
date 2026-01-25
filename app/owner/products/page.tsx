"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Search, Plus, ArrowUpDown, Package, X, Edit, Trash2, Palette, Ruler } from "lucide-react"
import { toast } from "@/lib/toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
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
import { SpinnerCustom } from "@/components/ui/spinner"

type ProductStatus = "active" | "inactive"

interface Material {
    id: string
    code: string
    name: string
    unit: string
    currentStock: number
}

interface ProductMaterial {
    materialId: string
    quantity: number
}

interface ColorVariant {
    colorName: string
    colorCode?: string
}

interface SizeVariant {
    sizeName: string
    sizeOrder?: number
}

interface Product {
    id: string
    sku: string
    name: string
    price: number
    description: string
    materials?: Array<{
        material: Material
        quantity: number
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
    status: ProductStatus
    availableStock?: number
}

export default function ProductsPage() {
    const [products, setProducts] = useState<Product[]>([])
    const [materials, setMaterials] = useState<Material[]>([])
    const [searchQuery, setSearchQuery] = useState("")
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [currentPage, setCurrentPage] = useState(1)
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [sortConfig, setSortConfig] = useState<{
        key: keyof Product
        direction: "asc" | "desc"
    } | null>(null)

    // Edit and Delete states
    const [editingProduct, setEditingProduct] = useState<Product | null>(null)
    const [deletingProduct, setDeletingProduct] = useState<Product | null>(null)
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)

    // Form state
    const [formData, setFormData] = useState({
        sku: "",
        name: "",
        price: 0,
        description: "",
        status: "active" as ProductStatus,
    })
    const [selectedMaterials, setSelectedMaterials] = useState<ProductMaterial[]>([])
    const [colorVariants, setColorVariants] = useState<ColorVariant[]>([])
    const [sizeVariants, setSizeVariants] = useState<SizeVariant[]>([])
    const [newColorName, setNewColorName] = useState("")
    const [newColorCode, setNewColorCode] = useState("")
    const [newSizeName, setNewSizeName] = useState("")

    // Fetch products
    useEffect(() => {
        fetchProducts()
    }, [])

    // Fetch materials when dialog opens
    useEffect(() => {
        if (isDialogOpen && materials.length === 0) {
            fetchMaterials()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isDialogOpen])

    const fetchProducts = async () => {
        try {
            setIsLoading(true)
            const response = await fetch("/api/products")
            const data = await response.json()
            console.log('API Response:', data)
            if (data.success) {
                setProducts(data.data)
            } else {
                console.error('API Error:', data.error)
            }
        } catch (error) {
            console.error("Error fetching products:", error)
        } finally {
            setIsLoading(false)
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
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSaving(true)

        try {
            const url = editingProduct ? `/api/products/${editingProduct.id}` : "/api/products"
            const method = editingProduct ? "PATCH" : "POST"

            const response = await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    ...formData,
                    materials: selectedMaterials.map(m => ({
                        materialId: m.materialId,
                        quantity: m.quantity,
                        unit: materials.find(mat => mat.id === m.materialId)?.unit || "PCS"
                    })),
                    colorVariants: colorVariants.map(c => ({
                        colorName: c.colorName,
                        colorCode: c.colorCode
                    })),
                    sizeVariants: sizeVariants.map((s, i) => ({
                        sizeName: s.sizeName,
                        sizeOrder: s.sizeOrder ?? i
                    })),
                }),
            })

            const data = await response.json()

            if (data.success) {
                await fetchProducts()
                setIsDialogOpen(false)
                resetForm()
                toast.success(editingProduct ? "Produk Diperbarui" : "Produk Dibuat", `${formData.name} berhasil ${editingProduct ? 'diperbarui' : 'ditambahkan'}`);
            } else {
                toast.error(editingProduct ? "Gagal Memperbarui" : "Gagal Membuat", data.error || `Tidak dapat ${editingProduct ? 'memperbarui' : 'membuat'} produk`);
            }
        } catch (error) {
            console.error(`Error ${editingProduct ? 'updating' : 'creating'} product:`, error)
            toast.error("Error", `Gagal ${editingProduct ? 'memperbarui' : 'membuat'} produk`);
        } finally {
            setIsSaving(false)
        }
    }

    const resetForm = () => {
        setFormData({
            sku: "",
            name: "",
            price: 0,
            description: "",
            status: "active",
        })
        setSelectedMaterials([])
        setColorVariants([])
        setSizeVariants([])
        setNewColorName("")
        setNewColorCode("")
        setNewSizeName("")
        setEditingProduct(null)
    }

    const addColorVariant = () => {
        if (!newColorName.trim()) return
        if (colorVariants.find(c => c.colorName.toLowerCase() === newColorName.toLowerCase())) {
            toast.warning("Duplikat", "Warna ini sudah ditambahkan")
            return
        }
        setColorVariants([...colorVariants, { colorName: newColorName.trim(), colorCode: newColorCode.trim() || undefined }])
        setNewColorName("")
        setNewColorCode("")
    }

    const removeColorVariant = (colorName: string) => {
        setColorVariants(colorVariants.filter(c => c.colorName !== colorName))
    }

    const addSizeVariant = () => {
        if (!newSizeName.trim()) return
        if (sizeVariants.find(s => s.sizeName.toLowerCase() === newSizeName.toLowerCase())) {
            toast.warning("Duplikat", "Ukuran ini sudah ditambahkan")
            return
        }
        setSizeVariants([...sizeVariants, { sizeName: newSizeName.trim(), sizeOrder: sizeVariants.length }])
        setNewSizeName("")
    }

    const removeSizeVariant = (sizeName: string) => {
        setSizeVariants(sizeVariants.filter(s => s.sizeName !== sizeName))
    }

    const addPredefinedSizes = () => {
        const predefinedSizes = ["XS", "S", "M", "L", "XL", "XXL"]
        const newSizes = predefinedSizes
            .filter(size => !sizeVariants.find(s => s.sizeName.toLowerCase() === size.toLowerCase()))
            .map((size, index) => ({ sizeName: size, sizeOrder: sizeVariants.length + index }))
        setSizeVariants([...sizeVariants, ...newSizes])
    }

    const handleEdit = (product: Product) => {
        setEditingProduct(product)
        setFormData({
            sku: product.sku,
            name: product.name,
            price: product.price,
            description: product.description || "",
            status: product.status.toLowerCase() as ProductStatus,
        })

        // Load materials if available
        if (product.materials) {
            setSelectedMaterials(
                product.materials.map((m) => ({
                    materialId: m.material.id,
                    quantity: m.quantity,
                }))
            )
        }

        // Load color variants if available
        if (product.colorVariants) {
            setColorVariants(
                product.colorVariants.map((c) => ({
                    colorName: c.colorName,
                    colorCode: c.colorCode,
                }))
            )
        }

        // Load size variants if available
        if (product.sizeVariants) {
            setSizeVariants(
                product.sizeVariants.map((s) => ({
                    sizeName: s.sizeName,
                    sizeOrder: s.sizeOrder,
                }))
            )
        }

        setIsDialogOpen(true)
    }

    const handleDeleteClick = (product: Product) => {
        setDeletingProduct(product)
        setIsDeleteDialogOpen(true)
    }

    const handleDelete = async () => {
        if (!deletingProduct) return

        setIsDeleting(true)
        try {
            const response = await fetch(`/api/products/${deletingProduct.id}`, {
                method: "DELETE",
            })

            const data = await response.json()

            if (data.success) {
                await fetchProducts()
                setIsDeleteDialogOpen(false)
                setDeletingProduct(null)
                toast.success("Produk Dihapus", "Produk berhasil dihapus dari sistem");
            } else {
                toast.error("Gagal Menghapus", data.error || "Tidak dapat menghapus produk");
            }
        } catch (error) {
            console.error("Error deleting product:", error)
            toast.error("Error", "Gagal menghapus produk");
        } finally {
            setIsDeleting(false)
        }
    }

    const addMaterial = (materialId: string) => {
        if (!selectedMaterials.find((m) => m.materialId === materialId)) {
            setSelectedMaterials([...selectedMaterials, { materialId, quantity: 1 }])
        }
    }

    const removeMaterial = (materialId: string) => {
        setSelectedMaterials(selectedMaterials.filter((m) => m.materialId !== materialId))
    }

    const updateMaterialQuantity = (materialId: string, quantity: number) => {
        setSelectedMaterials(
            selectedMaterials.map((m) =>
                m.materialId === materialId ? { ...m, quantity } : m
            )
        )
    }

    const handleSort = (key: keyof Product) => {
        let direction: "asc" | "desc" = "asc"
        if (
            sortConfig &&
            sortConfig.key === key &&
            sortConfig.direction === "asc"
        ) {
            direction = "desc"
        }
        setSortConfig({ key, direction })
    }

    const filteredProducts = products.filter((product) =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const sortedProducts = [...filteredProducts].sort((a, b) => {
        if (!sortConfig) return 0

        const aValue = a[sortConfig.key]
        const bValue = b[sortConfig.key]

        if (aValue === undefined || bValue === undefined) return 0

        if (aValue < bValue) {
            return sortConfig.direction === "asc" ? -1 : 1
        }
        if (aValue > bValue) {
            return sortConfig.direction === "asc" ? 1 : -1
        }
        return 0
    })

    return (
        <div className="flex-1 space-y-4 p-4 sm:p-6 md:p-8 pt-4 sm:pt-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Produk</h2>
                    <p className="text-sm sm:text-base text-muted-foreground">
                        Kelola katalog produk Anda
                    </p>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={(open) => {
                    setIsDialogOpen(open)
                    if (!open) resetForm()
                }}>
                    <DialogTrigger asChild>
                        <Button className="w-full sm:w-auto">
                            <Plus className="h-4 w-4 mr-2" />
                            Tambah Produk
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6 rounded-lg shadow-lg">
                        <DialogHeader>
                            <DialogTitle>{editingProduct ? 'Edit Produk' : 'Buat Produk Baru'}</DialogTitle>
                            <DialogDescription>
                                {editingProduct ? 'Perbarui informasi produk' : 'Tambahkan produk baru ke katalog Anda.'}
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="sku">SKU</Label>
                                    <Input
                                        id="sku"
                                        placeholder="Kode Produk"
                                        value={formData.sku}
                                        onChange={(e) =>
                                            setFormData({ ...formData, sku: e.target.value })
                                        }
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="name">Nama</Label>
                                    <Input
                                        id="name"
                                        placeholder="Nama Produk"
                                        value={formData.name}
                                        onChange={(e) =>
                                            setFormData({ ...formData, name: e.target.value })
                                        }
                                        required
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="price">Harga Produksi</Label>
                                    <Input
                                        id="price"
                                        type="number"
                                        placeholder="Harga Produksi"
                                        value={formData.price}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                price: parseInt(e.target.value) || 0,
                                            })
                                        }
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="status">Status</Label>
                                    <Select
                                        id="status"
                                        value={formData.status}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                status: e.target.value as ProductStatus,
                                            })
                                        }
                                    >
                                        <option value="active">Aktif</option>
                                        <option value="inactive">Tidak Aktif</option>
                                    </Select>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="description">Deskripsi</Label>
                                <Textarea
                                    id="description"
                                    placeholder="Deskripsi Produk"
                                    value={formData.description}
                                    onChange={(e) =>
                                        setFormData({ ...formData, description: e.target.value })
                                    }
                                    rows={3}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="materials">Bahan</Label>
                                <Select
                                    id="materials"
                                    onChange={(e) => {
                                        if (e.target.value) {
                                            addMaterial(e.target.value)
                                            e.target.value = ""
                                        }
                                    }}
                                >
                                    <option value="">Pilih Bahan...</option>
                                    {materials.map((material) => (
                                        <option
                                            key={material.id}
                                            value={material.id}
                                            disabled={selectedMaterials.some(
                                                (m) => m.materialId === material.id
                                            )}
                                        >
                                            {material.name} ({material.code}) - Stock: {material.currentStock} {material.unit}
                                        </option>
                                    ))}
                                </Select>

                                {/* Selected Materials */}
                                {selectedMaterials.length > 0 && (
                                    <div className="mt-3 space-y-2">
                                        <Label className="text-sm text-muted-foreground">
                                            Bahan yang Dipilih:
                                        </Label>
                                        {selectedMaterials.map((item) => {
                                            const material = materials.find((m) => m.id === item.materialId)
                                            if (!material) return null
                                            return (
                                                <div
                                                    key={item.materialId}
                                                    className="flex items-center gap-2 p-2 bg-muted rounded-md"
                                                >
                                                    <div className="flex-1">
                                                        <p className="text-sm font-medium">{material.name}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {material.code}
                                                        </p>
                                                    </div>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => removeMaterial(item.materialId)}
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Color Variants Section */}
                            <div className="space-y-2 border-t pt-4">
                                <Label className="flex items-center gap-2">
                                    <Palette className="h-4 w-4" />
                                    Varian Warna
                                </Label>
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="Nama warna (cth: Putih)"
                                        value={newColorName}
                                        onChange={(e) => setNewColorName(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                                e.preventDefault()
                                                addColorVariant()
                                            }
                                        }}
                                        className="flex-1"
                                    />
                                    <Input
                                        placeholder="Kode (opsional)"
                                        value={newColorCode}
                                        onChange={(e) => setNewColorCode(e.target.value)}
                                        className="w-32"
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        onClick={addColorVariant}
                                    >
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                </div>
                                {colorVariants.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {colorVariants.map((variant) => (
                                            <Badge
                                                key={variant.colorName}
                                                variant="secondary"
                                                className="gap-1 pr-1"
                                            >
                                                {variant.colorName}
                                                {variant.colorCode && (
                                                    <span className="text-xs text-muted-foreground">
                                                        ({variant.colorCode})
                                                    </span>
                                                )}
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-4 w-4 ml-1 hover:bg-destructive/20"
                                                    onClick={() => removeColorVariant(variant.colorName)}
                                                >
                                                    <X className="h-3 w-3" />
                                                </Button>
                                            </Badge>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Size Variants Section */}
                            <div className="space-y-2 border-t pt-4">
                                <div className="flex items-center justify-between">
                                    <Label className="flex items-center gap-2">
                                        <Ruler className="h-4 w-4" />
                                        Varian Ukuran
                                    </Label>
                                    <Button
                                        type="button"
                                        variant="link"
                                        size="sm"
                                        className="text-xs"
                                        onClick={addPredefinedSizes}
                                    >
                                        + Tambah Ukuran Standar (XS-XXL)
                                    </Button>
                                </div>
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="Nama ukuran (cth: S, M, L atau All Size)"
                                        value={newSizeName}
                                        onChange={(e) => setNewSizeName(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                                e.preventDefault()
                                                addSizeVariant()
                                            }
                                        }}
                                        className="flex-1"
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        onClick={addSizeVariant}
                                    >
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                </div>
                                {sizeVariants.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {sizeVariants.map((variant) => (
                                            <Badge
                                                key={variant.sizeName}
                                                variant="outline"
                                                className="gap-1 pr-1"
                                            >
                                                {variant.sizeName}
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-4 w-4 ml-1 hover:bg-destructive/20"
                                                    onClick={() => removeSizeVariant(variant.sizeName)}
                                                >
                                                    <X className="h-3 w-3" />
                                                </Button>
                                            </Badge>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <Button type="submit" className="w-full" disabled={isSaving}>
                                {isSaving ? "Menyimpan..." : editingProduct ? "Perbarui Produk" : "Buat Produk"}
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex flex-col gap-4">
                        <div>
                            <CardTitle>Daftar Produk</CardTitle>
                            <CardDescription>
                                Kelola inventori produk Anda
                            </CardDescription>
                        </div>
                        <div className="relative w-full">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Cari produk..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0 sm:p-6">
                    {/* Mobile Card View */}
                    <div className="block sm:hidden">
                        {isLoading ? (
                            <div className="flex items-center justify-center py-12">
                                <SpinnerCustom />
                                <p className="text-muted-foreground">Memuat produk...</p>
                            </div>
                        ) : sortedProducts.length === 0 ? (
                            <div className="flex items-center justify-center py-12">
                                <p className="text-muted-foreground">Tidak ada produk ditemukan</p>
                            </div>
                        ) : (
                            <div className="space-y-3 p-4">
                                {sortedProducts.map((product) => (
                                    <Card key={product.id} className="border-2">
                                        <CardContent className="p-4">
                                            <div className="space-y-3">
                                                <div className="flex items-start justify-between">
                                                    <div className="flex-1">
                                                        <Link
                                                            href={`/owner/products/${product.id}`}
                                                            className="font-medium text-primary hover:underline block"
                                                        >
                                                            {product.name}
                                                        </Link>
                                                        <Link
                                                            href={`/owner/products/${product.id}`}
                                                            className="font-mono text-xs text-muted-foreground hover:underline"
                                                        >
                                                            {product.sku}
                                                        </Link>
                                                    </div>
                                                    <Badge variant={product.status === 'active' ? 'default' : 'secondary'}>
                                                        {product.status}
                                                    </Badge>
                                                </div>

                                                <div className="grid grid-cols-2 gap-2 text-sm">
                                                    <div>
                                                        <p className="text-xs text-muted-foreground">Harga</p>
                                                        <p className="font-medium">Rp {product.price.toLocaleString('id-ID')}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-muted-foreground">Stok</p>
                                                        <div className="flex items-center gap-1">
                                                            <Package className="h-3 w-3 text-muted-foreground" />
                                                            <span className="font-medium">{product.availableStock || 0} pcs</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {product.materials && product.materials.length > 0 && (
                                                    <p className="text-xs text-muted-foreground">
                                                        {product.materials.length} bahan
                                                    </p>
                                                )}

                                                <div className="flex gap-2 pt-2 border-t">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleEdit(product)}
                                                        className="flex-1"
                                                    >
                                                        <Edit className="h-3 w-3 mr-1" />
                                                        Edit
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleDeleteClick(product)}
                                                        className="flex-1"
                                                    >
                                                        <Trash2 className="h-3 w-3 mr-1 text-destructive" />
                                                        Hapus
                                                    </Button>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Desktop Table View */}
                    <div className="hidden sm:block">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleSort("sku")}
                                            className="flex items-center gap-1"
                                        >
                                            SKU
                                            <ArrowUpDown className="h-3 w-3" />
                                        </Button>
                                    </TableHead>
                                    <TableHead>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleSort("name")}
                                            className="flex items-center gap-1"
                                        >
                                            Nama
                                            <ArrowUpDown className="h-3 w-3" />
                                        </Button>
                                    </TableHead>
                                    <TableHead>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleSort("price")}
                                            className="flex items-center gap-1"
                                        >
                                            Harga
                                            <ArrowUpDown className="h-3 w-3" />
                                        </Button>
                                    </TableHead>
                                    <TableHead>Stok</TableHead>
                                    <TableHead>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleSort("status")}
                                            className="flex items-center gap-1"
                                        >
                                            Status
                                            <ArrowUpDown className="h-3 w-3" />
                                        </Button>
                                    </TableHead>
                                    <TableHead className="text-right">Aksi</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell
                                            colSpan={6}
                                            className="text-center text-muted-foreground h-24"
                                        >
                                            Memuat produk...
                                        </TableCell>
                                    </TableRow>
                                ) : sortedProducts.length === 0 ? (
                                    <TableRow>
                                        <TableCell
                                            colSpan={6}
                                            className="text-center text-muted-foreground h-24"
                                        >
                                            Tidak ada produk ditemukan
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    sortedProducts.map((product) => (
                                        <TableRow key={product.id}>
                                            <TableCell>
                                                <Link
                                                    href={`/owner/products/${product.id}`}
                                                    className="font-mono text-sm text-primary hover:underline"
                                                >
                                                    {product.sku}
                                                </Link>
                                            </TableCell>
                                            <TableCell>
                                                <div>
                                                    <Link
                                                        href={`/owner/products/${product.id}`}
                                                        className="text-primary hover:underline font-medium"
                                                    >
                                                        {product.name}
                                                    </Link>
                                                    {product.materials && product.materials.length > 0 && (
                                                        <div className="text-xs text-muted-foreground mt-1">
                                                            {product.materials.length} bahan
                                                        </div>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="font-medium">
                                                Rp {product.price.toLocaleString('id-ID')}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Package className="h-4 w-4 text-muted-foreground" />
                                                    <span className="font-medium">
                                                        {product.availableStock || 0}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground">pcs</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={product.status === 'active' ? 'default' : 'secondary'}>
                                                    {product.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleEdit(product)}
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleDeleteClick(product)}
                                                    >
                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 px-4 sm:px-0 pb-4 sm:pb-0">
                        <div className="text-sm text-muted-foreground">
                            Halaman {currentPage} dari {Math.max(1, Math.ceil(sortedProducts.length / 10))}
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage(currentPage - 1)}
                            >
                                Sebelumnya
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={
                                    currentPage >=
                                    Math.max(1, Math.ceil(sortedProducts.length / 10))
                                }
                                onClick={() => setCurrentPage(currentPage + 1)}
                            >
                                Berikutnya
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent >
                    <AlertDialogHeader>
                        <AlertDialogTitle>Apakah Anda yakin?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Ini akan menghapus produk <strong>{deletingProduct?.name}</strong> secara permanen.
                            {deletingProduct?.materials && deletingProduct.materials.length > 0 && (
                                <span className="block mt-2 text-muted-foreground">
                                    Catatan: Produk ini memiliki {deletingProduct.materials.length} bahan terkait.
                                </span>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Batal</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {isDeleting ? "Menghapus..." : "Hapus"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
