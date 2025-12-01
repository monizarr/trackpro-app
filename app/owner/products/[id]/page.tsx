"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, Edit, Plus, Search, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

// Types
type ProductionStatus = "in_progress" | "completed" | "cancelled";

interface Production {
    id: number;
    batch_code: string;
    created_date: string;
    finish_date: string;
    target: number;
    status: ProductionStatus;
}

// Mock data for product detail
const productData = {
    1: {
        id: 1,
        name: "Test Product",
        description: "This is a test product",
        image: "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=500",
        price: 90000,
        status: "active",
        sku: "TEST-PRODUCT-001",
        productions: [
            {
                id: 1,
                batch_code: "GAMIS-001",
                created_date: "1 Desember 2025 pukul 14.54",
                finish_date: "-",
                target: 100,
                status: "in_progress" as ProductionStatus,
            },
        ],
    },
    2: {
        id: 2,
        name: "Sample Gamis",
        description: "High quality gamis product",
        image: "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=500",
        price: 150000,
        status: "active",
        sku: "GAMIS-001",
        productions: [
            {
                id: 1,
                batch_code: "GAMIS-002",
                created_date: "15 November 2025 pukul 10.30",
                finish_date: "20 November 2025",
                target: 50,
                status: "completed" as ProductionStatus,
            },
        ],
    },
    3: {
        id: 3,
        name: "Premium Jilbab",
        description: "Premium jilbab with high quality materials",
        image: "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=500",
        price: 75000,
        status: "active",
        sku: "JILBAB-001",
        productions: [],
    },
};

export default function ProductDetailPage() {
    const params = useParams();
    const productId = Number(params.id);
    const product = productData[productId as keyof typeof productData];

    const [productions, setProductions] = useState<Production[]>(product?.productions || []);
    const [searchQuery, setSearchQuery] = useState("");
    const [sortField, setSortField] = useState<keyof Production | null>(null);
    const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [newProduction, setNewProduction] = useState({
        batch_code: "",
        target: 0,
        notes: "",
    });

    if (!product) {
        return (
            <div className="p-6">
                <div className="text-center">
                    <h1 className="text-2xl font-bold mb-4">Produk tidak ditemukan</h1>
                    <Link href="/owner/products">
                        <Button variant="outline">
                            <ChevronLeft className="h-4 w-4 mr-2" />
                            Kembali ke Daftar Produk
                        </Button>
                    </Link>
                </div>
            </div>
        );
    }

    const handleSort = (field: keyof Production) => {
        if (sortField === field) {
            setSortDirection(sortDirection === "asc" ? "desc" : "asc");
        } else {
            setSortField(field);
            setSortDirection("asc");
        }
    };

    const handleAddProduction = () => {
        const production: Production = {
            id: productions.length + 1,
            batch_code: newProduction.batch_code,
            created_date: new Date().toLocaleDateString("id-ID", {
                day: "numeric",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
            }),
            finish_date: "-",
            target: newProduction.target,
            status: "in_progress",
        };

        setProductions([...productions, production]);
        setIsAddDialogOpen(false);
        setNewProduction({ batch_code: "", target: 0, notes: "" });
    };

    const filteredProductions = productions.filter((production) =>
        production.batch_code.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const sortedProductions = [...filteredProductions].sort((a, b) => {
        if (!sortField) return 0;

        const aValue = a[sortField];
        const bValue = b[sortField];

        if (typeof aValue === "string" && typeof bValue === "string") {
            return sortDirection === "asc"
                ? aValue.localeCompare(bValue)
                : bValue.localeCompare(aValue);
        }

        if (typeof aValue === "number" && typeof bValue === "number") {
            return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
        }

        return 0;
    });

    const getStatusBadge = (status: string) => {
        const statusMap = {
            active: { label: "active", className: "bg-green-100 text-green-700 border-green-300" },
            inactive: { label: "inactive", className: "bg-gray-100 text-gray-700 border-gray-300" },
            in_progress: { label: "in_progress", className: "bg-blue-100 text-blue-700 border-blue-300" },
            completed: { label: "completed", className: "bg-green-100 text-green-700 border-green-300" },
            cancelled: { label: "cancelled", className: "bg-red-100 text-red-700 border-red-300" },
        };

        const statusInfo = statusMap[status as keyof typeof statusMap] || statusMap.active;
        return (
            <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border ${statusInfo.className}`}>
                {statusInfo.label}
            </span>
        );
    };

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat("id-ID", {
            style: "currency",
            currency: "IDR",
            minimumFractionDigits: 0,
        }).format(price);
    };

    return (
        <div className="p-6">
            {/* Breadcrumb */}
            <div className="mb-6">
                <Link href="/owner/products" className="text-sm text-gray-600 hover:text-gray-900 flex items-center">
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Produk
                </Link>
            </div>

            {/* Product Info Card */}
            <div className="bg-white rounded-lg border p-6 mb-6">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h1 className="text-2xl font-bold">{product.name}</h1>
                        <p className="text-sm text-gray-600">{product.description}</p>
                    </div>
                    <Button variant="ghost" size="icon">
                        <Edit className="h-4 w-4" />
                    </Button>
                </div>

                {/* Product Image */}
                <div className="mb-4 relative w-full max-w-md mx-auto aspect-3/4">
                    <Image
                        src={product.image}
                        alt={product.name}
                        fill
                        className="rounded-lg object-cover"
                    />
                </div>

                {/* Product Details */}
                <div className="grid grid-cols-2 gap-4 border-t pt-4">
                    <div>
                        <span className="text-sm text-gray-600">Harga</span>
                        <p className="text-xl font-semibold">{formatPrice(product.price)}</p>
                    </div>
                    <div>
                        <span className="text-sm text-gray-600">Status</span>
                        <div className="mt-1">{getStatusBadge(product.status)}</div>
                    </div>
                </div>

                <div className="mt-4 pt-4 border-t text-center">
                    <span className="text-sm text-gray-600">SKU: </span>
                    <span className="font-mono text-sm font-medium text-blue-600">{product.sku}</span>
                </div>
            </div>

            {/* Production Section */}
            <div className="bg-white rounded-lg border">
                <div className="p-6 border-b">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold">Daftar Produksi</h2>
                        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                            <DialogTrigger asChild>
                                <Button>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Tambah Produksi
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Tambah Produksi Baru</DialogTitle>
                                    <DialogDescription>
                                        Buat batch produksi baru untuk produk ini
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="batch_code">Kode Batch</Label>
                                        <Input
                                            id="batch_code"
                                            placeholder="Masukkan kode batch"
                                            value={newProduction.batch_code}
                                            onChange={(e) => setNewProduction({ ...newProduction, batch_code: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="target">Target (PCS)</Label>
                                        <Input
                                            id="target"
                                            type="number"
                                            placeholder="Masukkan target produksi"
                                            value={newProduction.target || ""}
                                            onChange={(e) => setNewProduction({ ...newProduction, target: Number(e.target.value) })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="notes">Catatan</Label>
                                        <Textarea
                                            id="notes"
                                            placeholder="Catatan tambahan (opsional)"
                                            value={newProduction.notes}
                                            onChange={(e) => setNewProduction({ ...newProduction, notes: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="flex justify-end gap-2">
                                    <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                                        Batal
                                    </Button>
                                    <Button onClick={handleAddProduction}>
                                        Simpan
                                    </Button>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>

                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            placeholder="Cari produksi..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                </div>

                {/* Production Table */}
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead
                                    className="cursor-pointer hover:bg-gray-50"
                                    onClick={() => handleSort("batch_code")}
                                >
                                    <div className="flex items-center">
                                        Kode Batch
                                        <ChevronsUpDown className="ml-2 h-4 w-4" />
                                    </div>
                                </TableHead>
                                <TableHead
                                    className="cursor-pointer hover:bg-gray-50"
                                    onClick={() => handleSort("created_date")}
                                >
                                    <div className="flex items-center">
                                        Tanggal Dibuat
                                        <ChevronsUpDown className="ml-2 h-4 w-4" />
                                    </div>
                                </TableHead>
                                <TableHead>Tanggal Selesai</TableHead>
                                <TableHead
                                    className="cursor-pointer hover:bg-gray-50"
                                    onClick={() => handleSort("target")}
                                >
                                    <div className="flex items-center">
                                        Target (PCS)
                                        <ChevronsUpDown className="ml-2 h-4 w-4" />
                                    </div>
                                </TableHead>
                                <TableHead
                                    className="cursor-pointer hover:bg-gray-50"
                                    onClick={() => handleSort("status")}
                                >
                                    <div className="flex items-center">
                                        Status
                                        <ChevronsUpDown className="ml-2 h-4 w-4" />
                                    </div>
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sortedProductions.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                                        Belum ada data produksi
                                    </TableCell>
                                </TableRow>
                            ) : (
                                sortedProductions.map((production) => (
                                    <TableRow key={production.id}>
                                        <TableCell className="font-medium">{production.batch_code}</TableCell>
                                        <TableCell>{production.created_date}</TableCell>
                                        <TableCell>{production.finish_date}</TableCell>
                                        <TableCell>{production.target}</TableCell>
                                        <TableCell>{getStatusBadge(production.status)}</TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Pagination */}
                <div className="p-4 border-t flex justify-between items-center">
                    <p className="text-sm text-gray-600">
                        Halaman 1 dari 1
                    </p>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" disabled>
                            Previous
                        </Button>
                        <Button variant="outline" size="sm" disabled>
                            Next
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
