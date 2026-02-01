"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { CheckCircle, Loader2, AlertCircle, Plus, ArrowLeft, Play } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { toast } from "@/lib/toast";
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CreateSubBatchDialog } from "@/components/create-sub-batch-dialog"
import { SubBatchList } from "@/components/sub-batch-list"
import { formatDateTime } from "@/lib/utils"

interface FinishingTask {
    id: string
    batchId: string
    materialReceived: number
    piecesCompleted: number
    rejectPieces: number
    piecesReceived: number
    wasteQty: number | null
    status: string
    notes: string | null
    startedAt: string | null
    completedAt: string | null
    batch: {
        id: string
        batchSku: string
        status: string
        targetQuantity: number
        totalRolls: number | null
        product: {
            name: string
        }
        sizeColorRequests?: Array<{
            id: string
            productSize: string
            color: string
            requestedPieces: number
        }>
        finishingResult?: Array<{
            id: string
            productSize: string
            color: string
            actualPieces: number
        }>
        materialColorAllocations: Array<{
            id: string
            allocatedQty: number
            allocatedItem: string
            batch: {
                id: string
                batchSku: string
                sizeColorRequests: Array<{
                    id: string
                    productSize: string
                    color: string
                    requestedPieces: number
                }>
            }
            materialColorVariant: {
                id: string
                unit: string
            }
        }>
    }
}

interface TimelineEvent {
    id: string
    batchId: string
    event: string
    details: string | null
    createdAt: string
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

export default function FinishingTaskDetailPage() {
    const router = useRouter()
    const params = useParams()
    const taskId = params.id as string

    const [batch, setBatch] = useState<{
        id: string;
        batchSku: string;
        status: string;
        targetQuantity: number;
        totalRolls: number | null;
        product: {
            name: string;
        };
        sizeColorRequests?: Array<{
            id: string
            productSize: string
            color: string
            requestedPieces: number
        }>;
        cuttingResults?: Array<{
            id: string
            productSize: string
            color: string
            actualPieces: number
        }>;
        sewingTask?: {
            piecesCompleted: number;
        };
    } | null>(null)
    const [task, setTask] = useState<FinishingTask | null>(null)
    const [loading, setLoading] = useState(true)
    const [subBatches, setSubBatches] = useState<SubBatchSummary[]>([]);
    const [showSubBatchDialog, setShowSubBatchDialog] = useState(false);
    const [startingFinishing, setStartingFinishing] = useState(false);

    const handleStartFinishing = async () => {
        setStartingFinishing(true);
        try {
            const response = await fetch(`/api/finishing-tasks/${taskId}/start`, {
                method: 'PATCH',
            });
            const result = await response.json();

            if (result.success || response.ok) {
                toast.success("Berhasil", "Proses finishing dimulai");
                await fetchTask();
            } else {
                toast.error("Gagal", result.error || "Gagal memulai finishing");
            }
        } catch (error) {
            console.error("Error starting finishing:", error);
            toast.error("Gagal", "Terjadi kesalahan saat memulai finishing");
        } finally {
            setStartingFinishing(false);
        }
    };

    const fetchTask = async () => {
        try {
            const response = await fetch(`/api/finishing-tasks/${taskId}`)
            if (response.ok) {
                const data = await response.json()
                setTask(data)
            } else {
                toast.error("Gagal", "Task tidak ditemukan")
                router.push("/finishing/process")
            }
        } catch (err) {
            toast.error("Gagal", "Gagal memuat data task: " + err)
        } finally {
            setLoading(false)
        }
    }
    console.log(task)
    const fetchSubBatches = async () => {
        try {
            const response = await fetch(`/api/production-batches/${task?.batch.id}/sub-batches`);
            const result = await response.json();

            if (result.success) {
                setSubBatches(result.data || []);
            }
        } catch (error) {
            console.error("Error fetching sub-batches:", error);
        }
    };

    const fetchBatchDetail = async () => {
        try {
            setLoading(true);
            const response = await fetch(`/api/production-batches/${task?.batch.id}`);
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

    useEffect(() => {
        fetchTask()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [taskId])

    useEffect(() => {
        // Fetch sub-batches and batch detail when task is loaded
        if (task?.batch?.id) {
            fetchSubBatches();
            fetchBatchDetail();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [task?.batch?.id])

    // Calculate submitted items from sub-batches
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

    // Calculate remaining sewingOutputs for dialog
    const remainingSewingOutputs = (batch?.cuttingResults?.map(cr => ({
        productSize: cr.productSize,
        color: cr.color,
        quantity: Math.max(0, cr.actualPieces - (submittedItems.get(`${cr.productSize}|${cr.color}`) || 0)),
    })) || []).filter(output => output.quantity > 0);

    // Calculate total finishing input (dari semua sub-batches)
    let totalFinishingInput = 0;
    let totalFinishingGood = 0;
    let totalFinishingReject = 0;
    for (const subBatch of subBatches) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (subBatch && (subBatch as any).items && Array.isArray((subBatch as any).items)) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            for (const item of (subBatch as any).items) {
                const good = item.goodQuantity || 0;
                const reject = (item.rejectKotor || 0) + (item.rejectSobek || 0) + (item.rejectRusakJahit || 0);
                totalFinishingGood += good;
                totalFinishingReject += reject;
                totalFinishingInput += good + reject;
            }
        }
    }

    // Calculate total sewing output (jumlah pcs yang seharusnya masuk finishing)
    const totalSewingOutput = batch?.sewingTask?.piecesCompleted || (batch?.cuttingResults?.reduce((sum, r) => sum + r.actualPieces, 0) || 0);

    // Check if all sewing output has been processed in finishing
    const canCompleteBatch = totalFinishingInput > 0 && totalFinishingInput === totalSewingOutput;

    const getStatusBadge = (status: string) => {
        const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", label: string }> = {
            'ASSIGNED_TO_FINISHING': { variant: 'outline', label: 'Menunggu Dimulai' },
            'IN_FINISHING': { variant: 'default', label: 'Sedang Proses' },
            'FINISHING_COMPLETED': { variant: 'secondary', label: 'Selesai' },
            'FINISHING_VERIFIED': { variant: 'secondary', label: 'Terverifikasi' }
        }
        const config = variants[status] || { variant: 'outline', label: status }
        return <Badge variant={config.variant}>{config.label}</Badge>
    }

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        )
    }

    if (!task) {
        return (
            <div className="flex-1 space-y-4 p-4 sm:p-6 md:p-8 pt-4 sm:pt-6">
                <Button variant="outline" onClick={() => router.push("/finishing/process")}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Kembali
                </Button>
                <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                        Task tidak ditemukan.
                    </AlertDescription>
                </Alert>
            </div>
        )
    }

    const currentBatch = {
        id: task.batch.id,
        batchSku: task.batch.batchSku,
        code: task.batch.batchSku,
        startedAt: task.startedAt ? formatDateTime(task.startedAt) : "N/A",
        completedAt: task.completedAt ? formatDateTime(task.completedAt) : "N/A",
        product: task.batch.product.name,
        target: task.batch.targetQuantity,
        completed: totalFinishingInput,
        materialReceived: task.batch.materialColorAllocations.reduce((sum: number, alloc: { allocatedQty: number }) => sum + alloc.allocatedQty, 0),
        materialItems: task.batch.materialColorAllocations.map((alloc: { materialColorVariant: { unit: string } }) => alloc.materialColorVariant.unit).join(", "),
        totalRoll: task.batch.totalRolls,
        status: task.batch.status
    }
    console.log("Current Batch:", currentBatch);
    return (
        <div className="flex-1 space-y-4 p-4 sm:p-6 md:p-8 pt-4 sm:pt-6">
            {/* Header dengan tombol kembali */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push("/finishing/process")}
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Detail Task Finishing</h2>
                        <p className="text-sm sm:text-base text-muted-foreground">
                            {currentBatch.code}
                        </p>
                    </div>
                </div>
            </div>

            {/* Current Batch Info */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <CardTitle className="font-mono text-lg sm:text-xl">{currentBatch.code}</CardTitle>
                            <CardDescription>{currentBatch.product}</CardDescription>
                        </div>
                        {getStatusBadge(currentBatch.status)}
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                        <div className="space-y-1">
                            <p className="text-xs sm:text-sm text-muted-foreground">Selesai</p>
                            <p className="text-lg sm:text-2xl font-bold text-green-600">{currentBatch.completed > 0 ? currentBatch.completed + " pcs" : 0}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-xs sm:text-sm text-muted-foreground">Pcs Diterima</p>
                            <p className="text-lg sm:text-2xl font-bold">{Number(task.piecesReceived) || 0} Pcs</p>
                        </div>
                    </div>
                    <div className="pt-2 border-t">

                        <div className="text-xs text-muted-foreground mt-2 flex justify-between">
                            {task.startedAt && (
                                <> Ditugaskan pada <Badge variant="outline">{formatDateTime(task.startedAt)}</Badge></>
                            )}
                        </div>
                        <div className="text-xs text-muted-foreground mt-2 flex justify-between">
                            {task.completedAt && (
                                <> Selesai pada <Badge variant="outline">{formatDateTime(task.completedAt)}</Badge></>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Finishing Actions - ASSIGNED_TO_FINISHING status */}
            {currentBatch.status === 'ASSIGNED_TO_FINISHING' && (
                <Card>
                    <CardHeader>
                        <CardTitle>Mulai Proses Finishing</CardTitle>
                        <CardDescription>
                            Batch ini sudah ditugaskan untuk finishing. Klik tombol di bawah untuk memulai proses.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button
                            onClick={handleStartFinishing}
                            disabled={startingFinishing}
                            className="w-full"
                            size="lg"
                        >
                            {startingFinishing ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                                <Play className="h-4 w-4 mr-2" />
                            )}
                            {startingFinishing ? "Memulai..." : "Mulai Finishing"}
                        </Button>
                    </CardContent>
                </Card>
            )}
            {/* Finishing Actions - IN_FINISHING status */}
            {currentBatch.status === 'IN_FINISHING' && (
                <Card>
                    <CardHeader>
                        <CardTitle>Proses Finishing</CardTitle>
                        <CardDescription>
                            Input hasil finishing untuk dikirim ke gudang
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Progress Info */}
                        <div className="space-y-3">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Input dari Jahit</span>
                                <span className="font-medium">{totalSewingOutput} pcs</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Sudah Diproses</span>
                                <span className="font-medium">{totalFinishingInput} pcs</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Barang Jadi</span>
                                <span className="font-medium text-green-600">{totalFinishingGood} pcs</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Total Reject</span>
                                <span className="font-medium text-destructive">{totalFinishingReject} pcs</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Sisa Belum Diproses</span>
                                <span className="font-medium text-orange-600">{Math.max(0, totalSewingOutput - totalFinishingInput)} pcs</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                    className="bg-green-600 h-2 rounded-full transition-all"
                                    style={{ width: `${totalSewingOutput > 0 ? (totalFinishingInput / totalSewingOutput) * 100 : 0}%` }}
                                ></div>
                            </div>
                        </div>

                        {/* Completion Status */}
                        {canCompleteBatch ? (
                            <Alert>
                                <CheckCircle className="h-4 w-4" />
                                <AlertDescription>
                                    Semua hasil jahit ({totalSewingOutput} pcs) sudah diproses di finishing.
                                    Hasil: {totalFinishingGood} barang jadi, {totalFinishingReject} reject.
                                </AlertDescription>
                            </Alert>
                        ) : (
                            <Alert>
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>
                                    Masih ada {Math.max(0, totalSewingOutput - totalFinishingInput)} pcs hasil jahit yang belum diproses.
                                    Klik tombol di bawah untuk input hasil finishing.
                                </AlertDescription>
                            </Alert>
                        )}

                        {/* Action Button - Always visible when IN_FINISHING */}
                        <Button
                            onClick={() => setShowSubBatchDialog(true)}
                            disabled={remainingSewingOutputs.length === 0}
                            className="w-full"
                            size="lg"
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            {remainingSewingOutputs.length === 0
                                ? "Semua Hasil Jahit Sudah Diproses"
                                : "Input Hasil Finishing"}
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Finishing Completed */}
            {(currentBatch.status === 'FINISHING_COMPLETED' || currentBatch.status === 'WAREHOUSE_VERIFIED') && (
                <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                        Task finishing sudah {currentBatch.status === 'WAREHOUSE_VERIFIED' ? 'terverifikasi oleh gudang' : 'selesai dan menunggu verifikasi gudang'}.
                    </AlertDescription>
                </Alert>
            )}

            {/* Sub-Batches List - daftar sub-batch hasil finishing */}
            {['IN_FINISHING', 'FINISHING_COMPLETED', 'WAREHOUSE_VERIFIED', 'COMPLETED'].includes(currentBatch.status) && (
                <SubBatchList
                    role="FINISHING"
                    batchId={currentBatch.id}
                    onRefresh={async () => {
                        await fetchBatchDetail();
                        await fetchSubBatches();
                    }}
                />
            )}

            {/* Create Sub-Batch Dialog - untuk input hasil finishing ke gudang */}
            {currentBatch.status === 'IN_FINISHING' && (
                <CreateSubBatchDialog
                    open={showSubBatchDialog}
                    onOpenChange={setShowSubBatchDialog}
                    batchId={currentBatch.id}
                    batchSku={currentBatch.batchSku}
                    sewingOutputs={remainingSewingOutputs}
                    onSuccess={async () => {
                        await fetchBatchDetail();
                        await fetchSubBatches();
                    }}
                />
            )}

        </div>
    )
}
