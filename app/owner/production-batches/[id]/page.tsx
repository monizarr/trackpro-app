"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Trash2, Package, AlertCircle, Clock, Scissors, Users, CheckCircle, Sparkles } from "lucide-react";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
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

type ProductionStatus = "PENDING" | "MATERIAL_REQUESTED" | "MATERIAL_ALLOCATED" | "ASSIGNED_TO_CUTTER" | "CUTTING_IN_PROGRESS" | "CUTTING_COMPLETED" | "CUTTING_VERIFIED" | "ASSIGNED_TO_SEWER" | "SEWING_IN_PROGRESS" | "SEWING_COMPLETED" | "SEWING_VERIFIED" | "ASSIGNED_TO_FINISHING" | "FINISHING_IN_PROGRESS" | "FINISHING_COMPLETED" | "VERIFIED_READY" | "COMPLETED" | "CANCELLED";

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

interface MaterialColorVariant {
    id: string;
    colorName: string;
    stock: number;
    material: Material;
}

interface MaterialColorAllocation {
    id: string;
    rollQuantity: number;
    allocatedQty: number;
    meterPerRoll: number;
    materialColorVariant: MaterialColorVariant;
}

interface SizeColorRequest {
    id: string;
    productSize: string;
    color: string;
    requestedPieces: number;
}

interface CuttingResult {
    id: string;
    productSize: string;
    color: string;
    actualPieces: number;
    isConfirmed: boolean;
    confirmedBy?: {
        name: string;
        role: string;
    };
}

interface CuttingTask {
    id: string;
    status: string;
    materialReceived: number;
    piecesCompleted: number;
    rejectPieces: number;
    wasteQty: number | null;
    notes: string | null;
    startedAt: string | null;
    completedAt: string | null;
    assignedTo: {
        id: string;
        name: string;
        email: string;
    };
}

interface SewingTask {
    id: string;
    status: string;
    piecesReceived: number;
    piecesCompleted: number;
    rejectPieces: number;
    notes: string | null;
    startedAt: string | null;
    completedAt: string | null;
    assignedTo: {
        id: string;
        name: string;
        email: string;
    };
}

interface FinishingTask {
    id: string;
    status: string;
    piecesReceived: number;
    piecesCompleted: number;
    rejectPieces: number;
    notes: string | null;
    startedAt: string | null;
    completedAt: string | null;
    assignedTo: {
        id: string;
        name: string;
        email: string;
    };
}

interface TimelineEvent {
    id: string;
    event: string;
    details: string | null;
    createdAt: string;
}

interface ProductionBatch {
    id: string;
    batchSku: string;
    targetQuantity: number;
    actualQuantity: number;
    rejectQuantity: number;
    totalRolls: number;
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
    materialColorAllocations?: MaterialColorAllocation[];
    sizeColorRequests?: SizeColorRequest[];
    cuttingResults?: CuttingResult[];
    cuttingTask?: CuttingTask;
    sewingTask?: SewingTask;
    finishingTask?: FinishingTask;
    timeline?: TimelineEvent[];
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
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

    const getStatusBadge = (status: ProductionStatus | string) => {
        const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
            PENDING: { label: "Menunggu", variant: "secondary" },
            MATERIAL_REQUESTED: { label: "Material Diminta", variant: "secondary" },
            MATERIAL_ALLOCATED: { label: "Material Dialokasi", variant: "default" },
            ASSIGNED_TO_CUTTER: { label: "Ditugaskan ke Pemotong", variant: "default" },
            CUTTING_IN_PROGRESS: { label: "Proses Pemotongan", variant: "outline" },
            CUTTING_COMPLETED: { label: "Pemotongan Selesai", variant: "default" },
            CUTTING_VERIFIED: { label: "Pemotongan Terverifikasi", variant: "default" },
            ASSIGNED_TO_SEWER: { label: "Ditugaskan ke Penjahit", variant: "default" },
            SEWING_IN_PROGRESS: { label: "Proses Penjahitan", variant: "outline" },
            SEWING_COMPLETED: { label: "Penjahitan Selesai", variant: "default" },
            SEWING_VERIFIED: { label: "Penjahitan Terverifikasi", variant: "default" },
            ASSIGNED_TO_FINISHING: { label: "Ditugaskan ke Finishing", variant: "default" },
            FINISHING_IN_PROGRESS: { label: "Proses Finishing", variant: "outline" },
            FINISHING_COMPLETED: { label: "Finishing Selesai", variant: "default" },
            VERIFIED_READY: { label: "Siap Gudang", variant: "default" },
            COMPLETED: { label: "Selesai", variant: "default" },
            CANCELLED: { label: "Dibatalkan", variant: "destructive" },
        };

        const statusInfo = statusMap[status] || { label: status, variant: "secondary" as const };
        return (
            <Badge variant={statusInfo.variant}>
                {statusInfo.label}
            </Badge>
        );
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("id-ID", {
            day: "numeric",
            month: "long",
            year: "numeric",
        });
    };

    const formatDateTime = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("id-ID", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    // Determine current phase based on status
    const getCurrentPhase = (status: ProductionStatus): string => {
        const pendingStatuses = ["PENDING", "MATERIAL_REQUESTED", "MATERIAL_ALLOCATED"];
        const cuttingStatuses = ["ASSIGNED_TO_CUTTER", "CUTTING_IN_PROGRESS", "CUTTING_COMPLETED"];
        const sewingStatuses = ["CUTTING_VERIFIED", "ASSIGNED_TO_SEWER", "SEWING_IN_PROGRESS", "SEWING_COMPLETED"];
        const finishingStatuses = ["SEWING_VERIFIED", "ASSIGNED_TO_FINISHING", "FINISHING_IN_PROGRESS", "FINISHING_COMPLETED"];
        const completedStatuses = ["VERIFIED_READY", "COMPLETED"];

        if (pendingStatuses.includes(status)) return "material";
        if (cuttingStatuses.includes(status)) return "cutting";
        if (sewingStatuses.includes(status)) return "sewing";
        if (finishingStatuses.includes(status)) return "finishing";
        if (completedStatuses.includes(status)) return "completed";
        return "material";
    };

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
    const currentPhase = getCurrentPhase(batch.status);

    // Calculate progress
    const totalTarget = batch.targetQuantity;
    const cuttingOutput = batch.cuttingResults?.reduce((sum, r) => sum + r.actualPieces, 0) || 0;
    const sewingOutput = batch.sewingTask?.piecesCompleted || 0;
    const finishingOutput = batch.finishingTask?.piecesCompleted || 0;

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Detail Batch Produksi</h2>
                    <p className="text-muted-foreground">
                        Kode Batch: <span className="font-mono font-medium">{batch.batchSku}</span>
                    </p>
                </div>
                <div className="flex gap-2">
                    {getStatusBadge(batch.status)}
                    {canDelete && (
                        <Button variant="destructive" size="sm" onClick={() => setIsDeleteDialogOpen(true)}>
                            <Trash2 className="h-4 w-4 mr-2" />
                            Hapus
                        </Button>
                    )}
                </div>
            </div>

            {/* Progress Overview */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Roll</CardTitle>
                        <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{batch.totalRolls || 0}</div>
                        <p className="text-xs text-muted-foreground">Roll bahan</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Target</CardTitle>
                        <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalTarget}</div>
                        <p className="text-xs text-muted-foreground">Pieces</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Output</CardTitle>
                        <CheckCircle className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{batch.actualQuantity}</div>
                        <p className="text-xs text-muted-foreground">Pieces selesai</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Reject</CardTitle>
                        <AlertCircle className="h-4 w-4 text-destructive" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-destructive">{batch.rejectQuantity}</div>
                        <p className="text-xs text-muted-foreground">Pieces ditolak</p>
                    </CardContent>
                </Card>
            </div>

            {/* Tabs by Phase */}
            <Tabs defaultValue={currentPhase} className="space-y-4">
                <TabsList className="grid w-full grid-cols-5">
                    <TabsTrigger value="material" className="text-xs sm:text-sm">
                        <Package className="h-4 w-4 mr-1 sm:mr-2 text-yellow-600" />
                        <span className="hidden sm:inline">Material</span>
                        <span className="sm:hidden">Mat</span>
                    </TabsTrigger>
                    <TabsTrigger value="cutting" className="text-xs sm:text-sm">
                        <Scissors className="h-4 w-4 mr-1 sm:mr-2 text-blue-600" />
                        <span className="hidden sm:inline">Potong</span>
                        <span className="sm:hidden">Pot</span>
                    </TabsTrigger>
                    <TabsTrigger value="sewing" className="text-xs sm:text-sm">
                        <Users className="h-4 w-4 mr-1 sm:mr-2 text-purple-600" />
                        <span className="hidden sm:inline">Jahit</span>
                        <span className="sm:hidden">Jht</span>
                    </TabsTrigger>
                    <TabsTrigger value="finishing" className="text-xs sm:text-sm">
                        <Sparkles className="h-4 w-4 mr-1 sm:mr-2 text-orange-600" />
                        <span className="hidden sm:inline">Finishing</span>
                        <span className="sm:hidden">Fin</span>
                    </TabsTrigger>
                    <TabsTrigger value="completed" className="text-xs sm:text-sm">
                        <CheckCircle className="h-4 w-4 mr-1 sm:mr-2 text-green-600" />
                        <span className="hidden sm:inline">Selesai</span>
                        <span className="sm:hidden">Done</span>
                    </TabsTrigger>
                </TabsList>

                {/* Material Tab */}
                <TabsContent value="material" className="space-y-4">
                    <div className="grid gap-4 lg:grid-cols-2">
                        {/* Batch Info */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Informasi Batch</CardTitle>
                                <CardDescription>Detail batch produksi</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-muted-foreground">Produk</span>
                                    <Link href={`/owner/products/${batch.product.id}`} className="text-sm font-medium text-primary hover:underline">
                                        {batch.product.name}
                                    </Link>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-muted-foreground">SKU Produk</span>
                                    <span className="text-sm font-mono">{batch.product.sku}</span>
                                </div>
                                <Separator />
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-muted-foreground">Tanggal Mulai</span>
                                    <span className="text-sm">{formatDate(batch.startDate)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-muted-foreground">Dibuat Oleh</span>
                                    <span className="text-sm">{batch.createdBy.name}</span>
                                </div>
                                {batch.notes && (
                                    <>
                                        <Separator />
                                        <div className="space-y-1">
                                            <span className="text-sm text-muted-foreground">Catatan</span>
                                            <p className="text-sm p-2 bg-muted rounded">{batch.notes}</p>
                                        </div>
                                    </>
                                )}
                            </CardContent>
                        </Card>

                        {/* Size Color Requests */}
                        {batch.sizeColorRequests && batch.sizeColorRequests.length > 0 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Permintaan Ukuran & Warna</CardTitle>
                                    <CardDescription>Target produksi per ukuran dan warna</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="rounded-md border">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Ukuran</TableHead>
                                                    <TableHead>Warna</TableHead>
                                                    <TableHead className="text-right">Target</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {batch.sizeColorRequests.map((request) => (
                                                    <TableRow key={request.id}>
                                                        <TableCell className="font-medium">{request.productSize}</TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline">{request.color}</Badge>
                                                        </TableCell>
                                                        <TableCell className="text-right">{request.requestedPieces} pcs</TableCell>
                                                    </TableRow>
                                                ))}
                                                <TableRow className="font-bold bg-muted/50">
                                                    <TableCell colSpan={2}>Total</TableCell>
                                                    <TableCell className="text-right">
                                                        {batch.sizeColorRequests.reduce((sum, r) => sum + r.requestedPieces, 0)} pcs
                                                    </TableCell>
                                                </TableRow>
                                            </TableBody>
                                        </Table>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    {/* Material Allocations */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Alokasi Material</CardTitle>
                            <CardDescription>Material yang dibutuhkan dan dialokasikan untuk batch ini</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {batch.materialColorAllocations && batch.materialColorAllocations.length > 0 ? (
                                <div className="rounded-md border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Material</TableHead>
                                                <TableHead>Warna</TableHead>
                                                <TableHead className="text-right">Roll</TableHead>
                                                <TableHead className="text-right">Total Meter</TableHead>
                                                <TableHead className="text-right">Stok</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {batch.materialColorAllocations.map((allocation) => (
                                                <TableRow key={allocation.id}>
                                                    <TableCell className="font-medium">
                                                        {allocation.materialColorVariant.material.name}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline">{allocation.materialColorVariant.colorName}</Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right">{allocation.rollQuantity}</TableCell>
                                                    <TableCell className="text-right">
                                                        {Number(allocation.allocatedQty).toFixed(2)} m
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        {allocation.materialColorVariant.stock} m
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            ) : batch.materialAllocations.length > 0 ? (
                                <div className="rounded-md border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Material</TableHead>
                                                <TableHead>Kode</TableHead>
                                                <TableHead className="text-right">Diminta</TableHead>
                                                <TableHead className="text-right">Dialokasi</TableHead>
                                                <TableHead>Status</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {batch.materialAllocations.map((allocation) => (
                                                <TableRow key={allocation.id}>
                                                    <TableCell className="font-medium">{allocation.material.name}</TableCell>
                                                    <TableCell className="font-mono text-sm">{allocation.material.code}</TableCell>
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
                                                        <Badge variant={allocation.status === "ALLOCATED" ? "default" : "secondary"}>
                                                            {allocation.status}
                                                        </Badge>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            ) : (
                                <div className="text-center py-8 text-muted-foreground">
                                    <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                    <p>Belum ada alokasi material</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Cutting Tab */}
                <TabsContent value="cutting" className="space-y-4">
                    <div className="grid gap-4 lg:grid-cols-2">
                        {/* Cutting Task Info */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Task Pemotongan</CardTitle>
                                <CardDescription>Informasi tugas pemotongan</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {batch.cuttingTask ? (
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-muted-foreground">Pemotong</span>
                                            <span className="text-sm font-medium">{batch.cuttingTask.assignedTo.name}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-muted-foreground">Status</span>
                                            {getStatusBadge(batch.cuttingTask.status)}
                                        </div>
                                        <Separator />
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-muted-foreground">Material Diterima</span>
                                            <span className="text-sm font-medium">{batch.cuttingTask.materialReceived} m</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-muted-foreground">Selesai</span>
                                            <span className="text-sm font-medium text-green-600">{batch.cuttingTask.piecesCompleted} pcs</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-muted-foreground">Reject</span>
                                            <span className="text-sm font-medium text-destructive">{batch.cuttingTask.rejectPieces} pcs</span>
                                        </div>
                                        {batch.cuttingTask.wasteQty && (
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-muted-foreground">Waste</span>
                                                <span className="text-sm">{batch.cuttingTask.wasteQty} m</span>
                                            </div>
                                        )}
                                        <Separator />
                                        {batch.cuttingTask.startedAt && (
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-muted-foreground">Mulai</span>
                                                <span className="text-xs">{formatDateTime(batch.cuttingTask.startedAt)}</span>
                                            </div>
                                        )}
                                        {batch.cuttingTask.completedAt && (
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-muted-foreground">Selesai</span>
                                                <span className="text-xs">{formatDateTime(batch.cuttingTask.completedAt)}</span>
                                            </div>
                                        )}
                                        {batch.cuttingTask.notes && (
                                            <div className="space-y-1 pt-2">
                                                <span className="text-sm text-muted-foreground">Catatan</span>
                                                <p className="text-sm p-2 bg-muted rounded">{batch.cuttingTask.notes}</p>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <Scissors className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                        <p>Belum ada task pemotongan</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Cutting Progress */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Progress Pemotongan</CardTitle>
                                <CardDescription>Kemajuan proses pemotongan</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Selesai</span>
                                        <span className="font-medium">{cuttingOutput} / {totalTarget} pcs</span>
                                    </div>
                                    <Progress value={(cuttingOutput / totalTarget) * 100} className="h-2" />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Cutting Results */}
                    {batch.cuttingResults && batch.cuttingResults.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Hasil Pemotongan</CardTitle>
                                <CardDescription>Detail hasil pemotongan per ukuran dan warna</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="rounded-md border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Ukuran</TableHead>
                                                <TableHead>Warna</TableHead>
                                                <TableHead className="text-right">Target</TableHead>
                                                <TableHead className="text-right">Actual</TableHead>
                                                <TableHead>Status</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {batch.cuttingResults.map((result) => {
                                                const request = batch.sizeColorRequests?.find(
                                                    r => r.productSize === result.productSize && r.color === result.color
                                                );
                                                return (
                                                    <TableRow key={result.id}>
                                                        <TableCell className="font-medium">{result.productSize}</TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline">{result.color}</Badge>
                                                        </TableCell>
                                                        <TableCell className="text-right">{request?.requestedPieces || 0} pcs</TableCell>
                                                        <TableCell className="text-right font-medium">{result.actualPieces} pcs</TableCell>
                                                        <TableCell>
                                                            {result.isConfirmed ? (
                                                                <Badge className="bg-green-500">
                                                                    <CheckCircle className="h-3 w-3 mr-1" />
                                                                    Dikonfirmasi
                                                                </Badge>
                                                            ) : (
                                                                <Badge variant="secondary">Pending</Badge>
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                            <TableRow className="font-bold bg-muted/50">
                                                <TableCell colSpan={2}>Total</TableCell>
                                                <TableCell className="text-right">
                                                    {batch.sizeColorRequests?.reduce((sum, r) => sum + r.requestedPieces, 0) || 0} pcs
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {cuttingOutput} pcs
                                                </TableCell>
                                                <TableCell></TableCell>
                                            </TableRow>
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>

                {/* Sewing Tab */}
                <TabsContent value="sewing" className="space-y-4">
                    <div className="grid gap-4 lg:grid-cols-2">
                        {/* Sewing Task Info */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Task Penjahitan</CardTitle>
                                <CardDescription>Informasi tugas penjahitan</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {batch.sewingTask ? (
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-muted-foreground">Penjahit</span>
                                            <span className="text-sm font-medium">{batch.sewingTask.assignedTo.name}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-muted-foreground">Status</span>
                                            {getStatusBadge(batch.sewingTask.status)}
                                        </div>
                                        <Separator />
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-muted-foreground">Diterima</span>
                                            <span className="text-sm font-medium">{batch.sewingTask.piecesReceived} pcs</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-muted-foreground">Selesai</span>
                                            <span className="text-sm font-medium text-green-600">{batch.sewingTask.piecesCompleted} pcs</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-muted-foreground">Reject</span>
                                            <span className="text-sm font-medium text-destructive">{batch.sewingTask.rejectPieces} pcs</span>
                                        </div>
                                        <Separator />
                                        {batch.sewingTask.startedAt && (
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-muted-foreground">Mulai</span>
                                                <span className="text-xs">{formatDateTime(batch.sewingTask.startedAt)}</span>
                                            </div>
                                        )}
                                        {batch.sewingTask.completedAt && (
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-muted-foreground">Selesai</span>
                                                <span className="text-xs">{formatDateTime(batch.sewingTask.completedAt)}</span>
                                            </div>
                                        )}
                                        {batch.sewingTask.notes && (
                                            <div className="space-y-1 pt-2">
                                                <span className="text-sm text-muted-foreground">Catatan</span>
                                                <p className="text-sm p-2 bg-muted rounded">{batch.sewingTask.notes}</p>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                        <p>Belum ada task penjahitan</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Sewing Progress */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Progress Penjahitan</CardTitle>
                                <CardDescription>Kemajuan proses penjahitan</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Input dari Potong</span>
                                        <span className="font-medium">{cuttingOutput} pcs</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Output Jahit</span>
                                        <span className="font-medium text-green-600">{sewingOutput} pcs</span>
                                    </div>
                                    <Progress value={cuttingOutput > 0 ? (sewingOutput / cuttingOutput) * 100 : 0} className="h-2" />
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* Finishing Tab */}
                <TabsContent value="finishing" className="space-y-4">
                    <div className="grid gap-4 lg:grid-cols-2">
                        {/* Finishing Task Info */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Task Finishing</CardTitle>
                                <CardDescription>Informasi tugas finishing</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {batch.finishingTask ? (
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-muted-foreground">Pekerja</span>
                                            <span className="text-sm font-medium">{batch.finishingTask.assignedTo.name}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-muted-foreground">Status</span>
                                            {getStatusBadge(batch.finishingTask.status)}
                                        </div>
                                        <Separator />
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-muted-foreground">Diterima</span>
                                            <span className="text-sm font-medium">{batch.finishingTask.piecesReceived} pcs</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-muted-foreground">Selesai</span>
                                            <span className="text-sm font-medium text-green-600">{batch.finishingTask.piecesCompleted} pcs</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-muted-foreground">Reject</span>
                                            <span className="text-sm font-medium text-destructive">{batch.finishingTask.rejectPieces} pcs</span>
                                        </div>
                                        <Separator />
                                        {batch.finishingTask.startedAt && (
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-muted-foreground">Mulai</span>
                                                <span className="text-xs">{formatDateTime(batch.finishingTask.startedAt)}</span>
                                            </div>
                                        )}
                                        {batch.finishingTask.completedAt && (
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-muted-foreground">Selesai</span>
                                                <span className="text-xs">{formatDateTime(batch.finishingTask.completedAt)}</span>
                                            </div>
                                        )}
                                        {batch.finishingTask.notes && (
                                            <div className="space-y-1 pt-2">
                                                <span className="text-sm text-muted-foreground">Catatan</span>
                                                <p className="text-sm p-2 bg-muted rounded">{batch.finishingTask.notes}</p>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <Sparkles className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                        <p>Belum ada task finishing</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Finishing Progress */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Progress Finishing</CardTitle>
                                <CardDescription>Kemajuan proses finishing</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Input dari Jahit</span>
                                        <span className="font-medium">{sewingOutput} pcs</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Output Finishing</span>
                                        <span className="font-medium text-green-600">{finishingOutput} pcs</span>
                                    </div>
                                    <Progress value={sewingOutput > 0 ? (finishingOutput / sewingOutput) * 100 : 0} className="h-2" />
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* Completed Tab */}
                <TabsContent value="completed" className="space-y-4">
                    <div className="grid gap-4 lg:grid-cols-2">
                        {/* Summary Card */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Ringkasan Produksi</CardTitle>
                                <CardDescription>Hasil akhir produksi batch ini</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-muted-foreground">Target</span>
                                        <span className="text-lg font-bold">{totalTarget} pcs</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-muted-foreground">Output Akhir</span>
                                        <span className="text-lg font-bold text-green-600">{batch.actualQuantity} pcs</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-muted-foreground">Total Reject</span>
                                        <span className="text-lg font-bold text-destructive">{batch.rejectQuantity} pcs</span>
                                    </div>
                                    <Separator />
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-muted-foreground">Efisiensi</span>
                                        <span className="text-lg font-bold">
                                            {totalTarget > 0 ? ((batch.actualQuantity / totalTarget) * 100).toFixed(1) : 0}%
                                        </span>
                                    </div>
                                </div>
                                {batch.completedDate && (
                                    <div className="pt-2 border-t">
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-muted-foreground">Tanggal Selesai</span>
                                            <span className="text-sm">{formatDate(batch.completedDate)}</span>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Timeline */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Timeline</CardTitle>
                                <CardDescription>Riwayat aktivitas batch</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {batch.timeline && batch.timeline.length > 0 ? (
                                    <div className="space-y-4 max-h-80 overflow-y-auto">
                                        {batch.timeline.map((event, index) => (
                                            <div key={event.id} className="flex gap-3">
                                                <div className="flex flex-col items-center">
                                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm">
                                                        {getTimelineIcon(event.event)}
                                                    </div>
                                                    {index < batch.timeline!.length - 1 && (
                                                        <div className="w-px h-full bg-border mt-1" />
                                                    )}
                                                </div>
                                                <div className="flex-1 pb-4">
                                                    <p className="text-sm font-medium">{getTimelineLabel(event.event)}</p>
                                                    {event.details && (
                                                        <p className="text-xs text-muted-foreground mt-0.5">{event.details}</p>
                                                    )}
                                                    <p className="text-xs text-muted-foreground mt-1">{formatDateTime(event.createdAt)}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                        <p>Belum ada riwayat</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Hapus Batch?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Ini akan menghapus batch produksi <strong>{batch.batchSku}</strong> secara permanen.
                            Tindakan ini tidak dapat dibatalkan.
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
    );
}

// Helper functions for timeline
function getTimelineIcon(event: string): string {
    if (event.includes('CUTTING')) return '✂️';
    if (event.includes('SEWING')) return '🧵';
    if (event.includes('FINISHING')) return '✨';
    if (event.includes('MATERIAL')) return '📦';
    if (event.includes('VERIFIED') || event.includes('CONFIRMED')) return '✅';
    if (event.includes('COMPLETED')) return '🎉';
    if (event.includes('CANCELLED')) return '❌';
    if (event.includes('ASSIGNED')) return '👤';
    return '📌';
}

function getTimelineLabel(event: string): string {
    const labels: Record<string, string> = {
        'BATCH_CREATED': 'Batch Dibuat',
        'MATERIAL_REQUESTED': 'Material Diminta',
        'MATERIAL_ALLOCATED': 'Material Dialokasikan',
        'ASSIGNED_TO_CUTTER': 'Ditugaskan ke Pemotong',
        'CUTTING_STARTED': 'Pemotongan Dimulai',
        'CUTTING_COMPLETED': 'Pemotongan Selesai',
        'CUTTING_VERIFIED': 'Pemotongan Diverifikasi',
        'ASSIGNED_TO_SEWER': 'Ditugaskan ke Penjahit',
        'SEWING_STARTED': 'Penjahitan Dimulai',
        'SEWING_COMPLETED': 'Penjahitan Selesai',
        'SEWING_VERIFIED': 'Penjahitan Diverifikasi',
        'ASSIGNED_TO_FINISHING': 'Ditugaskan ke Finishing',
        'FINISHING_STARTED': 'Finishing Dimulai',
        'FINISHING_COMPLETED': 'Finishing Selesai',
        'WAREHOUSE_VERIFIED': 'Diverifikasi Gudang',
        'BATCH_COMPLETED': 'Batch Selesai',
        'BATCH_CANCELLED': 'Batch Dibatalkan',
    };
    return labels[event] || event;
}
