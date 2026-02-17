"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Calendar, Package, User, AlertCircle, CheckCircle2, Loader2, FileText, Trash2, QrCode, CheckCircle, UserPlus, Scissors, Users, Sparkles, Clock } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";

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
    rollQuantity?: number;
    minimumStock: number;
    unit: string;
    material: Material;
}

interface MaterialColorAllocation {
    id: string;
    materialColorVariantId: string;
    rollQuantity: number;
    allocatedQty: number;
    meterPerRoll: number;
    stockAtAllocation: number | null; // Stok saat alokasi dikonfirmasi
    rollQuantityAtAllocation: number | null; // Jumlah roll saat alokasi dikonfirmasi
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
    sewingResults?: Array<{
        id: string;
        productSize: string;
        color: string;
        actualPieces: number;
        isConfirmed: boolean;
        createdAt: string;
    }>;
    subBatches?: Array<{
        id: string;
        subBatchSku: string;
        source: string;
        status: string;
        finishingGoodOutput: number;
        rejectKotor: number;
        rejectSobek: number;
        rejectRusakJahit: number;
        notes?: string | null;
        createdAt: string;
        items: Array<{
            id: string;
            productSize: string;
            color: string;
            goodQuantity: number;
            rejectKotor: number;
            rejectSobek: number;
            rejectRusakJahit: number;
        }>;
    }>;
}

interface TimelineEvent {
    id: string;
    batchId: string;
    event: string;
    details: string | null;
    createdAt: string;
}

interface SubBatchItem {
    id: string;
    productSize: string;
    color: string;
    goodQuantity: number;
    rejectKotor: number;
    rejectSobek: number;
    rejectRusakJahit: number;
}

interface SubBatchSummary {
    id: string;
    subBatchSku: string;
    status: string;
    finishingGoodOutput: number;
    rejectKotor: number;
    rejectSobek: number;
    rejectRusakJahit: number;
    notes?: string | null;
    items: SubBatchItem[];
    warehouseVerifiedBy?: { id: string; name: string; username: string } | null;
    warehouseVerifiedAt?: string | null;
    submittedToWarehouseAt?: string | null;
    verifiedByProdAt?: string | null;
    createdAt: string;
    updatedAt: string;
}

export default function BatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params);
    const router = useRouter();
    const [batch, setBatch] = useState<ProductionBatch | null>(null);
    const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
    const [subBatches, setSubBatches] = useState<SubBatchSummary[]>([]);
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

    const [showInputSewingDialog, setShowInputSewingDialog] = useState(false);
    const [sewingResults, setSewingResults] = useState<Array<{ productSize: string; color: string; actualPieces: number }>>([]);
    const [sewingNotes, setSewingNotes] = useState("");
    const [submittingSewing, setSubmittingSewing] = useState(false);

    const [showVerifySewingDialog, setShowVerifySewingDialog] = useState(false);
    const [verifySewingAction, setVerifySewingAction] = useState<"approve" | "reject">("approve");
    const [verifySewingNotes, setVerifySewingNotes] = useState("");
    const [verifyingSewing, setVerifyingSewing] = useState(false);

    const [showAssignFinishingDialog, setShowAssignFinishingDialog] = useState(false);
    const [selectedFinisherId, setSelectedFinisherId] = useState("");
    const [assignFinishingNotes, setAssignFinishingNotes] = useState("");
    const [assigningFinishing, setAssigningFinishing] = useState(false);

    const [showSubBatchDialog, setShowSubBatchDialog] = useState(false);
    const [startingFinishing, setStartingFinishing] = useState(false);

    const [showCompleteSewingDialog, setShowCompleteSewingDialog] = useState(false);
    const [completingSewing, setCompletingSewing] = useState(false);
    const [completeSewingNotes, setCompleteSewingNotes] = useState("");

    const [showCompleteDialog, setShowCompleteDialog] = useState(false);
    const [completeNotes, setCompleteNotes] = useState("");
    const [completing, setCompleting] = useState(false);

    const [showVerifyFinishingDialog, setShowVerifyFinishingDialog] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [verifyingSubBatch, setVerifyingSubBatch] = useState<any>(null);
    const [verifyFinishingAction, setVerifyFinishingAction] = useState<"approve" | "reject">("approve");
    const [verifyFinishingNotes, setVerifyFinishingNotes] = useState("");
    const [verifyingFinishing, setVerifyingFinishing] = useState(false);

    // Sewing sub-batch verify & forward states
    const [showVerifySewingSubBatchDialog, setShowVerifySewingSubBatchDialog] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [verifySewingSubBatch, setVerifySewingSubBatch] = useState<any>(null);
    const [verifySewingSubBatchAction, setVerifySewingSubBatchAction] = useState<"approve" | "reject">("approve");
    const [verifyingSewingSubBatch, setVerifyingSewingSubBatch] = useState(false);

    const [showForwardToFinishingDialog, setShowForwardToFinishingDialog] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [forwardingSubBatch, setForwardingSubBatch] = useState<any>(null);
    const [forwardingToFinishing, setForwardingToFinishing] = useState(false);
    const [forwardFinisherId, setForwardFinisherId] = useState("");

    // Workers list
    const [cutters, setCutters] = useState<Cutter[]>([]);
    const [sewers, setSewers] = useState<Sewer[]>([]);
    const [finishers, setFinishers] = useState<Finisher[]>([]);

    useEffect(() => {
        fetchBatchDetail();
        fetchTimeline();
        fetchWorkers();
        fetchSubBatches();
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

    const fetchSubBatches = async () => {
        try {
            const response = await fetch(`/api/production-batches/${resolvedParams.id}/sub-batches?source=FINISHING`);
            const result = await response.json();

            if (result.success) {
                setSubBatches(result.data || []);
            }
        } catch (error) {
            console.error("Error fetching sub-batches:", error);
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

    const handleSubmitSewingResults = async () => {
        if (!batch) return;

        const totalActual = sewingResults.reduce((sum, r) => sum + r.actualPieces, 0);
        if (totalActual === 0) {
            toast.error("Error", "Total actual pieces harus lebih dari 0");
            return;
        }

        setSubmittingSewing(true);
        try {
            const response = await fetch(`/api/production-batches/${batch.id}/input-sewing-results`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    sewingResults,
                    notes: sewingNotes,
                }),
            });

            const result = await response.json();

            if (result.success) {
                toast.success("Berhasil", result.message || "Hasil jahitan berhasil disimpan");
                setShowInputSewingDialog(false);
                setSewingResults([]);
                setSewingNotes("");
                fetchBatchDetail();
            } else {
                toast.error("Error", result.error || "Gagal menyimpan hasil jahitan");
            }
        } catch (error) {
            console.error("Error submitting sewing results:", error);
            toast.error("Error", "Terjadi kesalahan saat menyimpan hasil jahitan");
        } finally {
            setSubmittingSewing(false);
        }
    };

    const handleCompleteSewing = async () => {
        if (!batch) return;

        setCompletingSewing(true);
        try {
            const response = await fetch(`/api/production-batches/${batch.id}/complete-sewing`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    notes: completeSewingNotes,
                }),
            });

            const result = await response.json();

            if (result.success) {
                toast.success("Berhasil", result.message || "Penjahitan selesai");
                setShowCompleteSewingDialog(false);
                setCompleteSewingNotes("");
                fetchBatchDetail();
            } else {
                toast.error("Error", result.error || "Gagal menyelesaikan penjahitan");
            }
        } catch (error) {
            console.error("Error completing sewing:", error);
            toast.error("Error", "Terjadi kesalahan saat menyelesaikan penjahitan");
        } finally {
            setCompletingSewing(false);
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

    // Handler: Verify individual sewing sub-batch
    const handleVerifySewingSubBatch = async () => {
        if (!verifySewingSubBatch) return;

        setVerifyingSewingSubBatch(true);
        try {
            const response = await fetch(`/api/sub-batches/${verifySewingSubBatch.id}/verify`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: verifySewingSubBatchAction }),
            });

            const result = await response.json();

            if (result.success) {
                toast.success("Berhasil", result.message || "Sub-batch berhasil diverifikasi");
                setShowVerifySewingSubBatchDialog(false);
                setVerifySewingSubBatch(null);
                setVerifySewingSubBatchAction("approve");
                fetchBatchDetail();
            } else {
                toast.error("Error", result.error || "Gagal verifikasi sub-batch");
            }
        } catch (error) {
            console.error("Error verifying sewing sub-batch:", error);
            toast.error("Error", "Terjadi kesalahan saat verifikasi sub-batch");
        } finally {
            setVerifyingSewingSubBatch(false);
        }
    };

    // Handler: Forward verified sewing sub-batch to finishing
    const handleForwardToFinishing = async () => {
        if (!forwardingSubBatch) return;

        // Check if finishing task already exists
        const hasFinishingTask = batch?.finishingTask;

        // If no finishing task, require finisher selection
        if (!hasFinishingTask && !forwardFinisherId) {
            toast.error("Error", "Pilih kepala finishing terlebih dahulu");
            return;
        }

        setForwardingToFinishing(true);
        try {
            const bodyData: Record<string, string> = {};
            if (!hasFinishingTask && forwardFinisherId) {
                bodyData.assignedToId = forwardFinisherId;
            }

            const response = await fetch(`/api/sub-batches/${forwardingSubBatch.id}/forward-to-finishing`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(bodyData),
            });

            const result = await response.json();

            if (result.success) {
                toast.success("Berhasil", result.message || "Sub-batch diteruskan ke finishing");
                setShowForwardToFinishingDialog(false);
                setForwardingSubBatch(null);
                setForwardFinisherId("");
                fetchBatchDetail();
            } else {
                toast.error("Error", result.error || "Gagal meneruskan ke finishing");
            }
        } catch (error) {
            console.error("Error forwarding sub-batch to finishing:", error);
            toast.error("Error", "Terjadi kesalahan saat meneruskan ke finishing");
        } finally {
            setForwardingToFinishing(false);
        }
    };

    const handleAssignToFinishing = async () => {
        if (!batch || !selectedFinisherId) {
            toast.error("Error", "Pilih kepala finishing terlebih dahulu");
            return;
        }

        setAssigningFinishing(true);
        try {
            const response = await fetch(`/api/production-batches/${batch.id}/assign-finishing`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    assignedToId: selectedFinisherId,
                    notes: assignFinishingNotes,
                }),
            });

            const result = await response.json();

            if (result.success) {
                toast.success("Berhasil", result.message || "Batch berhasil di-assign ke finishing");
                setShowAssignFinishingDialog(false);
                setSelectedFinisherId("");
                setAssignFinishingNotes("");
                fetchBatchDetail();
            } else {
                toast.error("Error", result.error || "Gagal assign batch");
            }
        } catch (error) {
            console.error("Error assigning batch to finishing:", error);
            toast.error("Error", "Terjadi kesalahan saat assign batch");
        } finally {
            setAssigningFinishing(false);
        }
    };

    const handleStartFinishing = async () => {
        if (!batch) return;

        setStartingFinishing(true);
        try {
            const response = await fetch(`/api/production-batches/${batch.id}/start-finishing`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    notes: "",
                }),
            });

            const result = await response.json();

            if (result.success) {
                toast.success("Berhasil", "Finishing dimulai");
                fetchBatchDetail();
                // Open sub-batch dialog setelah finishing dimulai
                setShowSubBatchDialog(true);
            } else {
                toast.error("Error", result.error || "Gagal memulai finishing");
            }
        } catch (error) {
            console.error("Error starting finishing:", error);
            toast.error("Error", "Terjadi kesalahan saat memulai finishing");
        } finally {
            setStartingFinishing(false);
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const openVerifyFinishingDialog = (subBatch: any) => {
        setVerifyingSubBatch(subBatch);
        setVerifyFinishingAction("approve");
        setVerifyFinishingNotes("");
        setShowVerifyFinishingDialog(true);
    };

    const handleVerifyFinishing = async () => {
        if (!batch || !verifyingSubBatch) return;

        setVerifyingFinishing(true);
        try {
            const response = await fetch(`/api/sub-batches/${verifyingSubBatch.id}/verify`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    action: verifyFinishingAction,
                    notes: verifyFinishingNotes,
                }),
            });

            const result = await response.json();

            if (result.success) {
                if (verifyFinishingAction === "approve") {
                    toast.success("Berhasil", "Hasil finishing disetujui dan siap dikirim ke gudang");
                } else {
                    toast.success("Berhasil", "Hasil finishing ditolak dan sub-batch dihapus. Hasil jahit dapat diinput ulang di sub-batch baru");
                }
                setShowVerifyFinishingDialog(false);
                setVerifyingSubBatch(null);
                setVerifyFinishingNotes("");
                fetchBatchDetail();
                fetchSubBatches();
            } else {
                toast.error("Error", result.error || "Gagal memverifikasi hasil finishing");
            }
        } catch (error) {
            console.error("Error verifying finishing:", error);
            toast.error("Error", "Terjadi kesalahan saat memverifikasi hasil finishing");
        } finally {
            setVerifyingFinishing(false);
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

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const formatDateOnly = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("id-ID", {
            day: "numeric",
            month: "long",
            year: "numeric",
        });
    };

    // Determine current phase based on status
    const getCurrentPhase = (status: string): string => {
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

    const currentPhase = getCurrentPhase(batch.status);

    // Calculate progress
    const cuttingOutput = batch.cuttingResults?.reduce((sum, r) => sum + r.actualPieces, 0) || 0;

    // Sewing output = from accumulated SewingResult records or sewingTask.piecesCompleted
    const sewingOutput = batch.sewingTask?.piecesCompleted || 0;

    // No reject tracking at sewing stage
    const sewingReject = 0;

    // Finishing output = from sub-batches (finishing → warehouse sub-batches)
    const finishingOutput = subBatches.reduce((sum, sb) => {
        let total = 0;
        if (sb.items && Array.isArray(sb.items)) {
            for (const item of sb.items) {
                total += item.goodQuantity || 0;
            }
        }
        return sum + total;
    }, 0);

    const finishingReject = subBatches.reduce((sum, sb) => {
        let total = 0;
        if (sb.items && Array.isArray(sb.items)) {
            for (const item of sb.items) {
                total += (item.rejectKotor || 0) + (item.rejectSobek || 0) + (item.rejectRusakJahit || 0);
            }
        }
        return sum + total;
    }, 0);

    // Calculate remaining sewing output (not yet submitted to finishing sub-batches)
    // Get all items already in sub-batches
    const submittedItems = new Map<string, number>();
    for (const subBatch of subBatches) {
        if (subBatch && subBatch.items && Array.isArray(subBatch.items)) {
            for (const item of subBatch.items) {
                const key = `${item.productSize}|${item.color}`;
                const total = (item.goodQuantity || 0) + (item.rejectKotor || 0) + (item.rejectSobek || 0) + (item.rejectRusakJahit || 0);
                submittedItems.set(key, (submittedItems.get(key) || 0) + total);
            }
        }
    }

    // Calculate remaining sewingOutputs for CreateSubBatchDialog (finishing → warehouse)
    // Group sewing sub-batches by size/color to get total sewn per size/color
    const sewingSubBatches = (batch.subBatches || []).filter(sb => sb.source === "SEWING");
    const sewnPerSizeColor = new Map<string, number>();
    for (const sb of sewingSubBatches) {
        for (const item of (sb.items || [])) {
            const key = `${item.productSize}|${item.color}`;
            sewnPerSizeColor.set(key, (sewnPerSizeColor.get(key) || 0) + item.goodQuantity);
        }
    }

    // Remaining = sewing output per size/color minus already submitted to finishing sub-batches
    const remainingSewingOutputs: Array<{ productSize: string; color: string; quantity: number }> = [];
    for (const [key, sewnQty] of sewnPerSizeColor) {
        const [productSize, color] = key.split("|");
        const submitted = submittedItems.get(key) || 0;
        const remaining = Math.max(0, sewnQty - submitted);
        if (remaining > 0) {
            remainingSewingOutputs.push({ productSize, color, quantity: remaining });
        }
    }

    // Calculate total finishing input (dari semua finishing sub-batches)
    let totalFinishingInput = 0;
    for (const subBatch of subBatches) {
        if (subBatch && subBatch.items && Array.isArray(subBatch.items)) {
            for (const item of subBatch.items) {
                totalFinishingInput += (item.goodQuantity || 0) + (item.rejectKotor || 0) + (item.rejectSobek || 0) + (item.rejectRusakJahit || 0);
            }
        }
    }

    // Total sewing output that should be processed in finishing
    const totalSewingOutput = batch.sewingTask?.piecesCompleted || 0;

    // Check if all sewing output has been processed in finishing
    const canCompleteBatch = totalFinishingInput > 0 && totalFinishingInput >= totalSewingOutput;

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

                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsQRDialogOpen(true)}
                >
                    <QrCode className="h-4 w-4 mr-2" />
                    Show QR Code
                </Button>
                <div className="flex w-full flex-wrap items-center justify-between gap-2 border p-4 rounded-md bg-accent-foreground/5">
                    <p className="font-medium">Aksi Produksi</p>
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

                    {(batch.status === "ASSIGNED_TO_CUTTER" || batch.status === "IN_CUTTING") && (
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
                            <Button
                                size="sm"
                                onClick={() => setShowAssignSewerDialog(true)}
                            >
                                <UserPlus className="h-4 w-4 mr-2" />
                                Assign ke Penjahit
                            </Button>
                        </>
                    )}

                    {(batch.status === "ASSIGNED_TO_SEWER" || batch.status === "IN_SEWING") && (
                        <>
                            {/* Only show Input button if there are remaining pieces to sew */}
                            {(() => {
                                const alreadySewn = new Map<string, number>();
                                for (const sb of (batch.subBatches || []).filter(s => s.source === "SEWING")) {
                                    for (const item of (sb.items || [])) {
                                        const key = `${item.productSize}|${item.color}`;
                                        alreadySewn.set(key, (alreadySewn.get(key) || 0) + item.goodQuantity);
                                    }
                                }
                                const hasRemaining = (batch.cuttingResults || []).some(cr => {
                                    const key = `${cr.productSize}|${cr.color}`;
                                    return cr.actualPieces - (alreadySewn.get(key) || 0) > 0;
                                });
                                return hasRemaining ? (
                                    <Button
                                        size="sm"
                                        onClick={() => {
                                            // Initialize sewing results with REMAINING quantities
                                            const sewn = new Map<string, number>();
                                            for (const sb of (batch.subBatches || []).filter(s => s.source === "SEWING")) {
                                                for (const item of (sb.items || [])) {
                                                    const key = `${item.productSize}|${item.color}`;
                                                    sewn.set(key, (sewn.get(key) || 0) + item.goodQuantity);
                                                }
                                            }
                                            if (batch.cuttingResults) {
                                                setSewingResults(
                                                    batch.cuttingResults
                                                        .map((cr) => {
                                                            const key = `${cr.productSize}|${cr.color}`;
                                                            const remaining = cr.actualPieces - (sewn.get(key) || 0);
                                                            return {
                                                                productSize: cr.productSize,
                                                                color: cr.color,
                                                                actualPieces: Math.max(0, remaining),
                                                            };
                                                        })
                                                        .filter(r => r.actualPieces > 0)
                                                );
                                            }
                                            setShowInputSewingDialog(true);
                                        }}
                                    >
                                        <Scissors className="h-4 w-4 mr-2" />
                                        Input Hasil Jahitan
                                    </Button>
                                ) : null;
                            })()}

                            {/* Show "Selesaikan Jahitan" button when there are sewing results */}
                            {batch.status === "IN_SEWING" && (batch.sewingTask?.piecesCompleted || 0) > 0 && (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setShowCompleteSewingDialog(true)}
                                >
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Selesaikan Jahitan
                                </Button>
                            )}
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
                            onClick={() => setShowAssignFinishingDialog(true)}
                        >
                            <UserPlus className="h-4 w-4 mr-2" />
                            Assign ke Finishing
                        </Button>
                    )}

                    {batch.status === "ASSIGNED_TO_FINISHING" && (
                        <Button
                            size="sm"
                            onClick={handleStartFinishing}
                            disabled={startingFinishing}
                        >
                            {startingFinishing ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Memulai...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="h-4 w-4 mr-2" />
                                    Mulai Finishing
                                </>
                            )}
                        </Button>
                    )}

                    {batch.status === "IN_FINISHING" && !canCompleteBatch && (
                        <>
                            <div className="flex items-center gap-2 text-sm">
                                <span className="text-muted-foreground">Progress:</span>
                                <span className="font-medium">{totalFinishingInput} / {totalSewingOutput} pcs</span>
                            </div>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setShowSubBatchDialog(true)}
                            >
                                <Package className="h-4 w-4 mr-2" />
                                Input Hasil Finishing
                            </Button>
                        </>
                    )}

                    {(batch.status === "IN_FINISHING" || batch.status === "WAREHOUSE_VERIFIED") && canCompleteBatch && (
                        <Button
                            size="sm"
                            onClick={() => setShowCompleteDialog(true)}
                        >
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Selesaikan Batch
                        </Button>
                    )}

                </div>
            </div>

            {/* Batch Overview */}
            <Card className="">
                <CardHeader className="py-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                        <Package className="h-5 w-5" />
                        Ringkasan Hasil Produksi
                    </CardTitle>
                </CardHeader>
                <CardContent className="py-2">
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-center pb-4">
                        <div>
                            <p className="text-2xl font-bold text-green-600">{finishingOutput}</p>
                            <p className="text-xs text-muted-foreground">Barang Jadi</p>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-yellow-600">{subBatches.reduce((sum, sb) => sum + sb.rejectKotor, 0)}</p>
                            <p className="text-xs text-muted-foreground">Kotor</p>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-red-600">{subBatches.reduce((sum, sb) => sum + sb.rejectSobek, 0)}</p>
                            <p className="text-xs text-muted-foreground">Sobek</p>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-red-600">{subBatches.reduce((sum, sb) => sum + sb.rejectRusakJahit, 0)}</p>
                            <p className="text-xs text-muted-foreground">Rusak Jahit</p>
                        </div>
                        <div>
                            <p className="text-2xl font-bold">
                                {subBatches.reduce((sum, sb) => sum + sb.rejectKotor + sb.rejectSobek + sb.rejectRusakJahit, 0) + finishingOutput}
                            </p>
                            <p className="text-xs text-muted-foreground">Total</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Batch Information */}
            <Card>
                <CardHeader>
                    <CardTitle>Informasi Produksi</CardTitle>
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
                            <p className="text-sm text-muted-foreground">Tanggal Mulai</p>
                            <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">{formatDate(batch.startDate)}</span>
                            </div>
                        </div>
                        {batch.completedDate && (
                            <div>
                                <p className="text-sm text-muted-foreground">Tanggal Selesai</p>
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                                    <span className="text-sm">{formatDate(batch.completedDate)}</span>
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
                                    <span className="text-sm font-medium text-primary">
                                        {batch.product.name}
                                    </span>
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
                                            {batch.materialColorAllocations.map((allocation) => {
                                                const variant = allocation.materialColorVariant;
                                                const unit = variant.unit || variant.material.unit;
                                                return (
                                                    <TableRow key={allocation.id}>
                                                        <TableCell className="font-medium">
                                                            {variant.material.name}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline">{variant.colorName}</Badge>
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <div className="space-y-1">
                                                                <div>{Number(allocation.allocatedQty)} {unit}</div>
                                                                <div className="text-xs text-muted-foreground">{allocation.rollQuantity} roll</div>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            {allocation.stockAtAllocation !== null ? (
                                                                <div className="space-y-1">
                                                                    <div>{Number(allocation.stockAtAllocation)} {unit}</div>
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
                                                );
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
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {batch.materialAllocations.map((allocation, idx) => (
                                                <TableRow key={idx}>
                                                    <TableCell className="font-medium">{allocation.material.name}</TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline">{allocation.color}</Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right">{allocation.rollQuantity}</TableCell>
                                                    <TableCell className="text-right">{allocation.requestedQty} {allocation.unit}</TableCell>
                                                    <TableCell className="text-right">{allocation.availableStock} {allocation.unit}</TableCell>
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
                                            <span className="text-sm font-medium">{batch.cuttingTask.assignedTo?.name || "-"}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-muted-foreground">Status</span>
                                            {getStatusBadge(batch.cuttingTask.status)}
                                        </div>
                                        <Separator />
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-muted-foreground">Material Diterima</span>
                                            <div className="flex gap-2 items-center">
                                                <span className="text-sm font-medium">
                                                    {batch.materialColorAllocations?.reduce((total, allocation) => total + Number(allocation.allocatedQty), 0)} {batch.materialColorAllocations?.reduce((total, allocation) => allocation.materialColorVariant?.unit || "", "")}
                                                </span>
                                                -
                                                <span className="text-sm font-medium">
                                                    {batch.materialColorAllocations?.reduce((total, allocation) => total + Number(allocation.rollQuantity), 0)} Roll
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-muted-foreground">Selesai</span>
                                            <span className="text-sm font-medium text-green-600">{batch.cuttingTask.piecesCompleted} pcs</span>
                                        </div>
                                        {/* <div className="flex justify-between items-center">
                                            <span className="text-sm text-muted-foreground">Reject</span>
                                            <span className="text-sm font-medium text-destructive">{batch.cuttingTask.rejectPieces} pcs</span>
                                        </div> */}
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
                                                <span className="text-xs">{formatDate(batch.cuttingTask.startedAt)}</span>
                                            </div>
                                        )}
                                        {batch.cuttingTask.completedAt && (
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-muted-foreground">Selesai</span>
                                                <span className="text-xs">{formatDate(batch.cuttingTask.completedAt)}</span>
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
                        {/* <Card>
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
                                    <Progress value={totalTarget > 0 ? (cuttingOutput / totalTarget) * 100 : 0} className="h-2" />
                                </div>
                            </CardContent>
                        </Card> */}
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
                        {/* Sewing Task Info + Accumulated Results */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Task Penjahitan</CardTitle>
                                <CardDescription>
                                    {batch.sewingTask
                                        ? `Total ${batch.sewingTask.piecesCompleted} pcs dari ${batch.sewingTask.piecesReceived} pcs`
                                        : "Informasi tugas penjahitan"
                                    }
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {batch.sewingTask ? (
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-muted-foreground">Penjahit</span>
                                            <span className="text-sm font-medium">{batch.sewingTask.assignedTo?.name || "-"}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-muted-foreground">Status</span>
                                            {getStatusBadge(batch.sewingTask.status)}
                                        </div>
                                        <Separator />
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-muted-foreground">Diterima dari Potong</span>
                                            <span className="text-sm font-medium">{batch.sewingTask.piecesReceived} pcs</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-muted-foreground">Sudah Dijahit</span>
                                            <span className="text-sm font-medium text-green-600">{batch.sewingTask.piecesCompleted} pcs</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-muted-foreground">Sisa Belum Dijahit</span>
                                            <span className="text-sm font-medium text-orange-600">
                                                {Math.max(0, batch.sewingTask.piecesReceived - batch.sewingTask.piecesCompleted)} pcs
                                            </span>
                                        </div>
                                        <Separator />
                                        {batch.sewingTask.startedAt && (
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-muted-foreground">Mulai</span>
                                                <span className="text-xs">{formatDate(batch.sewingTask.startedAt)}</span>
                                            </div>
                                        )}
                                        {batch.sewingTask.completedAt && (
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-muted-foreground">Selesai</span>
                                                <span className="text-xs">{formatDate(batch.sewingTask.completedAt)}</span>
                                            </div>
                                        )}
                                        {batch.sewingTask.notes && (
                                            <div className="space-y-1 pt-2">
                                                <span className="text-sm text-muted-foreground">Catatan</span>
                                                <p className="text-sm p-2 bg-muted rounded">{batch.sewingTask.notes}</p>
                                            </div>
                                        )}

                                        {/* Show accumulated sewing results detail from sub-batches */}
                                        {(batch.subBatches || []).filter(sb => sb.source === "SEWING").length > 0 && (
                                            <>
                                                <Separator />
                                                <div className="space-y-3">
                                                    <span className="text-sm font-medium">Detail Hasil Jahitan (Sub-Batch)</span>
                                                    {(batch.subBatches || []).filter(sb => sb.source === "SEWING").map((sb) => {
                                                        const sbTotalPcs = (sb.items || []).reduce((sum: number, item: { goodQuantity?: number }) => sum + (item.goodQuantity || 0), 0);
                                                        return (
                                                            <div key={sb.id} className="space-y-2 rounded-lg border p-3">
                                                                <div className="flex justify-between items-center">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-xs font-medium font-mono">{sb.subBatchSku}</span>
                                                                        <Badge variant="secondary" className="text-xs">{sbTotalPcs} pcs</Badge>
                                                                    </div>
                                                                    <div className="flex items-center gap-2">
                                                                        {sb.status === "CREATED" && (
                                                                            <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700 border-yellow-300">Menunggu Verifikasi</Badge>
                                                                        )}
                                                                        {sb.status === "SEWING_VERIFIED" && (
                                                                            <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-300">Terverifikasi</Badge>
                                                                        )}
                                                                        {sb.status === "FORWARDED_TO_FINISHING" && (
                                                                            <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-300">Diteruskan ke Finishing</Badge>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <div className="text-xs text-muted-foreground">{formatDate(sb.createdAt)}</div>
                                                                <div className="rounded-md border">
                                                                    <Table>
                                                                        <TableHeader>
                                                                            <TableRow>
                                                                                <TableHead>Ukuran</TableHead>
                                                                                <TableHead>Warna</TableHead>
                                                                                <TableHead className="text-right">Pcs</TableHead>
                                                                            </TableRow>
                                                                        </TableHeader>
                                                                        <TableBody>
                                                                            {(sb.items || []).map((item: { id: string; productSize: string; color: string; goodQuantity: number }) => (
                                                                                <TableRow key={item.id}>
                                                                                    <TableCell className="font-medium">{item.productSize}</TableCell>
                                                                                    <TableCell>
                                                                                        <Badge variant="outline">{item.color}</Badge>
                                                                                    </TableCell>
                                                                                    <TableCell className="text-right">{item.goodQuantity} pcs</TableCell>
                                                                                </TableRow>
                                                                            ))}
                                                                        </TableBody>
                                                                    </Table>
                                                                </div>
                                                                {/* Action buttons per sewing sub-batch */}
                                                                <div className="flex gap-2 justify-end pt-1">
                                                                    {sb.status === "CREATED" && (
                                                                        <Button
                                                                            size="sm"
                                                                            variant="outline"
                                                                            onClick={() => {
                                                                                setVerifySewingSubBatch(sb);
                                                                                setVerifySewingSubBatchAction("approve");
                                                                                setShowVerifySewingSubBatchDialog(true);
                                                                            }}
                                                                        >
                                                                            <CheckCircle className="h-3 w-3 mr-1" />
                                                                            Verifikasi
                                                                        </Button>
                                                                    )}
                                                                    {sb.status === "SEWING_VERIFIED" && (
                                                                        <Button
                                                                            size="sm"
                                                                            onClick={() => {
                                                                                setForwardingSubBatch(sb);
                                                                                setForwardFinisherId("");
                                                                                setShowForwardToFinishingDialog(true);
                                                                            }}
                                                                        >
                                                                            <ArrowRight className="h-3 w-3 mr-1" />
                                                                            Teruskan ke Finishing
                                                                        </Button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </>
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
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Sisa Belum Dijahit</span>
                                        <span className="font-medium text-orange-600">{Math.max(0, cuttingOutput - sewingOutput)} pcs</span>
                                    </div>
                                    <Progress value={cuttingOutput > 0 ? (sewingOutput / cuttingOutput) * 100 : 0} className="h-2" />
                                </div>

                                {/* Summary per size/color */}
                                {sewingSubBatches.length > 0 && batch.cuttingResults && (
                                    <div className="space-y-2 pt-2 border-t">
                                        <span className="text-sm font-medium">Per Ukuran/Warna</span>
                                        {batch.cuttingResults.map((cr) => {
                                            const key = `${cr.productSize}|${cr.color}`;
                                            const sewn = sewnPerSizeColor.get(key) || 0;
                                            const pct = cr.actualPieces > 0 ? Math.round((sewn / cr.actualPieces) * 100) : 0;
                                            return (
                                                <div key={key} className="space-y-1">
                                                    <div className="flex justify-between text-xs">
                                                        <span className="text-muted-foreground">{cr.productSize} - {cr.color}</span>
                                                        <span>{sewn}/{cr.actualPieces} ({pct}%)</span>
                                                    </div>
                                                    <Progress value={pct} className="h-1" />
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* Finishing Tab */}
                <TabsContent value="finishing" className="space-y-4">
                    <div className="grid gap-4 lg:grid-cols-2">
                        {/* Finishing Summary - Simplified: received from sewing vs processed */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Task Finishing</CardTitle>
                                <CardDescription>
                                    {batch.finishingTask
                                        ? `Diterima ${batch.finishingTask.piecesReceived} pcs dari penjahitan`
                                        : "Informasi tugas finishing"
                                    }
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {batch.finishingTask ? (
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-muted-foreground">Ka. Finishing</span>
                                            <span className="text-sm font-medium">{batch.finishingTask.assignedTo?.name || "-"}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-muted-foreground">Status</span>
                                            {getStatusBadge(batch.finishingTask.status)}
                                        </div>
                                        <Separator />
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-muted-foreground">Diterima dari Penjahitan</span>
                                            <span className="text-lg font-bold">{batch.finishingTask.piecesReceived} pcs</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-muted-foreground">Sudah Diproses Finishing</span>
                                            <span className="text-lg font-bold text-green-600">{totalFinishingInput} pcs</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-muted-foreground">Sisa Belum Diproses</span>
                                            <span className="text-lg font-bold text-orange-600">{Math.max(0, totalSewingOutput - totalFinishingInput)} pcs</span>
                                        </div>
                                        <Progress value={totalSewingOutput > 0 ? (totalFinishingInput / totalSewingOutput) * 100 : 0} className="h-2" />

                                        {/* Reject summary from sub-batches */}
                                        {finishingReject > 0 && (
                                            <>
                                                <Separator />
                                                <div className="space-y-2">
                                                    <span className="text-sm font-medium text-destructive">Reject</span>
                                                    <div className="grid grid-cols-3 gap-2 text-sm">
                                                        <div className="bg-orange-50 dark:bg-orange-950/20 p-2 rounded text-center">
                                                            <p className="text-xs text-muted-foreground">Kotor</p>
                                                            <p className="font-medium">{subBatches.reduce((sum, sb) => sum + sb.rejectKotor, 0)}</p>
                                                        </div>
                                                        <div className="bg-red-50 dark:bg-red-950/20 p-2 rounded text-center">
                                                            <p className="text-xs text-muted-foreground">Sobek</p>
                                                            <p className="font-medium">{subBatches.reduce((sum, sb) => sum + sb.rejectSobek, 0)}</p>
                                                        </div>
                                                        <div className="bg-red-50 dark:bg-red-950/20 p-2 rounded text-center">
                                                            <p className="text-xs text-muted-foreground">Rusak Jahit</p>
                                                            <p className="font-medium">{subBatches.reduce((sum, sb) => sum + sb.rejectRusakJahit, 0)}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </>
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

                        {/* Finishing Progress / Status */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Status Finishing</CardTitle>
                                <CardDescription>
                                    {subBatches.length > 0
                                        ? `${subBatches.length} sub-batch hasil finishing`
                                        : "Progress hasil finishing"
                                    }
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Total Hasil Jahit (Input)</span>
                                        <span className="font-medium">{totalSewingOutput} pcs</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Sudah Diproses Finishing</span>
                                        <span className="font-medium text-green-600">{totalFinishingInput} pcs</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Barang Bagus</span>
                                        <span className="font-medium text-green-600">{finishingOutput} pcs</span>
                                    </div>
                                    {finishingReject > 0 && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">Reject</span>
                                            <span className="font-medium text-destructive">{finishingReject} pcs</span>
                                        </div>
                                    )}
                                    <Progress value={totalSewingOutput > 0 ? (totalFinishingInput / totalSewingOutput) * 100 : 0} className="h-2" />
                                </div>

                                {canCompleteBatch ? (
                                    <Alert>
                                        <CheckCircle className="h-4 w-4" />
                                        <AlertDescription>
                                            Semua hasil jahit sudah diproses finishing. Batch siap untuk diselesaikan.
                                        </AlertDescription>
                                    </Alert>
                                ) : totalSewingOutput > 0 && totalFinishingInput < totalSewingOutput ? (
                                    <Alert>
                                        <AlertCircle className="h-4 w-4" />
                                        <AlertDescription>
                                            Masih ada {Math.max(0, totalSewingOutput - totalFinishingInput)} pcs yang belum diproses finishing.
                                        </AlertDescription>
                                    </Alert>
                                ) : null}
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* Completed Tab */}
                <TabsContent value="completed" className="space-y-4">
                    <div className="grid gap-4 lg:grid-cols-2">
                        {/* Timeline */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Timeline</CardTitle>
                                <CardDescription>Riwayat aktivitas batch</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {loadingTimeline ? (
                                    <div className="flex items-center justify-center py-8">
                                        <Loader2 className="h-6 w-6 animate-spin" />
                                    </div>
                                ) : timeline.length > 0 ? (
                                    <div className="space-y-4 max-h-80 overflow-y-auto">
                                        {timeline.map((event, index) => (
                                            <div key={event.id} className="flex gap-3">
                                                <div className="flex flex-col items-center">
                                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm">
                                                        {getEventIcon(event.event)}
                                                    </div>
                                                    {index < timeline.length - 1 && (
                                                        <div className="w-px h-full bg-border mt-1" />
                                                    )}
                                                </div>
                                                <div className="flex-1 pb-4">
                                                    <p className="text-sm font-medium">{getEventLabel(event.event)}</p>
                                                    {event.details && (
                                                        <p className="text-xs text-muted-foreground mt-0.5">{event.details}</p>
                                                    )}
                                                    <p className="text-xs text-muted-foreground mt-1">{formatDate(event.createdAt)}</p>
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

            {/* Sub-Batches (shown when status is after CUTTING_VERIFIED) */}
            {["CUTTING_VERIFIED", "ASSIGNED_TO_SEWER", "IN_SEWING", "SEWING_COMPLETED", "SEWING_VERIFIED", "IN_FINISHING", "FINISHING_COMPLETED", "WAREHOUSE_VERIFIED", "COMPLETED"].includes(batch.status) && (
                <SubBatchList
                    role="PRODUCTION_HEAD"
                    batchId={batch.id}
                    onRefresh={fetchBatchDetail}
                    onVerifyFinishing={openVerifyFinishingDialog}
                />
            )}

            {/* Create Sub-Batch Dialog - untuk input hasil finishing ke gudang */}
            {batch.status === "IN_FINISHING" && (
                <CreateSubBatchDialog
                    open={showSubBatchDialog}
                    onOpenChange={setShowSubBatchDialog}
                    batchId={batch.id}
                    batchSku={batch.batchSku}
                    sewingOutputs={remainingSewingOutputs}
                    onSuccess={async () => {
                        await fetchBatchDetail();
                        await fetchSubBatches();
                    }}
                />
            )}


            <Button
                variant="destructive"
                size="sm"
                onClick={() => setIsDeleteDialogOpen(true)}
                disabled={batch.status !== 'PENDING' && batch.status !== 'MATERIAL_REQUESTED'}
                title={batch.status !== 'PENDING' && batch.status !== 'MATERIAL_REQUESTED' ? 'Tidak dapat menghapus batch dengan status ini' : 'Hapus batch'}
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
                        <AlertDialogTitle>Hapus Batch Produksi?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Apakah Anda yakin ingin menghapus batch <strong>{batch?.batchSku}</strong>?
                            <span className="block mt-2 text-muted-foreground">
                                Aksi ini tidak dapat dibatalkan dan semua data terkait batch ini akan hilang.
                            </span>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Batal</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteBatch}
                            disabled={isDeleting}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {isDeleting ? "Menghapus..." : "Hapus Batch"}
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
                                                    <TableHead className="text-right">Dialokasi</TableHead>
                                                    <TableHead className="text-right">
                                                        {batch.status === "PENDING" || batch.status === "MATERIAL_REQUESTED"
                                                            ? "Stok"
                                                            : "Stok Saat Alokasi"}
                                                    </TableHead>
                                                    <TableHead className="text-center">Status</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {batch.materialColorAllocations.map((allocation, idx) => {
                                                    // Gunakan stockAtAllocation jika sudah dikonfirmasi, else gunakan stok saat ini
                                                    const availableStock = allocation.stockAtAllocation !== null
                                                        ? Number(allocation.stockAtAllocation)
                                                        : Number(allocation.materialColorVariant.stock)
                                                    const variantRoll = allocation.materialColorVariant.rollQuantity
                                                    const availableRoll = allocation.rollQuantityAtAllocation !== null
                                                        ? Number(allocation.rollQuantityAtAllocation)
                                                        : (variantRoll !== undefined && variantRoll !== null ? Number(variantRoll) : null)
                                                    const needed = Number(allocation.allocatedQty)
                                                    const sufficient = availableStock >= needed

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
                                                                <div className="space-y-1">
                                                                    <div>{needed} {allocation.materialColorVariant.unit || allocation.materialColorVariant.material.unit}</div>
                                                                    <div className="text-xs text-muted-foreground">{allocation.rollQuantity} roll</div>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                <div className="space-y-1">
                                                                    <div>{availableStock} {allocation.materialColorVariant.unit || allocation.materialColorVariant.material.unit}</div>
                                                                    <div className="text-xs text-muted-foreground">
                                                                        {availableRoll !== null ? `${availableRoll} roll` : '-'}
                                                                    </div>
                                                                </div>
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
                                                {/* <TableHead>Target</TableHead> */}
                                                <TableHead >Actual Pieces</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {cuttingResults.map((result, idx) => {
                                                // const request = batch.sizeColorRequests?.find(
                                                //     r => r.productSize === result.productSize && r.color === result.color
                                                // );
                                                return (
                                                    <TableRow key={idx}>
                                                        <TableCell className="font-medium">{result.productSize}</TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline">{result.color}</Badge>
                                                        </TableCell>
                                                        {/* <TableCell>{request?.requestedPieces || 0} pcs</TableCell> */}
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

            {/* Input Sewing Results Dialog */}
            <Dialog open={showInputSewingDialog} onOpenChange={setShowInputSewingDialog}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Input Hasil Jahitan</DialogTitle>
                        <DialogDescription>
                            Input hasil jahitan parsial. Anda dapat menginput beberapa kali sampai semua potongan selesai dijahit.
                        </DialogDescription>
                    </DialogHeader>
                    {batch && (
                        <div className="space-y-4 py-4">
                            {sewingSubBatches.length > 0 && (
                                <Alert>
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertDescription>
                                        Sudah ada {batch.sewingTask?.piecesCompleted || 0} pcs hasil jahitan sebelumnya.
                                        Input di bawah hanya untuk sisa yang belum dijahit.
                                    </AlertDescription>
                                </Alert>
                            )}
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Ukuran</TableHead>
                                            <TableHead>Warna</TableHead>
                                            <TableHead className="text-right">Sisa Potong</TableHead>
                                            <TableHead className="text-right">Hasil Jahitan</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {sewingResults.map((result, index) => {
                                            // maxPieces is the remaining from cutting
                                            const maxPieces = result.actualPieces;
                                            return (
                                                <TableRow key={index}>
                                                    <TableCell className="font-medium">{result.productSize}</TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline">{result.color}</Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right text-muted-foreground">{maxPieces} pcs</TableCell>
                                                    <TableCell className="text-right">
                                                        <Input
                                                            type="number"
                                                            min="0"
                                                            max={maxPieces}
                                                            value={result.actualPieces}
                                                            onChange={(e) => {
                                                                const val = Math.min(parseInt(e.target.value) || 0, maxPieces);
                                                                const updated = [...sewingResults];
                                                                updated[index].actualPieces = val;
                                                                setSewingResults(updated);
                                                            }}
                                                            className="w-20 text-right"
                                                        />
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                        <TableRow className="font-bold bg-muted/50">
                                            <TableCell colSpan={2}>Total</TableCell>
                                            <TableCell className="text-right">
                                                {sewingResults.reduce((sum, r) => sum + r.actualPieces, 0)} pcs
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {sewingResults.reduce((sum, r) => sum + r.actualPieces, 0)} pcs
                                            </TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="sewing-notes">Catatan</Label>
                                <Textarea
                                    id="sewing-notes"
                                    placeholder="Catatan hasil jahitan (opsional)"
                                    value={sewingNotes}
                                    onChange={(e) => setSewingNotes(e.target.value)}
                                    className="min-h-24"
                                />
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setShowInputSewingDialog(false);
                                setSewingResults([]);
                                setSewingNotes("");
                            }}
                            disabled={submittingSewing}
                        >
                            Batal
                        </Button>
                        <Button
                            onClick={handleSubmitSewingResults}
                            disabled={submittingSewing || sewingResults.reduce((sum, r) => sum + r.actualPieces, 0) === 0}
                        >
                            {submittingSewing ? "Menyimpan..." : "Simpan Hasil Jahitan"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Complete Sewing Dialog */}
            <Dialog open={showCompleteSewingDialog} onOpenChange={setShowCompleteSewingDialog}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Selesaikan Penjahitan</DialogTitle>
                        <DialogDescription>
                            Tandai penjahitan sebagai selesai dan lanjut ke verifikasi
                        </DialogDescription>
                    </DialogHeader>
                    {batch && batch.sewingTask && (
                        <div className="space-y-4 py-4">
                            <Card>
                                <CardContent className="pt-4 space-y-3">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <Label className="text-muted-foreground text-xs">Input dari Potong</Label>
                                            <p className="text-xl font-bold">{cuttingOutput} pcs</p>
                                        </div>
                                        <div>
                                            <Label className="text-muted-foreground text-xs">Total Dijahit</Label>
                                            <p className="text-xl font-bold text-green-600">{batch.sewingTask.piecesCompleted} pcs</p>
                                        </div>
                                    </div>
                                    {cuttingOutput > batch.sewingTask.piecesCompleted && (
                                        <Alert>
                                            <AlertCircle className="h-4 w-4" />
                                            <AlertDescription>
                                                Masih ada {cuttingOutput - batch.sewingTask.piecesCompleted} pcs yang belum dijahit.
                                                Anda dapat menyelesaikan penjahitan parsial dan meneruskan {batch.sewingTask.piecesCompleted} pcs ke verifikasi dan finishing.
                                            </AlertDescription>
                                        </Alert>
                                    )}
                                    {cuttingOutput <= batch.sewingTask.piecesCompleted && (
                                        <Alert>
                                            <CheckCircle2 className="h-4 w-4" />
                                            <AlertDescription>
                                                Semua potongan sudah dijahit. Siap untuk diselesaikan.
                                            </AlertDescription>
                                        </Alert>
                                    )}
                                </CardContent>
                            </Card>

                            <div className="space-y-2">
                                <Label htmlFor="complete-sewing-notes">Catatan (Opsional)</Label>
                                <Textarea
                                    id="complete-sewing-notes"
                                    placeholder="Catatan penyelesaian penjahitan..."
                                    value={completeSewingNotes}
                                    onChange={(e) => setCompleteSewingNotes(e.target.value)}
                                    rows={3}
                                />
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setShowCompleteSewingDialog(false);
                                setCompleteSewingNotes("");
                            }}
                            disabled={completingSewing}
                        >
                            Batal
                        </Button>
                        <Button
                            onClick={handleCompleteSewing}
                            disabled={completingSewing || (batch?.sewingTask?.piecesCompleted || 0) === 0}
                        >
                            {completingSewing ? "Menyelesaikan..." : `Selesaikan Jahitan (${batch?.sewingTask?.piecesCompleted || 0} pcs)`}
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
                                            <Label className="text-muted-foreground">Dari Potong</Label>
                                            <p className="text-2xl font-bold">{batch.sewingTask.piecesReceived}</p>
                                        </div>
                                        <div>
                                            <Label className="text-muted-foreground">Dijahit</Label>
                                            <p className="text-2xl font-bold text-green-600">{batch.sewingTask.piecesCompleted}</p>
                                        </div>
                                        <div>
                                            <Label className="text-muted-foreground">Sisa</Label>
                                            <p className="text-2xl font-bold text-orange-600">
                                                {Math.max(0, batch.sewingTask.piecesReceived - batch.sewingTask.piecesCompleted)}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Detail per size/color */}
                                    {sewingSubBatches.length > 0 && (
                                        <div className="rounded-md border mt-3">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>Ukuran</TableHead>
                                                        <TableHead>Warna</TableHead>
                                                        <TableHead className="text-right">Pcs</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {(() => {
                                                        // Group sewing sub-batch items by size/color
                                                        const grouped = new Map<string, { productSize: string; color: string; total: number }>();
                                                        for (const sb of sewingSubBatches) {
                                                            for (const item of (sb.items || [])) {
                                                                const key = `${item.productSize}|${item.color}`;
                                                                const existing = grouped.get(key);
                                                                if (existing) {
                                                                    existing.total += item.goodQuantity;
                                                                } else {
                                                                    grouped.set(key, { productSize: item.productSize, color: item.color, total: item.goodQuantity });
                                                                }
                                                            }
                                                        }
                                                        return Array.from(grouped.values()).map((item) => (
                                                            <TableRow key={`${item.productSize}|${item.color}`}>
                                                                <TableCell className="font-medium">{item.productSize}</TableCell>
                                                                <TableCell><Badge variant="outline">{item.color}</Badge></TableCell>
                                                                <TableCell className="text-right">{item.total} pcs</TableCell>
                                                            </TableRow>
                                                        ));
                                                    })()}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    )}

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

            {/* Assign to Finishing Dialog */}
            <Dialog open={showAssignFinishingDialog} onOpenChange={setShowAssignFinishingDialog}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Assign ke Finishing</DialogTitle>
                        <DialogDescription>
                            Pilih kepala finishing untuk mengerjakan batch ini
                        </DialogDescription>
                    </DialogHeader>
                    {batch && (
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="finisher-select">Kepala Finishing</Label>
                                <Select
                                    id="finisher-select"
                                    value={selectedFinisherId}
                                    onChange={(e) => setSelectedFinisherId(e.target.value)}
                                >
                                    <option value="">Pilih kepala finishing</option>
                                    {finishers.map((finisher) => (
                                        <option key={finisher.id} value={finisher.id}>
                                            {finisher.name} ({finisher._count.finishingTasks} task aktif)
                                        </option>
                                    ))}
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="finishing-notes">Catatan (Opsional)</Label>
                                <Textarea
                                    id="finishing-notes"
                                    placeholder="Catatan untuk kepala finishing..."
                                    value={assignFinishingNotes}
                                    onChange={(e) => setAssignFinishingNotes(e.target.value)}
                                    rows={3}
                                />
                            </div>

                            <Card className="bg-blue-50 border-blue-200">
                                <CardContent className="pt-4">
                                    <p className="text-sm text-blue-800">
                                        <strong>Info:</strong> Setelah assign ke finishing, kepala finishing akan menginput hasil finishing melalui sub-batch.
                                    </p>
                                </CardContent>
                            </Card>
                        </div>
                    )}
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setShowAssignFinishingDialog(false);
                                setSelectedFinisherId("");
                                setAssignFinishingNotes("");
                            }}
                            disabled={assigningFinishing}
                        >
                            Batal
                        </Button>
                        <Button onClick={handleAssignToFinishing} disabled={assigningFinishing || !selectedFinisherId}>
                            {assigningFinishing ? "Mengassign..." : "Assign ke Finishing"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Create Sub-Batch Dialog - untuk input hasil finishing ke gudang */}
            {batch && (
                <CreateSubBatchDialog
                    open={showSubBatchDialog}
                    onOpenChange={setShowSubBatchDialog}
                    batchId={batch.id}
                    batchSku={batch.batchSku}
                    sewingOutputs={remainingSewingOutputs}
                    onSuccess={async () => {
                        await fetchBatchDetail();
                        await fetchSubBatches();
                    }}
                />
            )}

            {/* Verify Finishing Dialog */}
            <Dialog open={showVerifyFinishingDialog} onOpenChange={setShowVerifyFinishingDialog}>
                <DialogContent className="max-w-[95vw] sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Verifikasi Hasil Finishing</DialogTitle>
                        <DialogDescription>
                            Verifikasi hasil finishing sebelum dapat diserahkan ke gudang
                        </DialogDescription>
                    </DialogHeader>

                    {verifyingSubBatch && (
                        <div className="space-y-4 py-4">
                            {/* Sub-Batch Info */}
                            <div className="rounded-lg border p-4 space-y-3">
                                <div>
                                    <Label className="text-muted-foreground text-xs">Sub-Batch SKU</Label>
                                    <p className="font-medium font-mono">{verifyingSubBatch.subBatchSku}</p>
                                </div>
                                <Separator />
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label className="text-muted-foreground text-xs">Hasil Bagus</Label>
                                        <p className="font-medium">{verifyingSubBatch.finishingGoodOutput} pcs</p>
                                    </div>
                                    <div>
                                        <Label className="text-muted-foreground text-xs">Total Reject</Label>
                                        <p className="font-medium">
                                            {verifyingSubBatch.rejectKotor + verifyingSubBatch.rejectSobek + verifyingSubBatch.rejectRusakJahit} pcs
                                        </p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-2 text-sm">
                                    <div className="bg-orange-50 p-2 rounded">
                                        <p className="text-xs text-muted-foreground">Kotor</p>
                                        <p className="font-medium">{verifyingSubBatch.rejectKotor}</p>
                                    </div>
                                    <div className="bg-red-50 p-2 rounded">
                                        <p className="text-xs text-muted-foreground">Sobek</p>
                                        <p className="font-medium">{verifyingSubBatch.rejectSobek}</p>
                                    </div>
                                    <div className="bg-red-50 p-2 rounded">
                                        <p className="text-xs text-muted-foreground">Rusak Jahit</p>
                                        <p className="font-medium">{verifyingSubBatch.rejectRusakJahit}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Action Selection */}
                            <div className="space-y-3 pt-4 border-t">
                                <Label>Aksi Verifikasi</Label>
                                <div className="space-y-2">
                                    <Button
                                        variant={verifyFinishingAction === "approve" ? "default" : "outline"}
                                        className="w-full justify-start"
                                        onClick={() => setVerifyFinishingAction("approve")}
                                    >
                                        <CheckCircle className="mr-2 h-4 w-4" />
                                        Setujui - Kirim ke Gudang
                                    </Button>
                                    <Button
                                        variant={verifyFinishingAction === "reject" ? "destructive" : "outline"}
                                        className="w-full justify-start"
                                        onClick={() => setVerifyFinishingAction("reject")}
                                    >
                                        <AlertCircle className="mr-2 h-4 w-4" />
                                        Tolak - Hapus Sub-Batch
                                    </Button>
                                </div>
                            </div>

                            {/* Notes */}
                            <div className="space-y-2">
                                <Label htmlFor="verify-finishing-notes">Catatan (Opsional)</Label>
                                <Textarea
                                    id="verify-finishing-notes"
                                    placeholder="Catatan untuk verifikasi..."
                                    value={verifyFinishingNotes}
                                    onChange={(e) => setVerifyFinishingNotes(e.target.value)}
                                    rows={3}
                                />
                            </div>

                            {verifyFinishingAction === "reject" && (
                                <Alert variant="destructive">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertDescription>
                                        <strong>Peringatan:</strong> Sub-batch ini akan dihapus secara permanen. Hasil jahit yang sudah di-submit akan kembali tersedia untuk diinput ulang di sub-batch baru.
                                    </AlertDescription>
                                </Alert>
                            )}
                        </div>
                    )}

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setShowVerifyFinishingDialog(false);
                                setVerifyingSubBatch(null);
                                setVerifyFinishingNotes("");
                            }}
                            disabled={verifyingFinishing}
                        >
                            Batal
                        </Button>
                        <Button
                            onClick={handleVerifyFinishing}
                            disabled={verifyingFinishing}
                            variant={verifyFinishingAction === "reject" ? "destructive" : "default"}
                        >
                            {verifyingFinishing
                                ? verifyFinishingAction === "approve"
                                    ? "Menyetujui..."
                                    : "Menghapus..."
                                : verifyFinishingAction === "approve"
                                    ? "Setujui & Kirim"
                                    : "Tolak & Hapus"}
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
                            Apakah Anda yakin ingin menyelesaikan batch ini?
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

                        {/* Finishing Progress */}
                        <div className="rounded-lg border p-4 space-y-2 bg-muted/50">
                            <p className="text-sm font-medium">Progress Finishing</p>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Input dari Jahit:</span>
                                <span className="font-medium">{totalSewingOutput} pcs</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Sudah Diproses:</span>
                                <span className="font-medium">{totalFinishingInput} pcs</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Barang Jadi:</span>
                                <span className="font-medium text-green-600">{finishingOutput} pcs</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Total Reject:</span>
                                <span className="font-medium text-destructive">{finishingReject} pcs</span>
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

                        {/* Completion Criteria */}
                        {canCompleteBatch ? (
                            <Alert>
                                <CheckCircle className="h-4 w-4" />
                                <AlertDescription>
                                    Semua hasil jahit ({totalSewingOutput} pcs) sudah diproses di finishing.
                                    Batch siap untuk diselesaikan.
                                </AlertDescription>
                            </Alert>
                        ) : (
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>
                                    Masih ada {Math.max(0, totalSewingOutput - totalFinishingInput)} pcs yang belum diproses di finishing.
                                    Batch baru dapat diselesaikan jika jumlah pcs hasil jahit = barang jadi + kotor + sobek + rusak jahit.
                                </AlertDescription>
                            </Alert>
                        )}
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
                            disabled={completing || !canCompleteBatch}
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

            {/* Verify Sewing Sub-Batch Dialog */}
            <Dialog open={showVerifySewingSubBatchDialog} onOpenChange={setShowVerifySewingSubBatchDialog}>
                <DialogContent className="max-w-[95vw] sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Verifikasi Sub-Batch Jahitan</DialogTitle>
                        <DialogDescription>
                            Verifikasi kualitas hasil jahitan sub-batch ini
                        </DialogDescription>
                    </DialogHeader>

                    {verifySewingSubBatch && (
                        <div className="space-y-4 py-4">
                            <div className="rounded-lg border p-4 space-y-3">
                                <div>
                                    <Label className="text-muted-foreground text-xs">Sub-Batch SKU</Label>
                                    <p className="font-medium font-mono">{verifySewingSubBatch.subBatchSku}</p>
                                </div>
                                <Separator />
                                <div>
                                    <Label className="text-muted-foreground text-xs">Detail Hasil Jahitan</Label>
                                    <div className="rounded-md border mt-1">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Ukuran</TableHead>
                                                    <TableHead>Warna</TableHead>
                                                    <TableHead className="text-right">Pcs</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {(verifySewingSubBatch.items || []).map((item: { id: string; productSize: string; color: string; goodQuantity: number }) => (
                                                    <TableRow key={item.id}>
                                                        <TableCell className="font-medium">{item.productSize}</TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline">{item.color}</Badge>
                                                        </TableCell>
                                                        <TableCell className="text-right">{item.goodQuantity} pcs</TableCell>
                                                    </TableRow>
                                                ))}
                                                <TableRow className="font-bold bg-muted/50">
                                                    <TableCell colSpan={2}>Total</TableCell>
                                                    <TableCell className="text-right">
                                                        {(verifySewingSubBatch.items || []).reduce((sum: number, item: { goodQuantity?: number }) => sum + (item.goodQuantity || 0), 0)} pcs
                                                    </TableCell>
                                                </TableRow>
                                            </TableBody>
                                        </Table>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Aksi Verifikasi</Label>
                                <div className="flex gap-2">
                                    <Button
                                        variant={verifySewingSubBatchAction === "approve" ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => setVerifySewingSubBatchAction("approve")}
                                    >
                                        <CheckCircle className="h-4 w-4 mr-1" />
                                        Setujui
                                    </Button>
                                    <Button
                                        variant={verifySewingSubBatchAction === "reject" ? "destructive" : "outline"}
                                        size="sm"
                                        onClick={() => setVerifySewingSubBatchAction("reject")}
                                    >
                                        <Trash2 className="h-4 w-4 mr-1" />
                                        Tolak
                                    </Button>
                                </div>
                                {verifySewingSubBatchAction === "reject" && (
                                    <Alert variant="destructive" className="mt-2">
                                        <AlertCircle className="h-4 w-4" />
                                        <AlertDescription>
                                            Sub-batch akan dihapus dan jumlah pcs dikurangi dari sewing task. Penjahit dapat menginput ulang.
                                        </AlertDescription>
                                    </Alert>
                                )}
                            </div>
                        </div>
                    )}

                    <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2">
                        <Button variant="outline" onClick={() => setShowVerifySewingSubBatchDialog(false)} disabled={verifyingSewingSubBatch}>
                            Batal
                        </Button>
                        <Button
                            onClick={handleVerifySewingSubBatch}
                            disabled={verifyingSewingSubBatch}
                            variant={verifySewingSubBatchAction === "reject" ? "destructive" : "default"}
                        >
                            {verifyingSewingSubBatch ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Memproses...
                                </>
                            ) : verifySewingSubBatchAction === "approve" ? (
                                "Setujui Sub-Batch"
                            ) : (
                                "Tolak Sub-Batch"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Forward to Finishing Dialog */}
            <Dialog open={showForwardToFinishingDialog} onOpenChange={setShowForwardToFinishingDialog}>
                <DialogContent className="max-w-[95vw] sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Teruskan ke Finishing</DialogTitle>
                        <DialogDescription>
                            Teruskan sub-batch jahitan yang sudah diverifikasi ke tahap finishing
                        </DialogDescription>
                    </DialogHeader>

                    {forwardingSubBatch && (
                        <div className="space-y-4 py-4">
                            <div className="rounded-lg border p-4 space-y-3">
                                <div>
                                    <Label className="text-muted-foreground text-xs">Sub-Batch SKU</Label>
                                    <p className="font-medium font-mono">{forwardingSubBatch.subBatchSku}</p>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground text-xs">Total Pcs</Label>
                                    <p className="font-medium">
                                        {(forwardingSubBatch.items || []).reduce((sum: number, item: { goodQuantity?: number }) => sum + (item.goodQuantity || 0), 0)} pcs
                                    </p>
                                </div>
                            </div>

                            {/* Show finisher selection only if no finishing task exists */}
                            {!batch?.finishingTask && (
                                <div className="space-y-2">
                                    <Label htmlFor="forward-finisher-select">Kepala Finishing</Label>
                                    <Select
                                        id="forward-finisher-select"
                                        value={forwardFinisherId}
                                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setForwardFinisherId(e.target.value)}
                                    >
                                        <option value="">Pilih kepala finishing</option>
                                        {finishers.map((finisher) => (
                                            <option key={finisher.id} value={finisher.id}>
                                                {finisher.name} ({finisher._count.finishingTasks} task aktif)
                                            </option>
                                        ))}
                                    </Select>
                                </div>
                            )}

                            {batch?.finishingTask && (
                                <Card className="bg-blue-50 border-blue-200">
                                    <CardContent className="pt-4">
                                        <p className="text-sm text-blue-800">
                                            <strong>Info:</strong> Sub-batch ini akan diteruskan ke finishing task yang sudah ada.
                                            Jumlah pcs akan ditambahkan ke total penerimaan finishing.
                                        </p>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    )}

                    <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setShowForwardToFinishingDialog(false);
                                setForwardingSubBatch(null);
                                setForwardFinisherId("");
                            }}
                            disabled={forwardingToFinishing}
                        >
                            Batal
                        </Button>
                        <Button
                            onClick={handleForwardToFinishing}
                            disabled={forwardingToFinishing || (!batch?.finishingTask && !forwardFinisherId)}
                        >
                            {forwardingToFinishing ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Memproses...
                                </>
                            ) : (
                                <>
                                    <ArrowRight className="h-4 w-4 mr-2" />
                                    Teruskan ke Finishing
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
