"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Calendar, Package, User, AlertCircle, CheckCircle2, Clock, Loader2, FileText, Trash2, QrCode } from "lucide-react";
import { toast } from "@/lib/toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { QRCodeGenerator } from "@/components/qr-code-generator";
import { SubBatchList } from "@/components/sub-batch-list";

interface Material {
    id: string;
    code: string;
    name: string;
    unit: string;
    currentStock: number;
}

interface MaterialAllocation {
    materialId: string;
    requestedQty: number;
    material: Material;
}

interface Product {
    id: string;
    sku: string;
    name: string;
}

interface ProductionBatch {
    id: string;
    batchSku: string;
    status: string;
    targetQuantity: number;
    actualQuantity: number;
    rejectQuantity: number;
    startDate: string;
    completedDate: string | null;
    notes: string | null;
    createdAt: string;
    product: Product;
    createdBy: {
        name: string;
    };
    materialAllocations: MaterialAllocation[];
    cuttingTask?: {
        id: string;
        materialReceived: number;
        piecesCompleted: number;
        rejectPieces: number;
        wasteQty: number | null;
        status: string;
        notes: string | null;
        startedAt: string | null;
        completedAt: string | null;
        assignedTo?: {
            name: string;
        };
    };
    sewingTask?: {
        id: string;
        piecesReceived: number;
        piecesCompleted: number;
        rejectPieces: number;
        status: string;
        notes: string | null;
        startedAt: string | null;
        completedAt: string | null;
        assignedTo?: {
            name: string;
        };
    };
    finishingTask?: {
        id: string;
        piecesReceived: number;
        piecesCompleted: number;
        rejectPieces: number;
        status: string;
        notes: string | null;
        startedAt: string | null;
        completedAt: string | null;
        assignedTo?: {
            name: string;
        };
    };
}

interface TimelineEvent {
    id: string;
    batchId: string;
    event: string;
    details: string | null;
    createdAt: string;
}

export default function BatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params);
    const router = useRouter();
    const [batch, setBatch] = useState<ProductionBatch | null>(null);
    const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingTimeline, setLoadingTimeline] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isQRDialogOpen, setIsQRDialogOpen] = useState(false);

    useEffect(() => {
        fetchBatchDetail();
        fetchTimeline();
    }, [resolvedParams.id]);

    const fetchBatchDetail = async () => {
        try {
            setLoading(true);
            const response = await fetch(`/api/production-batches/${resolvedParams.id}`);
            const result = await response.json();

            if (result.success) {
                setBatch(result.data);
            }
        } catch (error) {
            console.error("Error fetching batch detail:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchTimeline = async () => {
        try {
            setLoadingTimeline(true);
            const response = await fetch(`/api/production-batches/${resolvedParams.id}/timeline`);
            const result = await response.json();

            if (result.success) {
                setTimeline(result.data || []);
            }
        } catch (error) {
            console.error("Error fetching timeline:", error);
        } finally {
            setLoadingTimeline(false);
        }
    };

    const handleDeleteBatch = async () => {
        if (!batch) return;

        setIsDeleting(true);
        try {
            const response = await fetch(`/api/production-batches/${batch.id}`, {
                method: "DELETE",
            });

            const data = await response.json();

            if (data.success) {
                toast.success("Batch Dihapus", "Mengarahkan kembali...");
                router.push("/production/batch");
            } else {
                toast.error("Gagal Menghapus", data.error || "Tidak dapat menghapus batch");
            }
        } catch (error) {
            console.error("Error deleting batch:", error);
            toast.error("Error", "Gagal menghapus batch");
        } finally {
            setIsDeleting(false);
            setIsDeleteDialogOpen(false);
        }
    };

    const getStatusBadge = (status: string) => {
        const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
            PENDING: { label: "Menunggu", variant: "secondary" },
            MATERIAL_REQUESTED: { label: "Material Diminta", variant: "secondary" },
            MATERIAL_ALLOCATED: { label: "Material Dialokasi", variant: "outline" },
            CUTTING: { label: "Pemotongan", variant: "default" },
            SEWING: { label: "Penjahitan", variant: "default" },
            FINISHING: { label: "Finishing", variant: "default" },
            CUTTING_COMPLETED: { label: "Potongan Selesai", variant: "secondary" },
            SEWING_COMPLETED: { label: "Jahitan Selesai", variant: "secondary" },
            FINISHING_COMPLETED: { label: "Finishing Selesai", variant: "secondary" },
            WAREHOUSE_VERIFIED: { label: "Terverifikasi", variant: "outline" },
            COMPLETED: { label: "Selesai", variant: "default" },
            CANCELLED: { label: "Dibatalkan", variant: "destructive" },
        };
        const config = statusConfig[status] || { label: status, variant: "outline" };
        return <Badge variant={config.variant}>{config.label}</Badge>;
    };

    const getEventLabel = (event: string) => {
        const labels: Record<string, string> = {
            BATCH_CREATED: "Batch Dibuat",
            MATERIAL_REQUESTED: "Material Diminta",
            MATERIAL_ALLOCATED: "Material Dialokasikan",
            ASSIGNED_TO_CUTTER: "Ditugaskan ke Pemotong",
            CUTTING_STARTED: "Pemotongan Dimulai",
            CUTTING_COMPLETED: "Pemotongan Selesai",
            CUTTING_VERIFIED: "Pemotongan Diverifikasi",
            ASSIGNED_TO_SEWER: "Ditugaskan ke Penjahit",
            SEWING_STARTED: "Penjahitan Dimulai",
            SEWING_COMPLETED: "Penjahitan Selesai",
            SEWING_VERIFIED: "Penjahitan Diverifikasi",
            ASSIGNED_TO_FINISHING: "Ditugaskan ke Finishing",
            FINISHING_STARTED: "Finishing Dimulai",
            FINISHING_COMPLETED: "Finishing Selesai",
            WAREHOUSE_VERIFIED: "Diverifikasi Gudang",
            BATCH_COMPLETED: "Batch Selesai",
            BATCH_CANCELLED: "Batch Dibatalkan",
        };
        return labels[event] || event;
    };

    const getEventIcon = (event: string) => {
        if (event.includes("CUTTING")) {
            return "✂️";
        } else if (event.includes("SEWING")) {
            return "🧵";
        } else if (event.includes("FINISHING")) {
            return "✨";
        } else if (event.includes("MATERIAL")) {
            return "📦";
        } else if (event.includes("VERIFIED")) {
            return "✅";
        } else if (event.includes("COMPLETED")) {
            return "🎉";
        } else if (event.includes("CANCELLED")) {
            return "❌";
        }
        return "📌";
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("id-ID", {
            day: "numeric",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const formatDateOnly = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("id-ID", {
            day: "numeric",
            month: "long",
            year: "numeric",
        });
    };

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                    <p className="text-muted-foreground">Loading batch detail...</p>
                </div>
            </div>
        );
    }

    if (!batch) {
        return (
            <div className="flex-1 space-y-4 p-8 pt-6">
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>Batch tidak ditemukan</AlertDescription>
                </Alert>
                <Button onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Kembali
                </Button>
            </div>
        );
    }

    return (
        <div className="flex-1 space-y-6 p-8 pt-6">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="space-y-1">
                    <Button variant="ghost" onClick={() => router.back()} className="mb-2">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Kembali
                    </Button>
                    <h2 className="text-3xl font-bold tracking-tight font-mono">{batch.batchSku}</h2>
                    <p className="text-muted-foreground">{batch.product.name}</p>
                </div>
                <div className="flex items-center gap-2">
                    {getStatusBadge(batch.status)}
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsQRDialogOpen(true)}
                    >
                        <QrCode className="h-4 w-4 mr-2" />
                        Show QR Code
                    </Button>
                    <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setIsDeleteDialogOpen(true)}
                        disabled={batch.status !== 'PENDING'}
                        title={batch.status !== 'PENDING' ? 'Only PENDING batches can be deleted' : 'Delete batch'}
                    >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Batch
                    </Button>
                </div>
            </div>

            {/* Batch Overview */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Target Quantity</CardTitle>
                        <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{batch.targetQuantity} pcs</div>
                        <p className="text-xs text-muted-foreground">Target produksi</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Actual Quantity</CardTitle>
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{batch.actualQuantity} pcs</div>
                        <p className="text-xs text-muted-foreground">Berhasil diproduksi</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Reject Quantity</CardTitle>
                        <AlertCircle className="h-4 w-4 text-red-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">{batch.rejectQuantity} pcs</div>
                        <p className="text-xs text-muted-foreground">Produk reject</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {batch.targetQuantity > 0
                                ? Math.round((batch.actualQuantity / batch.targetQuantity) * 100)
                                : 0}
                            %
                        </div>
                        <p className="text-xs text-muted-foreground">Progress completion</p>
                    </CardContent>
                </Card>
            </div>

            {/* Batch Information */}
            <Card>
                <CardHeader>
                    <CardTitle>Informasi Batch</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-sm text-muted-foreground">Batch SKU</p>
                            <p className="font-mono font-bold">{batch.batchSku}</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Product</p>
                            <p className="font-medium">{batch.product.name}</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Created By</p>
                            <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-muted-foreground" />
                                <p className="font-medium">{batch.createdBy.name}</p>
                            </div>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Start Date</p>
                            <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <p>{formatDateOnly(batch.startDate)}</p>
                            </div>
                        </div>
                        {batch.completedDate && (
                            <div>
                                <p className="text-sm text-muted-foreground">Completed Date</p>
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                                    <p>{formatDateOnly(batch.completedDate)}</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {batch.notes && (
                        <>
                            <Separator />
                            <div>
                                <p className="text-sm text-muted-foreground mb-2">Catatan</p>
                                <div className="flex items-start gap-2 p-3 bg-muted rounded-md">
                                    <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                                    <p className="text-sm">{batch.notes}</p>
                                </div>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Material Allocations */}
            {batch.materialAllocations && batch.materialAllocations.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Alokasi Material</CardTitle>
                        <CardDescription>Material yang dialokasikan untuk batch ini</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {batch.materialAllocations.map((allocation) => (
                                <div
                                    key={allocation.materialId}
                                    className="flex items-center justify-between p-3 border rounded-lg"
                                >
                                    <div className="flex-1">
                                        <p className="font-medium">{allocation.material.name}</p>
                                        <p className="text-sm text-muted-foreground">
                                            Kode: {allocation.material.code}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold">
                                            {allocation.requestedQty} {allocation.material.unit}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            Stock: {allocation.material.currentStock}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Sub-Batches (shown when status is after CUTTING_VERIFIED) */}
            {["CUTTING_VERIFIED", "ASSIGNED_TO_SEWER", "IN_SEWING", "SEWING_COMPLETED", "SEWING_VERIFIED", "IN_FINISHING", "FINISHING_COMPLETED", "WAREHOUSE_VERIFIED", "COMPLETED"].includes(batch.status) && (
                <SubBatchList
                    batchId={batch.id}
                    onRefresh={fetchBatchDetail}
                />
            )}

            {/* Production Progress */}
            <div className="grid gap-4 md:grid-cols-3">
                {/* Cutting Task */}
                {batch.cuttingTask && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <span className="text-xl">✂️</span>
                                Pemotongan
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div>
                                <p className="text-sm text-muted-foreground">Pemotong</p>
                                <p className="font-medium">{batch.cuttingTask.assignedTo?.name || "-"}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Status</p>
                                {getStatusBadge(batch.cuttingTask.status)}
                            </div>
                            <Separator />
                            <div className="grid grid-cols-2 gap-2 text-sm">
                                <div>
                                    <p className="text-muted-foreground">Material</p>
                                    <p className="font-medium">{batch.cuttingTask.materialReceived}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Completed</p>
                                    <p className="font-medium text-green-600">
                                        {batch.cuttingTask.piecesCompleted}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Reject</p>
                                    <p className="font-medium text-red-600">
                                        {batch.cuttingTask.rejectPieces}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Waste</p>
                                    <p className="font-medium">{batch.cuttingTask.wasteQty || 0}</p>
                                </div>
                            </div>
                            {batch.cuttingTask.notes && (
                                <>
                                    <Separator />
                                    <div>
                                        <p className="text-sm text-muted-foreground mb-1">Catatan</p>
                                        <p className="text-sm bg-muted p-2 rounded">
                                            {batch.cuttingTask.notes}
                                        </p>
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Sewing Task */}
                {batch.sewingTask && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <span className="text-xl">🧵</span>
                                Penjahitan
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div>
                                <p className="text-sm text-muted-foreground">Penjahit</p>
                                <p className="font-medium">{batch.sewingTask.assignedTo?.name || "-"}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Status</p>
                                {getStatusBadge(batch.sewingTask.status)}
                            </div>
                            <Separator />
                            <div className="grid grid-cols-2 gap-2 text-sm">
                                <div>
                                    <p className="text-muted-foreground">Received</p>
                                    <p className="font-medium">{batch.sewingTask.piecesReceived}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Completed</p>
                                    <p className="font-medium text-green-600">
                                        {batch.sewingTask.piecesCompleted}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Reject</p>
                                    <p className="font-medium text-red-600">
                                        {batch.sewingTask.rejectPieces}
                                    </p>
                                </div>
                            </div>
                            {batch.sewingTask.notes && (
                                <>
                                    <Separator />
                                    <div>
                                        <p className="text-sm text-muted-foreground mb-1">Catatan</p>
                                        <p className="text-sm bg-muted p-2 rounded">
                                            {batch.sewingTask.notes}
                                        </p>
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Finishing Task */}
                {batch.finishingTask && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <span className="text-xl">✨</span>
                                Finishing
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div>
                                <p className="text-sm text-muted-foreground">Finisher</p>
                                <p className="font-medium">{batch.finishingTask.assignedTo?.name || "-"}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Status</p>
                                {getStatusBadge(batch.finishingTask.status)}
                            </div>
                            <Separator />
                            <div className="grid grid-cols-2 gap-2 text-sm">
                                <div>
                                    <p className="text-muted-foreground">Received</p>
                                    <p className="font-medium">{batch.finishingTask.piecesReceived}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Completed</p>
                                    <p className="font-medium text-green-600">
                                        {batch.finishingTask.piecesCompleted}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Reject</p>
                                    <p className="font-medium text-red-600">
                                        {batch.finishingTask.rejectPieces}
                                    </p>
                                </div>
                            </div>
                            {batch.finishingTask.notes && (
                                <>
                                    <Separator />
                                    <div>
                                        <p className="text-sm text-muted-foreground mb-1">Catatan</p>
                                        <p className="text-sm bg-muted p-2 rounded">
                                            {batch.finishingTask.notes}
                                        </p>
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Timeline History */}
            <Card>
                <CardHeader>
                    <CardTitle>Riwayat Kegiatan Produksi</CardTitle>
                    <CardDescription>Timeline aktivitas batch dari awal hingga selesai</CardDescription>
                </CardHeader>
                <CardContent>
                    {loadingTimeline ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin" />
                        </div>
                    ) : timeline.length > 0 ? (
                        <div className="space-y-4">
                            {timeline.map((event, index) => (
                                <div key={event.id} className="flex gap-4">
                                    <div className="flex flex-col items-center">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-lg">
                                            {getEventIcon(event.event)}
                                        </div>
                                        {index < timeline.length - 1 && (
                                            <div className="w-px h-full bg-border mt-2" />
                                        )}
                                    </div>
                                    <div className="flex-1 pb-6">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <p className="font-medium">{getEventLabel(event.event)}</p>
                                                {event.details && (
                                                    <p className="text-sm text-muted-foreground mt-1">
                                                        {event.details}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-2">
                                            {formatDate(event.createdAt)}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-muted-foreground">
                            <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-20" />
                            <p className="text-sm">Belum ada riwayat untuk batch ini</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* QR Code Dialog */}
            <Dialog open={isQRDialogOpen} onOpenChange={setIsQRDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>QR Code - {batch?.batchSku}</DialogTitle>
                        <DialogDescription>
                            Scan QR Code ini untuk tracking dan verifikasi batch produksi
                        </DialogDescription>
                    </DialogHeader>
                    {batch && (
                        <QRCodeGenerator
                            batchSku={batch.batchSku}
                            productName={batch.product.name}
                            targetQuantity={batch.targetQuantity}
                            batchId={batch.id}
                        />
                    )}
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Production Batch?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete batch <strong>{batch?.batchSku}</strong>?
                            <span className="block mt-2 text-muted-foreground">
                                This action cannot be undone. Only batches with PENDING status can be deleted.
                            </span>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteBatch}
                            disabled={isDeleting}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {isDeleting ? "Deleting..." : "Delete Batch"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
