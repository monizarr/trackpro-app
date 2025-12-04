"use client"

import { useState, useEffect } from "react"
import { Search, Plus, ArrowUpDown, Package, X, Edit, Trash2 } from "lucide-react"
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

    // Fetch products
    useEffect(() => {
        fetchProducts()
    }, [])

    // Fetch materials when dialog opens
    useEffect(() => {
        if (isDialogOpen && materials.length === 0) {
            fetchMaterials()
        }
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
                }),
            })

            const data = await response.json()

            if (data.success) {
                await fetchProducts()
                setIsDialogOpen(false)
                resetForm()
            } else {
                alert(data.error || `Failed to ${editingProduct ? 'update' : 'create'} product`)
            }
        } catch (error) {
            console.error(`Error ${editingProduct ? 'updating' : 'creating'} product:`, error)
            alert(`Failed to ${editingProduct ? 'update' : 'create'} product`)
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
        setEditingProduct(null)
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
            } else {
                alert(data.error || "Failed to delete product")
            }
        } catch (error) {
            console.error("Error deleting product:", error)
            alert("Failed to delete product")
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
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Products</h2>
                    <p className="text-muted-foreground">
                        Manage your product catalog
                    </p>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={(open) => {
                    setIsDialogOpen(open)
                    if (!open) resetForm()
                }}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Product
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl bg-white p-6 rounded-lg shadow-lg">
                        <DialogHeader>
                            <DialogTitle>{editingProduct ? 'Edit Product' : 'Create Product'}</DialogTitle>
                            <DialogDescription>
                                {editingProduct ? 'Update product information' : 'Add a new product to your catalog.'}
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
                                    <Label htmlFor="name">Name</Label>
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
                                    <Label htmlFor="price">Harga</Label>
                                    <Input
                                        id="price"
                                        type="number"
                                        placeholder="Harga Produk"
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
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                    </Select>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="description">Description</Label>
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
                                <Label htmlFor="materials">Materials</Label>
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
                                                    <Input
                                                        type="number"
                                                        min="0.01"
                                                        step="0.01"
                                                        value={item.quantity}
                                                        onChange={(e) =>
                                                            updateMaterialQuantity(
                                                                item.materialId,
                                                                parseFloat(e.target.value) || 0
                                                            )
                                                        }
                                                        className="w-24"
                                                        placeholder="Qty"
                                                    />
                                                    <span className="text-xs text-muted-foreground">
                                                        {material.unit}
                                                    </span>
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
                            <Button type="submit" className="w-full" disabled={isSaving}>
                                {isSaving ? "Saving..." : editingProduct ? "Update Product" : "Create Product"}
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Product List</CardTitle>
                            <CardDescription>
                                Manage your product inventory
                            </CardDescription>
                        </div>
                        <div className="relative w-72">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search products..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
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
                                        Name
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
                                        Price
                                        <ArrowUpDown className="h-3 w-3" />
                                    </Button>
                                </TableHead>
                                <TableHead>Stock</TableHead>
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
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={6}
                                        className="text-center text-muted-foreground h-24"
                                    >
                                        Loading products...
                                    </TableCell>
                                </TableRow>
                            ) : sortedProducts.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={6}
                                        className="text-center text-muted-foreground h-24"
                                    >
                                        No products found
                                    </TableCell>
                                </TableRow>
                            ) : (
                                sortedProducts.map((product) => (
                                    <TableRow key={product.id}>
                                        <TableCell>
                                            <a
                                                href={`/owner/products/${product.id}`}
                                                className="font-mono text-sm text-primary hover:underline"
                                            >
                                                {product.sku}
                                            </a>
                                        </TableCell>
                                        <TableCell>
                                            <div>
                                                <a
                                                    href={`/owner/products/${product.id}`}
                                                    className="text-primary hover:underline font-medium"
                                                >
                                                    {product.name}
                                                </a>
                                                {product.materials && product.materials.length > 0 && (
                                                    <div className="text-xs text-muted-foreground mt-1">
                                                        {product.materials.length} materials
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
                                                    variant="ghost"
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

                    <div className="flex items-center justify-between mt-4">
                        <div className="text-sm text-muted-foreground">
                            Page {currentPage} of {Math.max(1, Math.ceil(sortedProducts.length / 10))}
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage(currentPage - 1)}
                            >
                                Previous
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
                                Next
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the product <strong>{deletingProduct?.name}</strong>.
                            {deletingProduct?.materials && deletingProduct.materials.length > 0 && (
                                <span className="block mt-2 text-muted-foreground">
                                    Note: This product has {deletingProduct.materials.length} associated material(s).
                                </span>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {isDeleting ? "Deleting..." : "Delete"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
