"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Trash2, Package, AlertCircle, Clock, Scissors, Users, CheckCircle, Sparkles, UserPlus, Loader2 } from "lucide-react";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

type ProductionStatus = "PENDING" | "MATERIAL_REQUESTED" | "MATERIAL_ALLOCATED" | "ASSIGNED_TO_CUTTER" | "IN_CUTTING" | "CUTTING_COMPLETED" | "CUTTING_VERIFIED" | "ASSIGNED_TO_SEWER" | "IN_SEWING" | "SEWING_COMPLETED" | "SEWING_VERIFIED" | "IN_FINISHING" | "FINISHING_COMPLETED" | "WAREHOUSE_VERIFIED" | "COMPLETED" | "CANCELLED";

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
    unit: string;
}

interface MaterialColorAllocation {
    id: string;
    rollQuantity: number;
    allocatedQty: number;
    meterPerRoll: number;
    stockAtAllocation: number | null; // Stok saat alokasi dikonfirmasi
    rollQuantityAtAllocation: number | null; // Jumlah roll saat alokasi dikonfirmasi
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

export default function ProductionBatchDetailPage() {
    const params = useParams();
    const router = useRouter();
    const batchId = params.id as string;

    const [batch, setBatch] = useState<ProductionBatch | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Production action states
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

    const [showCompleteDialog, setShowCompleteDialog] = useState(false);
    const [completeNotes, setCompleteNotes] = useState("");
    const [completing, setCompleting] = useState(false);

    // Workers list
    const [cutters, setCutters] = useState<Cutter[]>([]);
    const [sewers, setSewers] = useState<Sewer[]>([]);
    const [finishers, setFinishers] = useState<Finisher[]>([]);

    useEffect(() => {
        fetchBatch();
        fetchWorkers();
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

    const fetchWorkers = async () => {
        try {
            const [cuttersRes, sewersRes, finishersRes] = await Promise.all([
                fetch("/api/users/cutters"),
                fetch("/api/users/sewers"),
                fetch("/api/users/finishers"),
            ]);

            const cuttersData = await cuttersRes.json();
            const sewersData = await sewersRes.json();
            const finishersData = await finishersRes.json();

            if (cuttersData.success) setCutters(cuttersData.data);
            if (sewersData.success) setSewers(sewersData.data);
            if (finishersData.success) setFinishers(finishersData.data);
        } catch (error) {
            console.error("Error fetching workers:", error);
        }
    };

    // ============ PRODUCTION ACTION HANDLERS ============

    // Confirm batch (material allocation)
    const handleConfirmBatch = async () => {
        try {
            setConfirming(true);
            const response = await fetch(`/api/production-batches/${batchId}/confirm`, {
                method: "POST",
            });

            const data = await response.json();
            if (data.success) {
                toast.success("Berhasil", "Batch berhasil dikonfirmasi");
                setShowConfirmDialog(false);
                fetchBatch();
            } else {
                toast.error("Gagal", data.error || "Gagal mengkonfirmasi batch");
            }
        } catch (error) {
            console.error("Error confirming batch:", error);
            toast.error("Error", "Gagal mengkonfirmasi batch");
        } finally {
            setConfirming(false);
        }
    };

    // Assign to cutter
    const handleAssignToCutter = async () => {
        if (!selectedCutterId) {
            toast.warning("Peringatan", "Pilih pemotong terlebih dahulu");
            return;
        }

        try {
            setAssigning(true);
            const response = await fetch(`/api/production-batches/${batchId}/assign-cutter`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    assignedToId: selectedCutterId,
                    notes: assignNotes,
                }),
            });

            const data = await response.json();
            if (data.success) {
                toast.success("Berhasil", "Berhasil menugaskan ke pemotong");
                setShowAssignDialog(false);
                setSelectedCutterId("");
                setAssignNotes("");
                fetchBatch();
            } else {
                toast.error("Gagal", data.error || "Gagal menugaskan ke pemotong");
            }
        } catch (error) {
            console.error("Error assigning cutter:", error);
            toast.error("Error", "Gagal menugaskan ke pemotong");
        } finally {
            setAssigning(false);
        }
    };

    // Verify cutting
    const handleVerifyCutting = async () => {
        if (!batch?.cuttingTask?.id) {
            toast.error("Error", "Tidak ada tugas potong yang perlu diverifikasi");
            return;
        }

        try {
            setVerifying(true);
            const response = await fetch(`/api/cutting-tasks/${batch.cuttingTask.id}/verify`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: verifyAction,
                    notes: verifyNotes,
                }),
            });

            const data = await response.json();
            if (data.success) {
                toast.success("Berhasil", verifyAction === "approve" ? "Pemotongan disetujui" : "Pemotongan ditolak");
                setShowVerifyDialog(false);
                setVerifyAction("approve");
                setVerifyNotes("");
                fetchBatch();
            } else {
                toast.error("Gagal", data.error || "Gagal verifikasi pemotongan");
            }
        } catch (error) {
            console.error("Error verifying cutting:", error);
            toast.error("Error", "Gagal verifikasi pemotongan");
        } finally {
            setVerifying(false);
        }
    };

    // Input cutting results
    const handleSubmitCuttingResults = async () => {
        const totalActual = cuttingResults.reduce((sum, r) => sum + r.actualPieces, 0);
        if (totalActual === 0) {
            toast.error("Error", "Total actual pieces harus lebih dari 0");
            return;
        }
        try {
            setSubmittingCutting(true);
            const response = await fetch(`/api/production-batches/${batchId}/input-cutting-results`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    cuttingResults,
                    notes: cuttingNotes,
                }),
            });

            const data = await response.json();
            if (data.success) {
                toast.success("Berhasil", "Hasil pemotongan berhasil disimpan");
                setShowInputCuttingDialog(false);
                setCuttingResults([]);
                setCuttingNotes("");
                fetchBatch();
            } else {
                toast.error("Gagal", data.error || "Gagal menyimpan hasil pemotongan");
            }
        } catch (error) {
            console.error("Error submitting cutting results:", error);
            toast.error("Error", "Gagal menyimpan hasil pemotongan");
        } finally {
            setSubmittingCutting(false);
        }
    };

    // Assign to sewer
    const handleAssignToSewer = async () => {
        if (!selectedSewerId) {
            toast.warning("Peringatan", "Pilih penjahit terlebih dahulu");
            return;
        }

        try {
            setAssigningSewer(true);
            const response = await fetch(`/api/production-batches/${batchId}/assign-sewer`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    sewerId: selectedSewerId,
                    notes: assignSewerNotes,
                }),
            });

            const data = await response.json();
            if (data.success) {
                toast.success("Berhasil", "Berhasil menugaskan ke penjahit");
                setShowAssignSewerDialog(false);
                setSelectedSewerId("");
                setAssignSewerNotes("");
                fetchBatch();
            } else {
                toast.error("Gagal", data.error || "Gagal menugaskan ke penjahit");
            }
        } catch (error) {
            console.error("Error assigning sewer:", error);
            toast.error("Error", "Gagal menugaskan ke penjahit");
        } finally {
            setAssigningSewer(false);
        }
    };

    // Verify sewing
    const handleVerifySewing = async () => {
        if (!batch?.sewingTask?.id) {
            toast.error("Error", "Tidak ada tugas jahit yang perlu diverifikasi");
            return;
        }

        try {
            setVerifyingSewing(true);
            const response = await fetch(`/api/sewing-tasks/${batch.sewingTask.id}/verify`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: verifySewingAction,
                    notes: verifySewingNotes,
                }),
            });

            const data = await response.json();
            if (data.success) {
                toast.success("Berhasil", verifySewingAction === "approve" ? "Jahitan disetujui" : "Jahitan ditolak");
                setShowVerifySewingDialog(false);
                setVerifySewingAction("approve");
                setVerifySewingNotes("");
                fetchBatch();
            } else {
                toast.error("Gagal", data.error || "Gagal verifikasi jahitan");
            }
        } catch (error) {
            console.error("Error verifying sewing:", error);
            toast.error("Error", "Gagal verifikasi jahitan");
        } finally {
            setVerifyingSewing(false);
        }
    };

    // Assign to finisher
    const handleAssignToFinisher = async () => {
        if (!selectedFinisherId) {
            toast.warning("Peringatan", "Pilih finisher terlebih dahulu");
            return;
        }

        try {
            setAssigningFinisher(true);
            const response = await fetch(`/api/production-batches/${batchId}/assign-finisher`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    finisherId: selectedFinisherId,
                    notes: assignFinisherNotes,
                }),
            });

            const data = await response.json();
            if (data.success) {
                toast.success("Berhasil", "Berhasil menugaskan ke finisher");
                setShowAssignFinisherDialog(false);
                setSelectedFinisherId("");
                setAssignFinisherNotes("");
                fetchBatch();
            } else {
                toast.error("Gagal", data.error || "Gagal menugaskan ke finisher");
            }
        } catch (error) {
            console.error("Error assigning finisher:", error);
            toast.error("Error", "Gagal menugaskan ke finisher");
        } finally {
            setAssigningFinisher(false);
        }
    };

    // Complete batch
    const handleCompleteBatch = async () => {
        try {
            setCompleting(true);
            const response = await fetch(`/api/production-batches/${batchId}/complete`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    notes: completeNotes,
                }),
            });

            const data = await response.json();
            if (data.success) {
                toast.success("Berhasil", "Batch produksi selesai");
                setShowCompleteDialog(false);
                setCompleteNotes("");
                fetchBatch();
            } else {
                toast.error("Gagal", data.error || "Gagal menyelesaikan batch");
            }
        } catch (error) {
            console.error("Error completing batch:", error);
            toast.error("Error", "Gagal menyelesaikan batch");
        } finally {
            setCompleting(false);
        }
    };

    // Initialize cutting results form
    const initializeCuttingResults = () => {
        if (batch?.sizeColorRequests && batch.sizeColorRequests.length > 0) {
            const results = batch.sizeColorRequests.map((request) => ({
                productSize: request.productSize,
                color: request.color,
                actualPieces: request.requestedPieces,
            }));
            setCuttingResults(results);
        }
    };

    // ============ END PRODUCTION ACTION HANDLERS ============

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
            IN_CUTTING: { label: "Proses Pemotongan", variant: "outline" },
            CUTTING_COMPLETED: { label: "Pemotongan Selesai", variant: "default" },
            CUTTING_VERIFIED: { label: "Pemotongan Terverifikasi", variant: "default" },
            ASSIGNED_TO_SEWER: { label: "Ditugaskan ke Penjahit", variant: "default" },
            IN_SEWING: { label: "Proses Penjahitan", variant: "outline" },
            SEWING_COMPLETED: { label: "Penjahitan Selesai", variant: "default" },
            SEWING_VERIFIED: { label: "Penjahitan Terverifikasi", variant: "default" },
            IN_FINISHING: { label: "Proses Finishing", variant: "outline" },
            FINISHING_COMPLETED: { label: "Finishing Selesai", variant: "default" },
            WAREHOUSE_VERIFIED: { label: "Siap Gudang", variant: "default" },
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
        const cuttingStatuses = ["ASSIGNED_TO_CUTTER", "IN_CUTTING", "CUTTING_COMPLETED"];
        const sewingStatuses = ["CUTTING_VERIFIED", "ASSIGNED_TO_SEWER", "IN_SEWING", "SEWING_COMPLETED"];
        const finishingStatuses = ["SEWING_VERIFIED", "IN_FINISHING", "FINISHING_COMPLETED"];
        const completedStatuses = ["WAREHOUSE_VERIFIED", "COMPLETED"];

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
                </div>
            </div>

            {/* Action Buttons based on status */}
            <div className="flex flex-wrap gap-2">
                {/* Confirm Batch - when PENDING or MATERIAL_REQUESTED */}
                {(batch.status === "PENDING" || batch.status === "MATERIAL_REQUESTED") && (
                    <Button onClick={() => setShowConfirmDialog(true)} className="bg-green-600 hover:bg-green-700">
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Konfirmasi Batch
                    </Button>
                )}

                {/* Assign to Cutter - when MATERIAL_ALLOCATED */}
                {batch.status === "MATERIAL_ALLOCATED" && (
                    <Button onClick={() => setShowAssignDialog(true)} variant="default">
                        <UserPlus className="h-4 w-4 mr-2" />
                        Assign ke Pemotong
                    </Button>
                )}

                {/* Input Cutting Results - when ASSIGNED_TO_CUTTER */}
                {batch.status === "ASSIGNED_TO_CUTTER" && (
                    <Button onClick={() => { initializeCuttingResults(); setShowInputCuttingDialog(true); }} variant="outline">
                        <Scissors className="h-4 w-4 mr-2" />
                        Input Hasil Potongan
                    </Button>
                )}

                {/* Verify Cutting - when cutting completed */}
                {batch.status === "CUTTING_COMPLETED" && (
                    <Button onClick={() => setShowVerifyDialog(true)} className="bg-blue-600 hover:bg-blue-700">
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Verifikasi Potongan
                    </Button>
                )}

                {/* When CUTTING_VERIFIED - show sub-batch info (sub-batch managed separately) */}
                {batch.status === "CUTTING_VERIFIED" && (
                    <Badge variant="outline" className="py-2 px-3">
                        Menunggu Sub-Batch Diproses
                    </Badge>
                )}

                {/* Verify Sewing - when sewing completed */}
                {batch.status === "SEWING_COMPLETED" && (
                    <Button onClick={() => setShowVerifySewingDialog(true)} className="bg-purple-600 hover:bg-purple-700">
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Verifikasi Jahitan
                    </Button>
                )}

                {/* Assign to Finisher - when sewing verified */}
                {batch.status === "SEWING_VERIFIED" && (
                    <Button onClick={() => setShowAssignFinisherDialog(true)} variant="default">
                        <UserPlus className="h-4 w-4 mr-2" />
                        Assign ke Finisher
                    </Button>
                )}

                {/* Complete Batch - when warehouse verified */}
                {batch.status === "WAREHOUSE_VERIFIED" && (
                    <Button onClick={() => setShowCompleteDialog(true)} className="bg-green-600 hover:bg-green-700">
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Selesaikan Batch
                    </Button>
                )}

                {/* Delete Button - only for pending/cancelled */}
                {canDelete && (
                    <Button variant="destructive" size="sm" onClick={() => setIsDeleteDialogOpen(true)}>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Hapus
                    </Button>
                )}
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
                                                <TableHead className="text-right">Dialokasi</TableHead>
                                                <TableHead className="text-right">Stok Saat Alokasi</TableHead>
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
                                                    <TableCell className="text-right">
                                                        <div className="space-y-1">
                                                            <div>{Number(allocation.allocatedQty)} {allocation.materialColorVariant.unit}</div>
                                                            <div className="text-xs text-muted-foreground">{allocation.rollQuantity} roll</div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        {allocation.stockAtAllocation !== null ? (
                                                            <div className="space-y-1">
                                                                <div>{Number(allocation.stockAtAllocation)} {allocation.materialColorVariant.unit}</div>
                                                                <div className="text-xs text-muted-foreground">
                                                                    {allocation.rollQuantityAtAllocation !== null
                                                                        ? `${Number(allocation.rollQuantityAtAllocation)} roll`
                                                                        : '-'}
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <span className="text-muted-foreground text-xs">Belum dikonfirmasi</span>
                                                        )}
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

            {/* Confirm Batch Dialog */}
            <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Konfirmasi Batch</DialogTitle>
                        <DialogDescription>
                            Konfirmasi batch ini untuk memulai proses produksi?
                            Material akan dialokasikan dan tidak dapat dibatalkan.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowConfirmDialog(false)} disabled={confirming}>
                            Batal
                        </Button>
                        <Button onClick={handleConfirmBatch} disabled={confirming} className="bg-green-600 hover:bg-green-700">
                            {confirming ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Memproses...</> : "Konfirmasi"}
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
                                    <CardTitle className="text-lg">Hasil Pemotongan</CardTitle>
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
                                                {/* <TableHead>Target</TableHead> */}
                                                <TableHead>Actual Pieces</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {cuttingResults.map((result, idx) => {
                                                return (
                                                    <TableRow key={idx}>
                                                        <TableCell className="font-medium">{result.productSize}</TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline">{result.color}</Badge>
                                                        </TableCell>
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

            {/* Assign to Sewer Dialog */}
            <Dialog open={showAssignSewerDialog} onOpenChange={setShowAssignSewerDialog}>
                <DialogContent className="max-w-[95vw] sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Assign ke Penjahit</DialogTitle>
                        <DialogDescription>
                            Pilih penjahit untuk batch ini
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Penjahit</Label>
                            <Select
                                value={selectedSewerId}
                                onChange={(e) => setSelectedSewerId(e.target.value)}
                            >
                                <option value="">Pilih Penjahit...</option>
                                {sewers.map((sewer) => (
                                    <option key={sewer.id} value={sewer.id}>
                                        {sewer.name} ({sewer._count.sewingTasks} tugas aktif)
                                    </option>
                                ))}
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Catatan (Opsional)</Label>
                            <Textarea
                                value={assignSewerNotes}
                                onChange={(e) => setAssignSewerNotes(e.target.value)}
                                placeholder="Catatan untuk penjahit..."
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowAssignSewerDialog(false)} disabled={assigningSewer}>
                            Batal
                        </Button>
                        <Button onClick={handleAssignToSewer} disabled={assigningSewer || !selectedSewerId}>
                            {assigningSewer ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Menugaskan...</> : "Assign"}
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
                                    <CardTitle className="text-lg">Hasil Penjahitan</CardTitle>
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
                            className="bg-green-600 hover:bg-green-700"
                        >
                            {completing ? "Menyelesaikan..." : "Selesaikan Batch"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
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
