"use client"

import { useState } from "react"
import { Search, Plus, ArrowUpDown, Copy, Package } from "lucide-react"
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

type ProductStatus = "active" | "inactive"

interface Product {
    id: number
    sku: string
    name: string
    price: number
    description: string
    materials: string
    status: ProductStatus
}

export default function ProductsPage() {
    const [products, setProducts] = useState<Product[]>([
        {
            id: 1,
            sku: "TEST-PRODUCT-001",
            name: "Test Product",
            price: 90000,
            description: "Test description",
            materials: "Test materials",
            status: "active",
        },
        {
            id: 2,
            sku: "TEST-PRODUCT-002",
            name: "Test Product 2",
            price: 80000,
            description: "Test description 2",
            materials: "Test materials 2",
            status: "active",
        },
        {
            id: 3,
            sku: "TEST-PRODUCT-003",
            name: "Test Product 3",
            price: 70000,
            description: "Test description 3",
            materials: "Test materials 3",
            status: "active",
        },
    ])
    const [searchQuery, setSearchQuery] = useState("")
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [currentPage, setCurrentPage] = useState(1)
    const [sortConfig, setSortConfig] = useState<{
        key: keyof Product
        direction: "asc" | "desc"
    } | null>(null)

    // Form state
    const [formData, setFormData] = useState({
        sku: "SKU123",
        name: "Produk A",
        price: 10000,
        description: "Deskripsi produk A",
        materials: "Bahan produk A",
        status: "active" as ProductStatus,
    })

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        const newProduct: Product = {
            id: products.length + 1,
            ...formData,
        }
        setProducts([...products, newProduct])
        setIsDialogOpen(false)
        setFormData({
            sku: "SKU123",
            name: "Produk A",
            price: 10000,
            description: "Deskripsi produk A",
            materials: "Bahan produk A",
            status: "active",
        })
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

    const copySKU = (sku: string) => {
        navigator.clipboard.writeText(sku)
        // You could add a toast notification here
    }

    const filteredProducts = products.filter((product) =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const sortedProducts = [...filteredProducts].sort((a, b) => {
        if (!sortConfig) return 0

        const aValue = a[sortConfig.key]
        const bValue = b[sortConfig.key]

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
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Product
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>Create Product</DialogTitle>
                            <DialogDescription>
                                Add a new product to your catalog.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="sku">SKU</Label>
                                    <Input
                                        id="sku"
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
                                    value={formData.description}
                                    onChange={(e) =>
                                        setFormData({ ...formData, description: e.target.value })
                                    }
                                    rows={3}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="materials">Materials</Label>
                                <Input
                                    id="materials"
                                    value={formData.materials}
                                    onChange={(e) =>
                                        setFormData({ ...formData, materials: e.target.value })
                                    }
                                />
                            </div>
                            <Button type="submit" className="w-full">
                                Save Product
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
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sortedProducts.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={4}
                                        className="text-center text-muted-foreground h-24"
                                    >
                                        No products found
                                    </TableCell>
                                </TableRow>
                            ) : (
                                sortedProducts.map((product) => (
                                    <TableRow key={product.id}>
                                        <TableCell>
                                            <button
                                                onClick={() => copySKU(product.sku)}
                                                className="flex items-center gap-2 hover:text-primary transition-colors"
                                                title="Click to copy SKU"
                                            >
                                                <span className="font-mono text-sm">{product.sku}</span>
                                                <Copy className="h-3 w-3" />
                                            </button>
                                        </TableCell>
                                        <TableCell>
                                            <a
                                                href={`/owner/products/${product.id}`}
                                                className="text-primary hover:underline font-medium"
                                            >
                                                {product.name}
                                            </a>
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            Rp {product.price.toLocaleString('id-ID')}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={product.status === 'active' ? 'default' : 'secondary'}>
                                                {product.status}
                                            </Badge>
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
        </div>
    )
}
