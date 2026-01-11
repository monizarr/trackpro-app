"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Calendar, Package, User, AlertCircle, CheckCircle2, Loader2, FileText, Trash2, QrCode, CheckCircle, UserPlus, Scissors } from "lucide-react";
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
    DialogFooter,
} from "@/components/ui/dialog";
import { QRCodeGenerator } from "@/components/qr-code-generator";
import { SubBatchList } from "@/components/sub-batch-list";
import { CreateSubBatchDialog } from "@/components/create-sub-batch-dialog";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Material {
    id: string;
    code: string;
    name: string;
    unit: string;
    currentStock: number;
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

interface MaterialAllocation {
    materialId: string;
    materialName: string;
    color: string;
    rollQuantity: number;
    requestedQty: number;
    unit: string;
    availableStock: number;
    material: Material;
}

interface Product {
    id: string;
    sku: string;
    name: string;
}

interface Cutter {
    id: string;
    name: string;
    email: string;
    _count: {
        cuttingTasks: number;
    };
}

interface Sewer {
    id: string;
    name: string;
    email: string;
    _count: {
        sewingTasks: number;
    };
}

interface Finisher {
    id: string;
    name: string;
    email: string;
    _count: {
        finishingTasks: number;
    };
}

interface ProductionBatch {
    id: string;
    batchSku: string;
    status: string;
    targetQuantity: number;
    totalRolls: number;
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
    materialAllocations?: MaterialAllocation[];
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

    // Dialog states
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [confirming, setConfirming] = useState(false);

    const [showAssignDialog, setShowAssignDialog] = useState(false);
    const [selectedCutterId, setSelectedCutterId] = useState("");
    const [assignNotes, setAssignNotes] = useState("");
    const [assigning, setAssigning] = useState(false);

    const [showVerifyDialog, setShowVerifyDialog] = useState(false);
    const [verifyAction, setVerifyAction] = useState<"approve" | "reject">("approve");
    const [verifyNotes, setVerifyNotes] = useState("");
    const [verifying, setVerifying] = useState(false);

    const [showInputCuttingDialog, setShowInputCuttingDialog] = useState(false);
    const [cuttingResults, setCuttingResults] = useState<Array<{ productSize: string; color: string; actualPieces: number }>>([]);
    const [cuttingNotes, setCuttingNotes] = useState("");
    const [submittingCutting, setSubmittingCutting] = useState(false);

    const [showAssignSewerDialog, setShowAssignSewerDialog] = useState(false);
    const [selectedSewerId, setSelectedSewerId] = useState("");
    const [assignSewerNotes, setAssignSewerNotes] = useState("");
    const [assigningSewer, setAssigningSewer] = useState(false);

    const [showVerifySewingDialog, setShowVerifySewingDialog] = useState(false);
    const [verifySewingAction, setVerifySewingAction] = useState<"approve" | "reject">("approve");
    const [verifySewingNotes, setVerifySewingNotes] = useState("");
    const [verifyingSewing, setVerifyingSewing] = useState(false);

    const [showAssignFinisherDialog, setShowAssignFinisherDialog] = useState(false);
    const [selectedFinisherId, setSelectedFinisherId] = useState("");
    const [assignFinisherNotes, setAssignFinisherNotes] = useState("");
    const [assigningFinisher, setAssigningFinisher] = useState(false);

    const [showSubBatchDialog, setShowSubBatchDialog] = useState(false);

    const [showCompleteDialog, setShowCompleteDialog] = useState(false);
    const [completeNotes, setCompleteNotes] = useState("");
    const [completing, setCompleting] = useState(false);

    // Workers list
    const [cutters, setCutters] = useState<Cutter[]>([]);
    const [sewers, setSewers] = useState<Sewer[]>([]);
    const [finishers, setFinishers] = useState<Finisher[]>([]);

    useEffect(() => {
        fetchBatchDetail();
        fetchTimeline();
        fetchWorkers();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [resolvedParams.id]);

    const fetchWorkers = async () => {
        try {
            // Fetch cutters
            const cuttersResponse = await fetch("/api/users/cutters");
            const cuttersData = await cuttersResponse.json();
            if (cuttersData.success) {
                setCutters(cuttersData.data || []);
            }

            // Fetch sewers
            const sewersResponse = await fetch("/api/users/sewers");
            const sewersData = await sewersResponse.json();
            if (sewersData.success) {
                setSewers(sewersData.data || []);
            }

            // Fetch finishers
            const finishersResponse = await fetch("/api/users/finishers");
            const finishersData = await finishersResponse.json();
            if (finishersData.success) {
                setFinishers(finishersData.data || []);
            }
        } catch (error) {
            console.error("Error fetching workers:", error);
        }
    };

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

    const handleConfirmBatch = async () => {
        if (!batch) return;

        setConfirming(true);
        try {
            const response = await fetch(`/api/production-batches/${batch.id}/confirm`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
            });

            const result = await response.json();

            if (result.success) {
                toast.success("Berhasil", result.message || "Batch berhasil dikonfirmasi");
                setShowConfirmDialog(false);
                fetchBatchDetail();
            } else {
                toast.error("Error", result.error || "Gagal konfirmasi batch");
            }
        } catch (error) {
            console.error("Error confirming batch:", error);
            toast.error("Error", "Terjadi kesalahan saat konfirmasi batch");
        } finally {
            setConfirming(false);
        }
    };

    const handleAssignToCutter = async () => {
        if (!batch || !selectedCutterId) {
            toast.error("Error", "Pilih pemotong terlebih dahulu");
            return;
        }

        setAssigning(true);
        try {
            const response = await fetch(`/api/production-batches/${batch.id}/assign-cutter`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    assignedToId: selectedCutterId,
                    notes: assignNotes,
                }),
            });

            const result = await response.json();

            if (result.success) {
                toast.success("Berhasil", result.message || "Batch berhasil di-assign ke pemotong");
                setShowAssignDialog(false);
                setSelectedCutterId("");
                setAssignNotes("");
                fetchBatchDetail();
            } else {
                toast.error("Error", result.error || "Gagal assign batch");
            }
        } catch (error) {
            console.error("Error assigning batch to cutter:", error);
            toast.error("Error", "Terjadi kesalahan saat assign batch");
        } finally {
            setAssigning(false);
        }
    };

    const handleVerifyCutting = async () => {
        if (!batch?.cuttingTask) return;

        setVerifying(true);
        try {
            const response = await fetch(`/api/cutting-tasks/${batch.cuttingTask.id}/verify`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    action: verifyAction,
                    notes: verifyNotes,
                }),
            });

            const result = await response.json();

            if (result.success) {
                toast.success("Berhasil", result.message || "Verifikasi berhasil");
                setShowVerifyDialog(false);
                setVerifyNotes("");
                fetchBatchDetail();
            } else {
                toast.error("Error", result.error || "Gagal verifikasi");
            }
        } catch (error) {
            console.error("Error verifying cutting:", error);
            toast.error("Error", "Terjadi kesalahan saat verifikasi");
        } finally {
            setVerifying(false);
        }
    };

    const handleSubmitCuttingResults = async () => {
        if (!batch) return;

        const totalActual = cuttingResults.reduce((sum, r) => sum + r.actualPieces, 0);
        if (totalActual === 0) {
            toast.error("Error", "Total actual pieces harus lebih dari 0");
            return;
        }

        setSubmittingCutting(true);
        try {
            const response = await fetch(`/api/production-batches/${batch.id}/input-cutting-results`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    cuttingResults,
                    notes: cuttingNotes,
                }),
            });

            const result = await response.json();

            if (result.success) {
                toast.success("Berhasil", result.message || "Hasil potongan berhasil disimpan");
                setShowInputCuttingDialog(false);
                setCuttingResults([]);
                setCuttingNotes("");
                fetchBatchDetail();
            } else {
                toast.error("Error", result.error || "Gagal menyimpan hasil potongan");
            }
        } catch (error) {
            console.error("Error submitting cutting results:", error);
            toast.error("Error", "Terjadi kesalahan saat menyimpan hasil potongan");
        } finally {
            setSubmittingCutting(false);
        }
    };

    const handleAssignToSewer = async () => {
        if (!batch || !selectedSewerId) {
            toast.error("Error", "Pilih penjahit terlebih dahulu");
            return;
        }

        setAssigningSewer(true);
        try {
            const response = await fetch(`/api/production-batches/${batch.id}/assign-sewer`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    assignedToId: selectedSewerId,
                    notes: assignSewerNotes,
                }),
            });

            const result = await response.json();

            if (result.success) {
                toast.success("Berhasil", result.message || "Batch berhasil di-assign ke penjahit");
                setShowAssignSewerDialog(false);
                setSelectedSewerId("");
                setAssignSewerNotes("");
                fetchBatchDetail();
            } else {
                toast.error("Error", result.error || "Gagal assign batch");
            }
        } catch (error) {
            console.error("Error assigning batch to sewer:", error);
            toast.error("Error", "Terjadi kesalahan saat assign batch");
        } finally {
            setAssigningSewer(false);
        }
    };

    const handleVerifySewing = async () => {
        if (!batch?.sewingTask) return;

        setVerifyingSewing(true);
        try {
            const response = await fetch(`/api/sewing-tasks/${batch.sewingTask.id}/verify`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    action: verifySewingAction,
                    notes: verifySewingNotes,
                }),
            });

            const result = await response.json();

            if (result.success) {
                toast.success("Berhasil", result.message || "Verifikasi berhasil");
                setShowVerifySewingDialog(false);
                setVerifySewingNotes("");
                fetchBatchDetail();
            } else {
                toast.error("Error", result.error || "Gagal verifikasi");
            }
        } catch (error) {
            console.error("Error verifying sewing:", error);
            toast.error("Error", "Terjadi kesalahan saat verifikasi");
        } finally {
            setVerifyingSewing(false);
        }
    };

    const handleAssignToFinisher = async () => {
        if (!batch || !selectedFinisherId) {
            toast.error("Error", "Pilih finisher terlebih dahulu");
            return;
        }

        setAssigningFinisher(true);
        try {
            const response = await fetch(`/api/production-batches/${batch.id}/assign-finisher`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    assignedToId: selectedFinisherId,
                    notes: assignFinisherNotes,
                }),
            });

            const result = await response.json();

            if (result.success) {
                toast.success("Berhasil", result.message || "Batch berhasil di-assign ke finisher");
                setShowAssignFinisherDialog(false);
                setSelectedFinisherId("");
                setAssignFinisherNotes("");
                fetchBatchDetail();
            } else {
                toast.error("Error", result.error || "Gagal assign batch");
            }
        } catch (error) {
            console.error("Error assigning batch to finisher:", error);
            toast.error("Error", "Terjadi kesalahan saat assign batch");
        } finally {
            setAssigningFinisher(false);
        }
    };

    const handleCompleteBatch = async () => {
        if (!batch) return;

        setCompleting(true);
        try {
            const response = await fetch(`/api/production-batches/${batch.id}/complete`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    notes: completeNotes,
                }),
            });

            const result = await response.json();

            if (result.success) {
                toast.success("Berhasil", result.message || "Batch berhasil diselesaikan");
                setShowCompleteDialog(false);
                setCompleteNotes("");
                fetchBatchDetail();
            } else {
                toast.error("Error", result.error || "Gagal menyelesaikan batch");
            }
        } catch (error) {
            console.error("Error completing batch:", error);
            toast.error("Error", "Terjadi kesalahan saat menyelesaikan batch");
        } finally {
            setCompleting(false);
        }
    };

    const getStatusBadge = (status: string) => {
        const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
            PENDING: { label: "Menunggu", variant: "secondary" },
            MATERIAL_REQUESTED: { label: "Material Diminta", variant: "secondary" },
            MATERIAL_ALLOCATED: { label: "Material Dialokasi", variant: "outline" },
            ASSIGNED_TO_CUTTER: { label: "Di-assign ke Pemotong", variant: "default" },
            IN_CUTTING: { label: "Proses Pemotongan", variant: "default" },
            CUTTING_COMPLETED: { label: "Potongan Selesai", variant: "secondary" },
            CUTTING_VERIFIED: { label: "Potongan Terverifikasi", variant: "outline" },
            ASSIGNED_TO_SEWER: { label: "Di-assign ke Penjahit", variant: "default" },
            IN_SEWING: { label: "Proses Penjahitan", variant: "default" },
            SEWING_COMPLETED: { label: "Jahitan Selesai", variant: "secondary" },
            SEWING_VERIFIED: { label: "Jahitan Terverifikasi", variant: "outline" },
            IN_FINISHING: { label: "Proses Finishing", variant: "default" },
            FINISHING_COMPLETED: { label: "Finishing Selesai", variant: "secondary" },
            WAREHOUSE_VERIFIED: { label: "Terverifikasi", variant: "outline" },
            COMPLETED: { label: "Selesai", variant: "default" },
            CANCELLED: { label: "Dibatalkan", variant: "destructive" },
            CUTTING: { label: "Pemotongan", variant: "default" },
            SEWING: { label: "Penjahitan", variant: "default" },
            FINISHING: { label: "Finishing", variant: "default" },
        };
        const config = statusConfig[status] || { label: status, variant: "outline" };
        return <Badge variant={config.variant}>{config.label}</Badge>;
    };

    const getStatusLabel = (status: string) => {
        const statusMap: Record<string, string> = {
            PENDING: "Menunggu",
            MATERIAL_REQUESTED: "Material Diminta",
            MATERIAL_ALLOCATED: "Material Dialokasi",
            ASSIGNED_TO_CUTTER: "Di-assign ke Pemotong",
            IN_CUTTING: "Proses Pemotongan",
            CUTTING_COMPLETED: "Pemotongan Selesai",
            CUTTING_VERIFIED: "Potongan Terverifikasi",
            ASSIGNED_TO_SEWER: "Di-assign ke Penjahit",
            IN_SEWING: "Proses Penjahitan",
            SEWING_COMPLETED: "Penjahitan Selesai",
            SEWING_VERIFIED: "Jahitan Terverifikasi",
            IN_FINISHING: "Proses Finishing",
            FINISHING_COMPLETED: "Finishing Selesai",
            WAREHOUSE_VERIFIED: "Terverifikasi Gudang",
            COMPLETED: "Selesai",
            CANCELLED: "Dibatalkan",
        };
        return statusMap[status] || status;
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
            SUB_BATCHES_CREATED: "Sub-Batch Dibuat",
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
                    <div className="flex items-center gap-2">
                        <p className="text-muted-foreground">{batch.product.name}</p>
                        {getStatusBadge(batch.status)}
                    </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">

                    {/* Action Buttons Based on Status */}
                    {(batch.status === "PENDING" || batch.status === "MATERIAL_REQUESTED") && (
                        <Button
                            size="sm"
                            onClick={() => setShowConfirmDialog(true)}
                        >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Konfirmasi Batch
                        </Button>
                    )}

                    {batch.status === "MATERIAL_ALLOCATED" && (
                        <Button
                            size="sm"
                            onClick={() => setShowAssignDialog(true)}
                        >
                            <UserPlus className="h-4 w-4 mr-2" />
                            Assign ke Pemotong
                        </Button>
                    )}

                    {batch.status === "ASSIGNED_TO_CUTTER" && (
                        <Button
                            size="sm"
                            onClick={() => {
                                // Initialize cutting results
                                if (batch.sizeColorRequests) {
                                    setCuttingResults(batch.sizeColorRequests.map((req) => ({
                                        productSize: req.productSize,
                                        color: req.color,
                                        actualPieces: req.requestedPieces,
                                    })));
                                }
                                setShowInputCuttingDialog(true);
                            }}
                        >
                            <Scissors className="h-4 w-4 mr-2" />
                            Input Hasil Potongan
                        </Button>
                    )}

                    {batch.status === "CUTTING_COMPLETED" && (
                        <Button
                            size="sm"
                            onClick={() => setShowVerifyDialog(true)}
                        >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Verifikasi Potongan
                        </Button>
                    )}

                    {batch.status === "CUTTING_VERIFIED" && (
                        <>
                            {/* <Button
                                size="sm"
                                onClick={() => setShowAssignSewerDialog(true)}
                            >
                                <UserPlus className="h-4 w-4 mr-2" />
                                Assign ke Penjahit
                            </Button> */}
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setShowSubBatchDialog(true)}
                            >
                                <Package className="h-4 w-4 mr-2" />
                                Buat Sub-Batch
                            </Button>
                        </>
                    )}

                    {batch.status === "SEWING_COMPLETED" && (
                        <Button
                            size="sm"
                            onClick={() => setShowVerifySewingDialog(true)}
                        >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Verifikasi Jahitan
                        </Button>
                    )}

                    {batch.status === "SEWING_VERIFIED" && (
                        <Button
                            size="sm"
                            onClick={() => setShowAssignFinisherDialog(true)}
                        >
                            <UserPlus className="h-4 w-4 mr-2" />
                            Assign ke Finisher
                        </Button>
                    )}

                    {batch.status === "WAREHOUSE_VERIFIED" && (
                        <Button
                            size="sm"
                            onClick={() => setShowCompleteDialog(true)}
                        >
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Selesaikan Batch
                        </Button>
                    )}

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsQRDialogOpen(true)}
                    >
                        <QrCode className="h-4 w-4 mr-2" />
                        Show QR Code
                    </Button>
                </div>
            </div>

            {/* Batch Overview */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {/* <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Target Quantity</CardTitle>
                        <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{batch.targetQuantity} pcs</div>
                        <p className="text-xs text-muted-foreground">Target produksi</p>
                    </CardContent>
                </Card> */}

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Jumlah Produk Jadi</CardTitle>
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{batch.actualQuantity} pcs</div>
                        <p className="text-xs text-muted-foreground">Berhasil diproduksi</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Jumlah Produk Reject</CardTitle>
                        <AlertCircle className="h-4 w-4 text-red-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">{batch.rejectQuantity} pcs</div>
                        <p className="text-xs text-muted-foreground">Produk reject</p>
                    </CardContent>
                </Card>

                {/* <Card>
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
                </Card> */}
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
                                    key={`${allocation.materialId}-${allocation.color}`}
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

            {/* Production Progress */}
            <div className="grid gap-4 ">
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

                            {/* Cutting Results Detail */}
                            {batch.cuttingResults && batch.cuttingResults.length > 0 && (
                                <>
                                    <Separator />
                                    <div>
                                        <p className="text-sm font-medium mb-2">Hasil Potongan per Varian</p>
                                        <div className="space-y-2">
                                            {batch.cuttingResults.map((result) => (
                                                <div
                                                    key={result.id}
                                                    className="flex items-center justify-between p-2 bg-muted/50 rounded text-sm"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant="outline" className="font-mono">
                                                            {result.productSize}
                                                        </Badge>
                                                        <span className="text-muted-foreground">•</span>
                                                        <span className="font-medium">{result.color}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <span className="font-semibold text-green-600">
                                                            {result.actualPieces}
                                                        </span>
                                                        <span className="text-muted-foreground text-xs">pcs</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}

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


            {/* Sub-Batches (shown when status is after CUTTING_VERIFIED) */}
            {["CUTTING_VERIFIED", "ASSIGNED_TO_SEWER", "IN_SEWING", "SEWING_COMPLETED", "SEWING_VERIFIED", "IN_FINISHING", "FINISHING_COMPLETED", "WAREHOUSE_VERIFIED", "COMPLETED"].includes(batch.status) && (
                <SubBatchList
                    batchId={batch.id}
                    onRefresh={fetchBatchDetail}
                />
            )}

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

            {/* Confirm Batch Dialog */}
            <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Konfirmasi Batch Produksi</DialogTitle>
                        <DialogDescription>
                            Konfirmasi batch ini untuk mengalokasikan material dan memulai proses produksi
                        </DialogDescription>
                    </DialogHeader>

                    {batch && (
                        <div className="space-y-4 py-4">
                            {/* Batch Info */}
                            <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg">
                                <div>
                                    <Label className="text-muted-foreground">Kode Batch</Label>
                                    <p className="font-mono font-medium">{batch.batchSku}</p>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground">Produk</Label>
                                    <p className="font-medium">{batch.product.name}</p>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground">Total Roll Bahan</Label>
                                    <p className="font-medium">{batch.totalRolls} roll</p>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground">Status</Label>
                                    <Badge>{getStatusLabel(batch.status)}</Badge>
                                </div>
                            </div>

                            {/* Material Allocations */}
                            <div className="space-y-2">
                                <Label>Material yang Dibutuhkan</Label>
                                {batch.materialColorAllocations && batch.materialColorAllocations.length > 0 ? (
                                    <div className="rounded-md border">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Material</TableHead>
                                                    <TableHead>Warna</TableHead>
                                                    <TableHead className="text-right">Roll</TableHead>
                                                    <TableHead className="text-right">Kebutuhan</TableHead>
                                                    <TableHead className="text-right">Stok</TableHead>
                                                    <TableHead className="text-center">Status</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {batch.materialColorAllocations.map((allocation, idx) => {
                                                    const available = Number(allocation.materialColorVariant.stock)
                                                    const needed = Number(allocation.allocatedQty)
                                                    const sufficient = available >= needed

                                                    return (
                                                        <TableRow key={idx}>
                                                            <TableCell>
                                                                <div>
                                                                    <p className="font-medium">{allocation.materialColorVariant.material.name}</p>
                                                                    <p className="text-sm text-muted-foreground">
                                                                        {allocation.materialColorVariant.material.code}
                                                                    </p>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell>
                                                                <Badge variant="outline">{allocation.materialColorVariant.colorName}</Badge>
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                {allocation.rollQuantity}
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                ~ {needed} m
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                {available} {allocation.materialColorVariant.material.unit}
                                                            </TableCell>
                                                            <TableCell className="text-center">
                                                                {sufficient ? (
                                                                    <Badge className="bg-green-500">
                                                                        <CheckCircle className="h-3 w-3 mr-1" />
                                                                        Cukup
                                                                    </Badge>
                                                                ) : (
                                                                    <Badge variant="destructive">
                                                                        <AlertCircle className="h-3 w-3 mr-1" />
                                                                        Kurang
                                                                    </Badge>
                                                                )}
                                                            </TableCell>
                                                        </TableRow>
                                                    )
                                                })}
                                            </TableBody>
                                        </Table>
                                    </div>
                                ) : batch.materialAllocations && batch.materialAllocations.length > 0 ? (
                                    <div className="rounded-md border">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Material</TableHead>
                                                    <TableHead>Warna</TableHead>
                                                    <TableHead className="text-right">Roll</TableHead>
                                                    <TableHead className="text-right">Kebutuhan</TableHead>
                                                    <TableHead className="text-right">Stok</TableHead>
                                                    <TableHead className="text-center">Status</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {batch.materialAllocations.map((allocation, idx) => {
                                                    const available = Number(allocation.material?.currentStock) || 0
                                                    const needed = Number(allocation.requestedQty)
                                                    const sufficient = available >= needed

                                                    return (
                                                        <TableRow key={idx}>
                                                            <TableCell>
                                                                <div>
                                                                    <p className="font-medium">{allocation.material?.name || allocation.materialName}</p>
                                                                    <p className="text-sm text-muted-foreground">
                                                                        {allocation.material?.code}
                                                                    </p>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell>
                                                                <Badge variant="outline">{allocation.color}</Badge>
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                {allocation.rollQuantity}
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                {needed.toFixed(2)} {allocation.unit}
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                {available.toFixed(2)} {allocation.unit}
                                                            </TableCell>
                                                            <TableCell className="text-center">
                                                                {sufficient ? (
                                                                    <Badge className="bg-green-500">
                                                                        <CheckCircle className="h-3 w-3 mr-1" />
                                                                        Cukup
                                                                    </Badge>
                                                                ) : (
                                                                    <Badge variant="destructive">
                                                                        <AlertCircle className="h-3 w-3 mr-1" />
                                                                        Kurang
                                                                    </Badge>
                                                                )}
                                                            </TableCell>
                                                        </TableRow>
                                                    )
                                                })}
                                            </TableBody>
                                        </Table>
                                    </div>
                                ) : (
                                    <Alert>
                                        <Package className="h-4 w-4" />
                                        <AlertDescription>
                                            Tidak ada material yang diperlukan untuk batch ini
                                        </AlertDescription>
                                    </Alert>
                                )}
                            </div>

                            {/* Warning if insufficient stock */}
                            {batch.materialColorAllocations?.some(
                                (a) => Number(a.materialColorVariant.stock) < Number(a.allocatedQty)
                            ) && (
                                    <Alert variant="destructive">
                                        <AlertCircle className="h-4 w-4" />
                                        <AlertDescription>
                                            <strong>Peringatan:</strong> Beberapa material tidak mencukupi.
                                            Silakan tambah stok material terlebih dahulu sebelum konfirmasi.
                                        </AlertDescription>
                                    </Alert>
                                )}

                            {/* Confirmation Info */}
                            <Alert>
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>
                                    Dengan mengkonfirmasi batch ini, material akan dialokasikan dan stok akan
                                    dikurangi secara otomatis. Batch akan siap untuk memulai proses produksi.
                                </AlertDescription>
                            </Alert>
                        </div>
                    )}

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setShowConfirmDialog(false)}
                            disabled={confirming}
                        >
                            Batal
                        </Button>
                        <Button
                            onClick={handleConfirmBatch}
                            disabled={
                                confirming ||
                                batch?.materialColorAllocations?.some(
                                    (a) => Number(a.materialColorVariant.stock) < Number(a.allocatedQty)
                                ) ||
                                false
                            }
                        >
                            {confirming ? "Mengkonfirmasi..." : "Konfirmasi Batch"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Assign to Cutter Dialog */}
            <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Assign ke Pemotong</DialogTitle>
                        <DialogDescription>
                            Pilih pemotong untuk mengerjakan batch ini
                        </DialogDescription>
                    </DialogHeader>
                    {batch && (
                        <div className="space-y-4 py-4">
                            <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg bg-muted/50">
                                <div>
                                    <Label className="text-muted-foreground">Kode Batch</Label>
                                    <p className="font-mono font-medium">{batch.batchSku}</p>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground">Produk</Label>
                                    <p className="font-medium">{batch.product.name}</p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="cutter">Pilih Pemotong *</Label>
                                <Select
                                    id="cutter"
                                    value={selectedCutterId}
                                    onChange={(e) => setSelectedCutterId(e.target.value)}
                                >
                                    <option value="">Pilih pemotong</option>
                                    {cutters.map((cutter) => (
                                        <option key={cutter.id} value={cutter.id}>
                                            {cutter.name} ({cutter._count.cuttingTasks} task aktif)
                                        </option>
                                    ))}
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="assignNotes">Catatan (Opsional)</Label>
                                <Textarea
                                    id="assignNotes"
                                    placeholder="Tambahkan catatan untuk pemotong..."
                                    value={assignNotes}
                                    onChange={(e) => setAssignNotes(e.target.value)}
                                    rows={3}
                                />
                            </div>

                            <Alert>
                                <UserPlus className="h-4 w-4" />
                                <AlertDescription>
                                    Setelah di-assign, pemotong akan menerima notifikasi dan dapat mulai mengerjakan batch ini.
                                </AlertDescription>
                            </Alert>
                        </div>
                    )}
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setShowAssignDialog(false);
                                setSelectedCutterId("");
                                setAssignNotes("");
                            }}
                            disabled={assigning}
                        >
                            Batal
                        </Button>
                        <Button
                            onClick={handleAssignToCutter}
                            disabled={assigning || !selectedCutterId}
                        >
                            {assigning ? "Mengassign..." : "Assign ke Pemotong"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Input Cutting Results Dialog */}
            <Dialog open={showInputCuttingDialog} onOpenChange={setShowInputCuttingDialog}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Input Hasil Potongan</DialogTitle>
                        <DialogDescription>
                            Input hasil potongan untuk batch ini
                        </DialogDescription>
                    </DialogHeader>
                    {batch && (
                        <div className="space-y-4 py-4">
                            <div className="space-y-3">
                                <Label>Hasil Potongan per Size & Warna *</Label>
                                <div className="border rounded-lg overflow-hidden">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Size</TableHead>
                                                <TableHead>Warna</TableHead>
                                                <TableHead>Target</TableHead>
                                                <TableHead className="text-right">Actual Pieces</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {cuttingResults.map((result, idx) => {
                                                const request = batch.sizeColorRequests?.find(
                                                    r => r.productSize === result.productSize && r.color === result.color
                                                );
                                                return (
                                                    <TableRow key={idx}>
                                                        <TableCell className="font-medium">{result.productSize}</TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline">{result.color}</Badge>
                                                        </TableCell>
                                                        <TableCell>{request?.requestedPieces || 0} pcs</TableCell>
                                                        <TableCell className="text-right">
                                                            <Input
                                                                type="number"
                                                                min="0"
                                                                value={result.actualPieces}
                                                                onChange={(e) => {
                                                                    const newResults = [...cuttingResults];
                                                                    newResults[idx].actualPieces = parseInt(e.target.value) || 0;
                                                                    setCuttingResults(newResults);
                                                                }}
                                                                className="w-24 text-right"
                                                            />
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="cuttingNotes">Catatan</Label>
                                <Textarea
                                    id="cuttingNotes"
                                    placeholder="Tambahkan catatan hasil potongan (opsional)..."
                                    value={cuttingNotes}
                                    onChange={(e) => setCuttingNotes(e.target.value)}
                                    rows={3}
                                />
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setShowInputCuttingDialog(false);
                                setCuttingResults([]);
                                setCuttingNotes("");
                            }}
                            disabled={submittingCutting}
                        >
                            Batal
                        </Button>
                        <Button
                            onClick={handleSubmitCuttingResults}
                            disabled={submittingCutting || cuttingResults.reduce((sum, r) => sum + r.actualPieces, 0) === 0}
                        >
                            {submittingCutting ? "Menyimpan..." : "Simpan Hasil Potongan"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Verify Cutting Dialog */}
            <Dialog open={showVerifyDialog} onOpenChange={setShowVerifyDialog}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Verifikasi Potongan</DialogTitle>
                        <DialogDescription>
                            Periksa hasil pemotongan dan approve atau tolak
                        </DialogDescription>
                    </DialogHeader>
                    {batch && batch.cuttingTask && (
                        <div className="space-y-4 py-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Hasil Pemotongan</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {batch.cuttingResults && batch.cuttingResults.length > 0 ? (
                                        <div className="border rounded-lg overflow-hidden">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>Size</TableHead>
                                                        <TableHead>Warna</TableHead>
                                                        <TableHead className="text-right">Actual Pieces</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {batch.cuttingResults.map((result, idx) => (
                                                        <TableRow key={idx}>
                                                            <TableCell>
                                                                <Badge variant="outline">{result.productSize}</Badge>
                                                            </TableCell>
                                                            <TableCell>
                                                                <Badge variant="secondary">{result.color}</Badge>
                                                            </TableCell>
                                                            <TableCell className="text-right font-bold">
                                                                {result.actualPieces} pcs
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    ) : (
                                        <p className="text-center text-muted-foreground">Belum ada hasil potongan</p>
                                    )}
                                    {batch.cuttingTask.notes && (
                                        <div className="p-3 bg-muted rounded-lg">
                                            <Label className="text-xs text-muted-foreground">Catatan dari Pemotong</Label>
                                            <p className="text-sm mt-1">{batch.cuttingTask.notes}</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            <div className="space-y-3">
                                <Label>Aksi Verifikasi *</Label>
                                <div className="flex gap-4">
                                    <label className="flex items-center space-x-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="verifyAction"
                                            value="approve"
                                            checked={verifyAction === "approve"}
                                            onChange={(e) => setVerifyAction(e.target.value as "approve" | "reject")}
                                            className="w-4 h-4"
                                        />
                                        <span className="text-sm font-medium text-green-600">✓ Approve (Setujui)</span>
                                    </label>
                                    <label className="flex items-center space-x-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="verifyAction"
                                            value="reject"
                                            checked={verifyAction === "reject"}
                                            onChange={(e) => setVerifyAction(e.target.value as "approve" | "reject")}
                                            className="w-4 h-4"
                                        />
                                        <span className="text-sm font-medium text-red-600">✗ Reject (Tolak)</span>
                                    </label>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="verifyNotes">
                                    Catatan Verifikasi {verifyAction === "reject" && "*"}
                                </Label>
                                <Textarea
                                    id="verifyNotes"
                                    placeholder={verifyAction === "reject"
                                        ? "Jelaskan alasan penolakan..."
                                        : "Tambahkan catatan (opsional)..."
                                    }
                                    value={verifyNotes}
                                    onChange={(e) => setVerifyNotes(e.target.value)}
                                    rows={3}
                                />
                            </div>

                            {verifyAction === "approve" ? (
                                <Alert>
                                    <CheckCircle className="h-4 w-4" />
                                    <AlertDescription>
                                        Dengan approve, batch akan berstatus CUTTING_VERIFIED dan siap untuk tahap selanjutnya.
                                    </AlertDescription>
                                </Alert>
                            ) : (
                                <Alert variant="destructive">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertDescription>
                                        Dengan reject, batch akan dikembalikan ke status IN_CUTTING untuk diperbaiki.
                                    </AlertDescription>
                                </Alert>
                            )}
                        </div>
                    )}
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setShowVerifyDialog(false);
                                setVerifyNotes("");
                            }}
                            disabled={verifying}
                        >
                            Batal
                        </Button>
                        <Button
                            onClick={handleVerifyCutting}
                            disabled={verifying || (verifyAction === "reject" && !verifyNotes.trim())}
                            variant={verifyAction === "approve" ? "default" : "destructive"}
                        >
                            {verifying ? "Memverifikasi..." : verifyAction === "approve" ? "Approve" : "Reject"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Assign to Sewer Dialog */}
            <Dialog open={showAssignSewerDialog} onOpenChange={setShowAssignSewerDialog}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Assign ke Penjahit</DialogTitle>
                        <DialogDescription>
                            Pilih penjahit untuk mengerjakan batch ini
                        </DialogDescription>
                    </DialogHeader>
                    {batch && (
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="sewer">Pilih Penjahit *</Label>
                                <Select
                                    id="sewer"
                                    value={selectedSewerId}
                                    onChange={(e) => setSelectedSewerId(e.target.value)}
                                >
                                    <option value="">Pilih penjahit</option>
                                    {sewers.map((sewer) => (
                                        <option key={sewer.id} value={sewer.id}>
                                            {sewer.name} ({sewer._count.sewingTasks} task aktif)
                                        </option>
                                    ))}
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="assignSewerNotes">Catatan (Opsional)</Label>
                                <Textarea
                                    id="assignSewerNotes"
                                    placeholder="Tambahkan catatan untuk penjahit..."
                                    value={assignSewerNotes}
                                    onChange={(e) => setAssignSewerNotes(e.target.value)}
                                    rows={3}
                                />
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowAssignSewerDialog(false)} disabled={assigningSewer}>
                            Batal
                        </Button>
                        <Button onClick={handleAssignToSewer} disabled={assigningSewer || !selectedSewerId}>
                            {assigningSewer ? "Mengassign..." : "Assign ke Penjahit"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Verify Sewing Dialog */}
            <Dialog open={showVerifySewingDialog} onOpenChange={setShowVerifySewingDialog}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Verifikasi Jahitan</DialogTitle>
                        <DialogDescription>
                            Periksa hasil penjahitan dan approve atau tolak
                        </DialogDescription>
                    </DialogHeader>
                    {batch && batch.sewingTask && (
                        <div className="space-y-4 py-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Hasil Penjahitan</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <div className="grid grid-cols-3 gap-4">
                                        <div>
                                            <Label className="text-muted-foreground">Pieces Diterima</Label>
                                            <p className="text-2xl font-bold">{batch.sewingTask.piecesReceived}</p>
                                        </div>
                                        <div>
                                            <Label className="text-muted-foreground">Pieces Completed</Label>
                                            <p className="text-2xl font-bold text-green-600">{batch.sewingTask.piecesCompleted}</p>
                                        </div>
                                        <div>
                                            <Label className="text-muted-foreground">Reject Pieces</Label>
                                            <p className="text-2xl font-bold text-red-600">{batch.sewingTask.rejectPieces}</p>
                                        </div>
                                    </div>
                                    {batch.sewingTask.notes && (
                                        <div>
                                            <Label className="text-muted-foreground">Catatan dari Penjahit</Label>
                                            <p className="text-sm mt-1">{batch.sewingTask.notes}</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            <div className="space-y-3">
                                <Label>Aksi Verifikasi *</Label>
                                <div className="flex gap-4">
                                    <label className="flex items-center space-x-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="verifySewingAction"
                                            value="approve"
                                            checked={verifySewingAction === "approve"}
                                            onChange={(e) => setVerifySewingAction(e.target.value as "approve" | "reject")}
                                            className="w-4 h-4"
                                        />
                                        <span className="text-green-600 font-medium">Approve</span>
                                    </label>
                                    <label className="flex items-center space-x-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="verifySewingAction"
                                            value="reject"
                                            checked={verifySewingAction === "reject"}
                                            onChange={(e) => setVerifySewingAction(e.target.value as "approve" | "reject")}
                                            className="w-4 h-4"
                                        />
                                        <span className="text-red-600 font-medium">Reject</span>
                                    </label>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="verifySewingNotes">
                                    Catatan Verifikasi {verifySewingAction === "reject" && <span className="text-red-500">*</span>}
                                </Label>
                                <Textarea
                                    id="verifySewingNotes"
                                    placeholder={verifySewingAction === "reject"
                                        ? "Jelaskan alasan penolakan..."
                                        : "Tambahkan catatan (opsional)..."
                                    }
                                    value={verifySewingNotes}
                                    onChange={(e) => setVerifySewingNotes(e.target.value)}
                                    rows={3}
                                />
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowVerifySewingDialog(false)} disabled={verifyingSewing}>
                            Batal
                        </Button>
                        <Button
                            onClick={handleVerifySewing}
                            disabled={verifyingSewing || (verifySewingAction === "reject" && !verifySewingNotes.trim())}
                            variant={verifySewingAction === "approve" ? "default" : "destructive"}
                        >
                            {verifyingSewing ? "Memverifikasi..." : verifySewingAction === "approve" ? "Approve" : "Reject"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Assign to Finisher Dialog */}
            <Dialog open={showAssignFinisherDialog} onOpenChange={setShowAssignFinisherDialog}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Assign ke Finisher</DialogTitle>
                        <DialogDescription>
                            Pilih finisher untuk mengerjakan batch ini
                        </DialogDescription>
                    </DialogHeader>
                    {batch && (
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="finisher">Pilih Finisher *</Label>
                                <Select
                                    id="finisher"
                                    value={selectedFinisherId}
                                    onChange={(e) => setSelectedFinisherId(e.target.value)}
                                >
                                    <option value="">Pilih finisher</option>
                                    {finishers.map((finisher) => (
                                        <option key={finisher.id} value={finisher.id}>
                                            {finisher.name} ({finisher._count.finishingTasks} active tasks)
                                        </option>
                                    ))}
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="assignFinisherNotes">Catatan (Opsional)</Label>
                                <Textarea
                                    id="assignFinisherNotes"
                                    placeholder="Tambahkan catatan untuk finisher..."
                                    value={assignFinisherNotes}
                                    onChange={(e) => setAssignFinisherNotes(e.target.value)}
                                    rows={3}
                                />
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowAssignFinisherDialog(false)} disabled={assigningFinisher}>
                            Batal
                        </Button>
                        <Button onClick={handleAssignToFinisher} disabled={assigningFinisher || !selectedFinisherId}>
                            {assigningFinisher ? "Mengassign..." : "Assign ke Finisher"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Create Sub-Batch Dialog */}
            {batch && (
                <CreateSubBatchDialog
                    open={showSubBatchDialog}
                    onOpenChange={setShowSubBatchDialog}
                    batchId={batch.id}
                    batchSku={batch.batchSku}
                    cuttingResults={batch.cuttingResults || []}
                    onSuccess={fetchBatchDetail}
                />
            )}

            {/* Complete Batch Dialog */}
            <Dialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
                <DialogContent className="max-w-[95vw] sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Selesaikan Batch</DialogTitle>
                        <DialogDescription>
                            Apakah Anda yakin ingin menyelesaikan batch ini? Semua sub-batch harus sudah terverifikasi.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        {/* Batch Info */}
                        <div className="rounded-lg border p-4 space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Batch SKU:</span>
                                <span className="font-medium">{batch.batchSku}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Produk:</span>
                                <span className="font-medium">{batch.product.name}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Status Saat Ini:</span>
                                <span>{getStatusBadge(batch.status)}</span>
                            </div>
                        </div>

                        {/* Notes */}
                        <div className="space-y-2">
                            <Label htmlFor="complete-notes">Catatan (Opsional)</Label>
                            <Textarea
                                id="complete-notes"
                                placeholder="Tambahkan catatan..."
                                value={completeNotes}
                                onChange={(e) => setCompleteNotes(e.target.value)}
                                rows={3}
                            />
                        </div>

                        {/* Warning */}
                        <Alert>
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                                Pastikan semua sub-batch sudah diverifikasi oleh gudang sebelum menyelesaikan batch ini.
                            </AlertDescription>
                        </Alert>
                    </div>

                    <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setShowCompleteDialog(false);
                                setCompleteNotes("");
                            }}
                            disabled={completing}
                        >
                            Batal
                        </Button>
                        <Button
                            onClick={handleCompleteBatch}
                            disabled={completing}
                        >
                            {completing ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Memproses...
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 className="mr-2 h-4 w-4" />
                                    Selesaikan Batch
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
