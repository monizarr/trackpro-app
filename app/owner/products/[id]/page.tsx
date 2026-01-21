"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
    ChevronLeft,
    Edit,
    Plus,
    Search,
    ChevronsUpDown,
    Package,
    Trash2,
    X,
    CheckCircle2,
    Target,
    TrendingUp,
    ExternalLink,
} from "lucide-react";
import { toast } from "@/lib/toast";
import { CreateBatchDialog } from "@/components/create-batch-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { SpinnerCustom } from "@/components/ui/spinner";

// Types
type ProductionStatus = "PENDING" | "MATERIAL_REQUESTED" | "MATERIAL_ALLOCATED" | "ASSIGNED_TO_CUTTER" | "IN_CUTTING" | "CUTTING_COMPLETED" | "CUTTING_VERIFIED" | "IN_SEWING" | "SEWING_COMPLETED" | "SEWING_VERIFIED" | "IN_FINISHING" | "FINISHING_COMPLETED" | "WAREHOUSE_VERIFIED" | "COMPLETED" | "CANCELLED";
type ProductStatus = "ACTIVE" | "INACTIVE" | "DISCONTINUED";

interface Material {
    id: string;
    code: string;
    name: string;
    unit: string;
    currentStock?: number;
}

interface MaterialColorVariant {
    id: string;
    materialId: string;
    colorName: string;
    colorCode?: string;
    stock: number;
    minimumStock: number;
    material: Material;
}

interface MaterialColorAllocation {
    id: string;
    materialColorVariantId: string;
    rollQuantity: number;
    allocatedQty: number;
    meterPerRoll: number;
    materialColorVariant: MaterialColorVariant;
}

interface ProductMaterial {
    id: string;
    quantity: number;
    unit: string;
    material: Material;
}

interface ProductMaterialInput {
    materialId: string;
    quantity: number;
}

interface ProductionBatch {
    id: string;
    batchSku: string;
    totalRolls: number;
    actualQuantity: number | null;
    rejectQuantity: number;
    status: ProductionStatus;
    startDate?: string;
    completedDate: string | null;
    notes: string | null;
    createdAt: string;
    createdBy?: {
        name: string;
    };
    materialColorAllocations?: MaterialColorAllocation[];
    sizeColorRequests?: Array<{
        id: string;
        productSize: string;
        color: string;
        requestedPieces: number;
    }>;
    cuttingResults?: Array<{
        id: string;
        productSize: string;
        color: string;
        actualPieces: number;
        isConfirmed: boolean;
        confirmedBy?: {
            name: string;
            role: string;
        };
    }>;
}

interface Product {
    id: string;
    sku: string;
    name: string;
    description: string | null;
    price: number;
    status: ProductStatus;
    images: string[];
    materials: ProductMaterial[];
    productionBatches: ProductionBatch[];
}

export default function ProductDetailPage() {
    const params = useParams();
    const productId = params.id as string;

    const [product, setProduct] = useState<Product | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [sortField, setSortField] = useState<keyof ProductionBatch | null>(null);
    const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

    // Delete batch states
    const [isDeleteBatchDialogOpen, setIsDeleteBatchDialogOpen] = useState(false);
    const [batchToDelete, setBatchToDelete] = useState<ProductionBatch | null>(null);
    const [isDeletingBatch, setIsDeletingBatch] = useState(false);

    // Edit and Delete states
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [materials, setMaterials] = useState<Material[]>([]);
    const [formData, setFormData] = useState({
        sku: "",
        name: "",
        price: 0,
        description: "",
        status: "ACTIVE" as ProductStatus,
    });
    const [selectedMaterials, setSelectedMaterials] = useState<ProductMaterialInput[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        fetchProduct();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [productId]);

    useEffect(() => {
        if (isEditDialogOpen && materials.length === 0) {
            fetchMaterials();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isEditDialogOpen]);

    const fetchProduct = async () => {
        try {
            setIsLoading(true);
            const response = await fetch(`/api/products/${productId}`);
            const data = await response.json();

            if (data.success) {
                setProduct(data.data);
            } else {
                setProduct(null);
            }
        } catch (error) {
            console.error("Error fetching product:", error);
            setProduct(null);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchMaterials = async () => {
        try {
            const response = await fetch("/api/materials");
            const data = await response.json();
            if (data.success) {
                setMaterials(data.data);
            }
        } catch (error) {
            console.error("Error fetching materials:", error);
        }
    };

    const handleEdit = () => {
        if (!product) return;

        setFormData({
            sku: product.sku,
            name: product.name,
            price: Number(product.price),
            description: product.description || "",
            status: product.status,
        });

        setSelectedMaterials(
            product.materials.map((m) => ({
                materialId: m.material.id,
                quantity: m.quantity,
            }))
        );

        setIsEditDialogOpen(true);
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!product) return;

        setIsSaving(true);
        try {
            const response = await fetch(`/api/products/${product.id}`, {
                method: "PATCH",
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
            });

            const data = await response.json();

            if (data.success) {
                await fetchProduct();
                setIsEditDialogOpen(false);
                toast.success("Produk Diperbarui", `${formData.name} berhasil diperbarui`);
            } else {
                toast.error("Gagal Memperbarui", data.error || "Tidak dapat memperbarui produk");
            }
        } catch (error) {
            console.error("Error updating product:", error);
            toast.error("Error", "Gagal memperbarui produk");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteClick = () => {
        setIsDeleteDialogOpen(true);
    };

    const handleDelete = async () => {
        if (!product) return;

        setIsDeleting(true);
        try {
            const response = await fetch(`/api/products/${product.id}`, {
                method: "DELETE",
            });

            const data = await response.json();

            if (data.success) {
                toast.success("Produk Dihapus", "Mengarahkan kembali...");
                // Redirect to products list after successful deletion
                window.location.href = "/owner/products";
            } else {
                toast.error("Gagal Menghapus", data.error || "Tidak dapat menghapus produk");
            }
        } catch (error) {
            console.error("Error deleting product:", error);
            toast.error("Error", "Gagal menghapus produk");
        } finally {
            setIsDeleting(false);
            setIsDeleteDialogOpen(false);
        }
    };

    const addMaterial = (materialId: string) => {
        if (!selectedMaterials.find((m) => m.materialId === materialId)) {
            setSelectedMaterials([...selectedMaterials, { materialId, quantity: 1 }]);
        }
    };

    const removeMaterial = (materialId: string) => {
        setSelectedMaterials(selectedMaterials.filter((m) => m.materialId !== materialId));
    };

    const updateMaterialQuantity = (materialId: string, quantity: number) => {
        setSelectedMaterials(
            selectedMaterials.map((m) =>
                m.materialId === materialId ? { ...m, quantity } : m
            )
        );
    };


    const handleDeleteBatchClick = (batch: ProductionBatch) => {
        setBatchToDelete(batch);
        setIsDeleteBatchDialogOpen(true);
    };

    const handleDeleteBatch = async () => {
        if (!batchToDelete) return;

        setIsDeletingBatch(true);
        try {
            const response = await fetch(`/api/production-batches/${batchToDelete.id}`, {
                method: "DELETE",
            });

            const data = await response.json();

            if (data.success) {
                await fetchProduct();
                setIsDeleteBatchDialogOpen(false);
                setBatchToDelete(null);
                toast.success("Batch Dihapus", "Batch produksi berhasil dihapus");
            } else {
                toast.error("Gagal Menghapus", data.error || "Tidak dapat menghapus batch");
            }
        } catch (error) {
            console.error("Error deleting batch:", error);
            toast.error("Error", "Gagal menghapus batch");
        } finally {
            setIsDeletingBatch(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex-1 space-y-4 p-8 pt-6">
                <div className="text-center py-12">
                    <SpinnerCustom />
                    <p className="mt-4 text-lg text-muted-foreground">Loading product...</p>
                </div>
            </div>
        );
    }

    if (!product) {
        return (
            <div className="flex-1 space-y-4 p-8 pt-6">
                <div className="text-center py-12">
                    <h1 className="text-2xl font-bold mb-4">Produk tidak ditemukan</h1>
                    <p className="text-muted-foreground mb-6">
                        Produk yang Anda cari tidak ada atau telah dihapus.
                    </p>
                    <Link href="/owner/products">
                        <Button>
                            <ChevronLeft className="h-4 w-4 mr-2" />
                            Kembali ke Daftar Produk
                        </Button>
                    </Link>
                </div>
            </div>
        );
    }

    const handleSort = (field: keyof ProductionBatch) => {
        if (sortField === field) {
            setSortDirection(sortDirection === "asc" ? "desc" : "asc");
        } else {
            setSortField(field);
            setSortDirection("asc");
        }
    };

    // const handleAddProduction = async () => {
    //     if (!newProduction.totalRolls || newProduction.totalRolls <= 0) {
    //         toast.warning("Total Rolls Invalid", "Masukkan jumlah roll yang valid");
    //         return;
    //     }

    //     try {
    //         setIsSaving(true);

    //         const response = await fetch("/api/production-batches", {
    //             method: "POST",
    //             headers: {
    //                 "Content-Type": "application/json",
    //             },
    //             body: JSON.stringify({
    //                 productId: product.id,
    //                 totalRolls: newProduction.totalRolls,
    //                 notes: newProduction.notes,
    //             }),
    //         });

    //         const data = await response.json();

    //         if (data.success) {
    //             // Refresh product data to get updated batches
    //             await fetchProduct();
    //             setIsAddDialogOpen(false);
    //             setNewProduction({ totalRolls: 0, notes: "" });
    //             toast.success("Batch Dibuat", `Batch produksi ${data.data.batchSku} berhasil dibuat`);
    //         } else {
    //             toast.error("Gagal Membuat Batch", data.error || "Tidak dapat membuat batch produksi");
    //         }
    //     } catch (error) {
    //         console.error("Error creating production batch:", error);
    //         toast.error("Error", "Gagal membuat batch produksi");
    //     } finally {
    //         setIsSaving(false);
    //     }
    // };

    const filteredProductions = product.productionBatches.filter((batch) =>
        batch.batchSku.toLowerCase().includes(searchQuery.toLowerCase())
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

    const getStatusBadge = (status: ProductionStatus) => {
        const statusMap = {
            PENDING: { label: "Menunggu", variant: "secondary" as const },
            MATERIAL_REQUESTED: { label: "Material Diminta", variant: "secondary" as const },
            MATERIAL_ALLOCATED: { label: "Material Dialokasi", variant: "default" as const },
            ASSIGNED_TO_CUTTER: { label: "Di-assign ke Pemotong", variant: "default" as const },
            IN_CUTTING: { label: "Proses Pemotongan", variant: "default" as const },
            CUTTING_COMPLETED: { label: "Pemotongan Selesai", variant: "default" as const },
            CUTTING_VERIFIED: { label: "Potongan Terverifikasi", variant: "default" as const },
            ASSIGNED_TO_SEWER: { label: "Di-assign ke Penjahit", variant: "default" as const },
            IN_SEWING: { label: "Proses Penjahitan", variant: "default" as const },
            SEWING_COMPLETED: { label: "Penjahitan Selesai", variant: "default" as const },
            SEWING_VERIFIED: { label: "Jahitan Terverifikasi", variant: "default" as const },
            IN_FINISHING: { label: "Proses Finishing", variant: "default" as const },
            FINISHING_COMPLETED: { label: "Finishing Selesai", variant: "default" as const },
            WAREHOUSE_VERIFIED: { label: "Terverifikasi Gudang", variant: "default" as const },
            COMPLETED: { label: "Selesai", variant: "default" as const },
            CANCELLED: { label: "Dibatalkan", variant: "destructive" as const },
        };

        const statusInfo = statusMap[status] || statusMap.PENDING;
        return (
            <Badge variant={statusInfo.variant}>
                {statusInfo.label}
            </Badge>
        );
    };

    const getCurrentStage = (status: ProductionStatus) => {
        if (["PENDING", "MATERIAL_REQUESTED", "MATERIAL_ALLOCATED"].includes(status)) return "Persiapan";
        if (["ASSIGNED_TO_CUTTER", "IN_CUTTING", "CUTTING_COMPLETED", "CUTTING_VERIFIED"].includes(status)) return "Pemotongan";
        if (["ASSIGNED_TO_SEWER", "IN_SEWING", "SEWING_COMPLETED", "SEWING_VERIFIED"].includes(status)) return "Penjahitan";
        if (["IN_FINISHING", "FINISHING_COMPLETED"].includes(status)) return "Finishing";
        if (status === "WAREHOUSE_VERIFIED") return "Gudang";
        if (status === "COMPLETED") return "Selesai";
        if (status === "CANCELLED") return "Dibatalkan";
        return status;
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
    };

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat("id-ID", {
            style: "currency",
            currency: "IDR",
            minimumFractionDigits: 0,
        }).format(price);
    };

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            {/* Header with Breadcrumb */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="space-y-1">
                    <Link href="/owner/products" className="text-sm text-muted-foreground hover:text-foreground flex items-center mb-2">
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Kembali ke Products
                    </Link>
                    <h2 className="text-3xl font-bold tracking-tight">{product.name}</h2>
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-mono">{product.sku}</Badge>
                        <Badge variant={product.status === "ACTIVE" ? "default" : "secondary"}>
                            {product.status}
                        </Badge>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleEdit}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Product
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleDeleteClick}>
                        <Trash2 className="h-4 w-4 mr-2 text-destructive" />
                        Delete
                    </Button>
                </div>
            </div>

            {/* Overview Stats */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Batches</CardTitle>
                        <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{product.productionBatches.length}</div>
                        <p className="text-xs text-muted-foreground">Production batches</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Rolls</CardTitle>
                        <Target className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {product.productionBatches.reduce((sum, b) => sum + b.totalRolls, 0)}
                        </div>
                        <p className="text-xs text-muted-foreground">Total roll bahan</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Actual Production</CardTitle>
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                            {product.productionBatches.reduce((sum, b) => sum + (b.actualQuantity || 0), 0)}
                        </div>
                        <p className="text-xs text-muted-foreground">Total pieces produced</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Batches</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {product.productionBatches.filter(b => !["COMPLETED", "CANCELLED", "WAREHOUSE_VERIFIED"].includes(b.status)).length}
                        </div>
                        <p className="text-xs text-muted-foreground">In production</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 grid-cols-1 lg:grid-cols-7">
                {/* Production Section */}
                <Card className="lg:col-span-4">
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <div>
                                <CardTitle>Production Batches</CardTitle>
                                <CardDescription>
                                    Manage production batches for this product
                                </CardDescription>
                            </div>
                            <Button onClick={() => setIsAddDialogOpen(true)}>
                                <Plus className="h-4 w-4 mr-2" />
                                Add Production
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Search */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search production..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10"
                            />
                        </div>

                        {/* Production Table */}
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead
                                            className="cursor-pointer hover:bg-muted"
                                            onClick={() => handleSort("batchSku")}
                                        >
                                            <div className="flex items-center">
                                                Batch Code
                                                <ChevronsUpDown className="ml-2 h-4 w-4" />
                                            </div>
                                        </TableHead>
                                        <TableHead
                                            className="cursor-pointer hover:bg-muted"
                                            onClick={() => handleSort("createdAt")}
                                        >
                                            <div className="flex items-center">
                                                Created Date
                                                <ChevronsUpDown className="ml-2 h-4 w-4" />
                                            </div>
                                        </TableHead>
                                        <TableHead>Rolls / Pieces</TableHead>
                                        <TableHead>Tahap</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {sortedProductions.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                                                <div className="flex flex-col items-center gap-2">
                                                    <Package className="h-8 w-8 text-muted-foreground/50" />
                                                    <p>Belum ada batch produksi</p>
                                                    <p className="text-xs">Klik tombol Add Production untuk membuat batch baru</p>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        sortedProductions.map((batch) => (
                                            <TableRow key={batch.id}>
                                                <TableCell className="font-medium">
                                                    <Link
                                                        href={`/owner/production-batches/${batch.id}`}
                                                        className="text-primary hover:underline flex items-center gap-1 font-mono"
                                                    >
                                                        {batch.batchSku}
                                                        <ExternalLink className="h-3 w-3" />
                                                    </Link>
                                                </TableCell>
                                                <TableCell className="text-sm">
                                                    {formatDate(batch.createdAt)}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <span className="font-medium">{batch.totalRolls} roll</span>
                                                        {(batch.actualQuantity !== null && batch.actualQuantity > 0) && (
                                                            <span className="text-xs text-muted-foreground">
                                                                → {batch.actualQuantity} pcs
                                                            </span>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="secondary">{getCurrentStage(batch.status)}</Badge>
                                                </TableCell>
                                                <TableCell>{getStatusBadge(batch.status)}</TableCell>
                                                <TableCell className="text-right">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDeleteBatchClick(batch);
                                                        }}
                                                        disabled={!['PENDING', 'MATERIAL_REQUESTED', 'MATERIAL_ALLOCATED'].includes(batch.status)}
                                                        title={!['PENDING', 'MATERIAL_REQUESTED', 'MATERIAL_ALLOCATED'].includes(batch.status) ? 'Only batches not yet in production can be deleted' : 'Delete batch'}
                                                    >
                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>

                        {/* Pagination */}
                        {sortedProductions.length > 0 && (
                            <div className="flex justify-between items-center">
                                <p className="text-sm text-muted-foreground">
                                    Showing {sortedProductions.length} batch{sortedProductions.length > 1 ? 'es' : ''}
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
                        )}
                    </CardContent>
                </Card>

                {/* Product Info Card */}
                <Card className="lg:col-span-3">
                    <CardHeader>
                        <div className="flex justify-between items-start">
                            <div className="space-y-1">
                                <CardTitle>{product.name}</CardTitle>
                                <CardDescription>{product.description}</CardDescription>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="ghost" size="icon" onClick={handleEdit}>
                                    <Edit className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={handleDeleteClick}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Product Image */}
                        {product.images && product.images.length > 0 ? (
                            <div className="relative w-full aspect-3/4">
                                <Image
                                    src={product.images[0]}
                                    alt={product.name}
                                    fill
                                    className="rounded-lg object-cover"
                                />
                            </div>
                        ) : (
                            <div className="relative w-full aspect-3/4 bg-muted rounded-lg flex items-center justify-center">
                                <p className="text-muted-foreground">No image</p>
                            </div>
                        )}

                        <Separator />

                        {/* Product Details */}
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-medium text-muted-foreground">Price</span>
                                <span className="text-xl font-bold">{formatPrice(Number(product.price))}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-medium text-muted-foreground">Status</span>
                                <Badge variant={product.status === 'ACTIVE' ? 'default' : 'secondary'}>
                                    {product.status}
                                </Badge>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-medium text-muted-foreground">SKU</span>
                                <span className="font-mono text-sm font-medium">{product.sku}</span>
                            </div>
                            {product.materials && product.materials.length > 0 && (
                                <div className="space-y-2">
                                    <Separator />
                                    <div>
                                        <span className="text-sm font-medium text-muted-foreground block mb-2">Materials Used</span>
                                        <div className="space-y-2">
                                            {product.materials.map((item) => (
                                                <div key={item.id} className="flex justify-between items-center text-sm p-2 bg-muted/50 rounded">
                                                    <div>
                                                        <p className="font-medium">{item.material.name}</p>
                                                        <p className="text-xs text-muted-foreground">{item.material.code}</p>
                                                    </div>
                                                    <span className="text-muted-foreground font-medium">
                                                        {Number(item.quantity).toFixed(2)} {item.unit}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Edit Product Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="max-w-2xl p-6 rounded-lg shadow-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Edit Product</DialogTitle>
                        <DialogDescription>
                            Update product information and materials
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleUpdate} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-sku">SKU</Label>
                                <Input
                                    id="edit-sku"
                                    placeholder="Kode Produk"
                                    value={formData.sku}
                                    onChange={(e) =>
                                        setFormData({ ...formData, sku: e.target.value })
                                    }
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-name">Name</Label>
                                <Input
                                    id="edit-name"
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
                                <Label htmlFor="edit-price">Harga</Label>
                                <Input
                                    id="edit-price"
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
                                <Label htmlFor="edit-status">Status</Label>
                                <Select
                                    id="edit-status"
                                    value={formData.status}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            status: e.target.value as ProductStatus,
                                        })
                                    }
                                >
                                    <option value="ACTIVE">Active</option>
                                    <option value="INACTIVE">Inactive</option>
                                    <option value="DISCONTINUED">Discontinued</option>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-description">Description</Label>
                            <Textarea
                                id="edit-description"
                                placeholder="Deskripsi Produk"
                                value={formData.description}
                                onChange={(e) =>
                                    setFormData({ ...formData, description: e.target.value })
                                }
                                rows={3}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-materials">Materials</Label>
                            <Select
                                id="edit-materials"
                                onChange={(e) => {
                                    if (e.target.value) {
                                        addMaterial(e.target.value);
                                        e.target.value = "";
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
                                        {material.name} ({material.code})
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
                                        const material = materials.find((m) => m.id === item.materialId);
                                        if (!material) return null;
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
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsEditDialogOpen(false)}
                                disabled={isSaving}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isSaving}>
                                {isSaving ? "Updating..." : "Update Product"}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete <strong>{product?.name}</strong>.
                            {product?.productionBatches && product.productionBatches.length > 0 && (
                                <span className="block mt-2 text-destructive font-medium">
                                    Warning: This product has {product.productionBatches.length} production batch(es). You cannot delete it.
                                </span>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            disabled={isDeleting || (product?.productionBatches && product.productionBatches.length > 0)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {isDeleting ? "Deleting..." : "Delete"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Delete Batch Confirmation Dialog */}
            <AlertDialog open={isDeleteBatchDialogOpen} onOpenChange={setIsDeleteBatchDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Production Batch?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete batch <strong>{batchToDelete?.batchSku}</strong>?
                            <span className="block mt-2 text-muted-foreground">
                                This action cannot be undone. Only batches with PENDING status can be deleted.
                            </span>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeletingBatch}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteBatch}
                            disabled={isDeletingBatch}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {isDeletingBatch ? "Deleting..." : "Delete Batch"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Delete Batch Confirmation Dialog */}
            <AlertDialog open={isDeleteBatchDialogOpen} onOpenChange={setIsDeleteBatchDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Production Batch?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete batch <strong>{batchToDelete?.batchSku}</strong>?
                            <span className="block mt-2 text-muted-foreground">
                                This action cannot be undone. Only batches that havent started production can be deleted.
                            </span>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeletingBatch}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteBatch}
                            disabled={isDeletingBatch}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {isDeletingBatch ? "Deleting..." : "Delete Batch"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Create Batch Dialog - same as production page */}
            {product && (
                <CreateBatchDialog
                    open={isAddDialogOpen}
                    onOpenChange={setIsAddDialogOpen}
                    products={[{
                        id: product.id,
                        sku: product.sku,
                        name: product.name,
                        materials: product.materials.map(m => ({
                            materialId: m.material.id,
                            material: m.material
                        }))
                    }]}
                    onSuccess={fetchProduct}
                />
            )}
        </div>
    );
}
