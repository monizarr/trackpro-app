"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Edit, Trash2, Package, AlertCircle } from "lucide-react";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
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

type ProductionStatus = "PENDING" | "MATERIAL_REQUESTED" | "MATERIAL_ALLOCATED" | "ASSIGNED_TO_CUTTER" | "IN_CUTTING" | "CUTTING_COMPLETED" | "CUTTING_VERIFIED" | "IN_SEWING" | "SEWING_COMPLETED" | "SEWING_VERIFIED" | "IN_FINISHING" | "FINISHING_COMPLETED" | "COMPLETED" | "CANCELLED";

interface Material {
    id: string;
    code: string;
    name: string;
    unit: string;
    currentStock: number;
}

interface MaterialAllocation {
    id: string;
    requestedQty: number;
    allocatedQty: number | null;
    status: string;
    material: Material;
}

interface ProductionBatch {
    id: string;
    batchSku: string;
    targetQuantity: number;
    actualQuantity: number;
    rejectQuantity: number;
    status: ProductionStatus;
    startDate: string;
    completedDate: string | null;
    notes: string | null;
    createdAt: string;
    product: {
        id: string;
        sku: string;
        name: string;
        price: number;
    };
    createdBy: {
        name: string;
        role: string;
    };
    materialAllocations: MaterialAllocation[];
}

export default function ProductionBatchDetailPage() {
    const params = useParams();
    const router = useRouter();
    const batchId = params.id as string;

    const [batch, setBatch] = useState<ProductionBatch | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        fetchBatch();
    }, [batchId]);

    const fetchBatch = async () => {
        try {
            setIsLoading(true);
            const response = await fetch(`/api/production-batches/${batchId}`);
            const data = await response.json();

            if (data.success) {
                setBatch(data.data);
            } else {
                setBatch(null);
            }
        } catch (error) {
            console.error("Error fetching batch:", error);
            setBatch(null);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async () => {
        try {
            setIsDeleting(true);
            const response = await fetch(`/api/production-batches/${batchId}`, {
                method: "DELETE",
            });

            const data = await response.json();

            if (data.success) {
                toast.success("Batch Dihapus", "Mengarahkan kembali...");
                router.push(`/owner/products/${batch?.product.id}`);
            } else {
                toast.error("Gagal Menghapus", data.error || "Tidak dapat menghapus batch produksi");
            }
        } catch (error) {
            console.error("Error deleting batch:", error);
            toast.error("Error", "Gagal menghapus batch produksi");
        } finally {
            setIsDeleting(false);
            setIsDeleteDialogOpen(false);
        }
    };

    const getStatusBadge = (status: ProductionStatus) => {
        const statusMap = {
            PENDING: { label: "Pending", variant: "secondary" as const },
            MATERIAL_REQUESTED: { label: "Material Requested", variant: "secondary" as const },
            MATERIAL_ALLOCATED: { label: "Material Allocated", variant: "default" as const },
            ASSIGNED_TO_CUTTER: { label: "Assigned to Cutter", variant: "default" as const },
            IN_CUTTING: { label: "In Cutting", variant: "default" as const },
            CUTTING_COMPLETED: { label: "Cutting Completed", variant: "default" as const },
            CUTTING_VERIFIED: { label: "Cutting Verified", variant: "default" as const },
            IN_SEWING: { label: "In Sewing", variant: "default" as const },
            SEWING_COMPLETED: { label: "Sewing Completed", variant: "default" as const },
            SEWING_VERIFIED: { label: "Sewing Verified", variant: "default" as const },
            IN_FINISHING: { label: "In Finishing", variant: "default" as const },
            FINISHING_COMPLETED: { label: "Finishing Completed", variant: "default" as const },
            COMPLETED: { label: "Completed", variant: "default" as const },
            CANCELLED: { label: "Cancelled", variant: "destructive" as const },
        };

        const statusInfo = statusMap[status] || statusMap.PENDING;
        return (
            <Badge variant={statusInfo.variant}>
                {statusInfo.label}
            </Badge>
        );
    };

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat("id-ID", {
            style: "currency",
            currency: "IDR",
            minimumFractionDigits: 0,
        }).format(price);
    };

    if (isLoading) {
        return (
            <div className="flex-1 space-y-4 p-8 pt-6">
                <div className="text-center py-12">
                    <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
                    <p className="mt-4 text-lg text-muted-foreground">Loading batch...</p>
                </div>
            </div>
        );
    }

    if (!batch) {
        return (
            <div className="flex-1 space-y-4 p-8 pt-6">
                <div className="text-center py-12">
                    <h1 className="text-2xl font-bold mb-4">Production Batch tidak ditemukan</h1>
                    <p className="text-muted-foreground mb-6">
                        Batch yang Anda cari tidak ada atau telah dihapus.
                    </p>
                    <Link href="/owner/products">
                        <Button>
                            <ChevronLeft className="h-4 w-4 mr-2" />
                            Kembali ke Produk
                        </Button>
                    </Link>
                </div>
            </div>
        );
    }

    const canDelete = ["PENDING", "CANCELLED"].includes(batch.status);

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Link href="/owner/products" className="hover:text-foreground">
                    Products
                </Link>
                <span>/</span>
                <Link href={`/owner/products/${batch.product.id}`} className="hover:text-foreground">
                    {batch.product.name}
                </Link>
                <span>/</span>
                <span className="text-foreground">Batch {batch.batchSku}</span>
            </div>

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Production Batch</h2>
                    <p className="text-muted-foreground">
                        Batch Code: {batch.batchSku}
                    </p>
                </div>
                <div className="flex gap-2">
                    {canDelete && (
                        <Button variant="destructive" onClick={() => setIsDeleteDialogOpen(true)}>
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                        </Button>
                    )}
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                {/* Batch Info Card */}
                <Card className="lg:col-span-3">
                    <CardHeader>
                        <CardTitle>Batch Information</CardTitle>
                        <CardDescription>Details about this production batch</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-medium text-muted-foreground">Product</span>
                                <Link
                                    href={`/owner/products/${batch.product.id}`}
                                    className="text-sm font-medium text-primary hover:underline"
                                >
                                    {batch.product.name}
                                </Link>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-medium text-muted-foreground">Product SKU</span>
                                <span className="text-sm font-mono">{batch.product.sku}</span>
                            </div>
                            <Separator />
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-medium text-muted-foreground">Status</span>
                                {getStatusBadge(batch.status)}
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-medium text-muted-foreground">Target Quantity</span>
                                <span className="text-lg font-bold">{batch.targetQuantity} pcs</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-medium text-muted-foreground">Actual Quantity</span>
                                <span className="text-lg font-bold">{batch.actualQuantity} pcs</span>
                            </div>
                            {batch.rejectQuantity > 0 && (
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-medium text-muted-foreground">Reject Quantity</span>
                                    <span className="text-lg font-bold text-destructive">{batch.rejectQuantity} pcs</span>
                                </div>
                            )}
                            <Separator />
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-medium text-muted-foreground">Start Date</span>
                                <span className="text-sm">
                                    {new Date(batch.startDate).toLocaleDateString("id-ID", {
                                        day: "numeric",
                                        month: "long",
                                        year: "numeric",
                                    })}
                                </span>
                            </div>
                            {batch.completedDate && (
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-medium text-muted-foreground">Completed Date</span>
                                    <span className="text-sm">
                                        {new Date(batch.completedDate).toLocaleDateString("id-ID", {
                                            day: "numeric",
                                            month: "long",
                                            year: "numeric",
                                        })}
                                    </span>
                                </div>
                            )}
                            <Separator />
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-medium text-muted-foreground">Created By</span>
                                <span className="text-sm">{batch.createdBy.name}</span>
                            </div>
                            {batch.notes && (
                                <>
                                    <Separator />
                                    <div className="space-y-2">
                                        <span className="text-sm font-medium text-muted-foreground block">Notes</span>
                                        <p className="text-sm p-2 bg-muted rounded">{batch.notes}</p>
                                    </div>
                                </>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Material Allocations */}
                <Card className="lg:col-span-4">
                    <CardHeader>
                        <CardTitle>Material Allocations</CardTitle>
                        <CardDescription>Materials required and allocated for this batch</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {batch.materialAllocations.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                <p>No material allocations</p>
                            </div>
                        ) : (
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Material</TableHead>
                                            <TableHead>Code</TableHead>
                                            <TableHead className="text-right">Requested</TableHead>
                                            <TableHead className="text-right">Allocated</TableHead>
                                            <TableHead>Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {batch.materialAllocations.map((allocation) => (
                                            <TableRow key={allocation.id}>
                                                <TableCell className="font-medium">
                                                    {allocation.material.name}
                                                </TableCell>
                                                <TableCell className="font-mono text-sm">
                                                    {allocation.material.code}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {Number(allocation.requestedQty).toFixed(2)} {allocation.material.unit}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {allocation.allocatedQty
                                                        ? `${Number(allocation.allocatedQty).toFixed(2)} ${allocation.material.unit}`
                                                        : <span className="text-muted-foreground">-</span>
                                                    }
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={
                                                        allocation.status === "ALLOCATED" ? "default" :
                                                            allocation.status === "APPROVED" ? "default" :
                                                                allocation.status === "REJECTED" ? "destructive" :
                                                                    "secondary"
                                                    }>
                                                        {allocation.status}
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete production batch <strong>{batch.batchSku}</strong>.
                            This action cannot be undone.
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
    );
}
