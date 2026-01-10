"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/lib/toast";
import {
    AlertCircle,
    ArrowLeft,
    CheckCircle,
    CheckCircle2,
    Loader2,
    Package,
    PlayCircle
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";

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

export default function BatchActionPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params);
    const router = useRouter();
    const { data: session, status } = useSession();
    const [batch, setBatch] = useState<ProductionBatch | null>(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);

    // Form states for different roles
    const [piecesCompleted, setPiecesCompleted] = useState("");
    const [rejectPieces, setRejectPieces] = useState("");
    const [wasteQty, setWasteQty] = useState("");
    const [notes, setNotes] = useState("");

    useEffect(() => {
        if (status === "authenticated") {
            fetchBatchDetail();
        }
    }, [resolvedParams.id, status]);

    const fetchBatchDetail = async () => {
        try {
            setLoading(true);
            const response = await fetch(`/api/production-batches/${resolvedParams.id}`);
            const result = await response.json();

            if (result.success) {
                setBatch(result.data);
            } else {
                toast.error("Error", "Batch tidak ditemukan");
                router.push("/");
            }
        } catch (error) {
            console.error("Error fetching batch detail:", error);
            toast.error("Error", "Gagal memuat detail batch");
        } finally {
            setLoading(false);
        }
    };

    const handleStartTask = async () => {
        if (!batch) return;

        setProcessing(true);
        try {
            const role = session?.user?.role;
            let endpoint = "";

            if (role === "PEMOTONG" && batch.cuttingTask) {
                endpoint = `/api/cutting-tasks/${batch.cuttingTask.id}/start`;
            } else if (role === "PENJAHIT" && batch.sewingTask) {
                endpoint = `/api/sewing-tasks/${batch.sewingTask.id}/start`;
            } else if (role === "FINISHING" && batch.finishingTask) {
                endpoint = `/api/finishing-tasks/${batch.finishingTask.id}/start`;
            }

            if (!endpoint) {
                toast.error("Error", "Task tidak ditemukan");
                return;
            }

            const response = await fetch(endpoint, {
                method: "POST",
            });

            const result = await response.json();

            if (result.success) {
                toast.success("Berhasil", "Task dimulai");
                fetchBatchDetail();
            } else {
                toast.error("Error", result.error || "Gagal memulai task");
            }
        } catch (error) {
            console.error("Error starting task:", error);
            toast.error("Error", "Terjadi kesalahan saat memulai task");
        } finally {
            setProcessing(false);
        }
    };

    const handleCompleteTask = async () => {
        if (!batch) return;

        if (!piecesCompleted || parseInt(piecesCompleted) <= 0) {
            toast.warning("Perhatian", "Masukkan jumlah potongan/jahitan yang selesai");
            return;
        }

        setProcessing(true);
        try {
            const role = session?.user?.role;
            let endpoint = "";
            const body: any = {
                piecesCompleted: parseInt(piecesCompleted),
                rejectPieces: parseInt(rejectPieces) || 0,
                notes: notes || null,
            };

            if (role === "PEMOTONG" && batch.cuttingTask) {
                endpoint = `/api/cutting-tasks/${batch.cuttingTask.id}/complete`;
                body.wasteQty = parseFloat(wasteQty) || 0;
            } else if (role === "PENJAHIT" && batch.sewingTask) {
                endpoint = `/api/sewing-tasks/${batch.sewingTask.id}/complete`;
            } else if (role === "FINISHING" && batch.finishingTask) {
                endpoint = `/api/finishing-tasks/${batch.finishingTask.id}/complete`;
            }

            if (!endpoint) {
                toast.error("Error", "Task tidak ditemukan");
                return;
            }

            const response = await fetch(endpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(body),
            });

            const result = await response.json();

            if (result.success) {
                toast.success("Berhasil", "Task selesai dikerjakan");
                fetchBatchDetail();
                // Reset form
                setPiecesCompleted("");
                setRejectPieces("");
                setWasteQty("");
                setNotes("");
            } else {
                toast.error("Error", result.error || "Gagal menyelesaikan task");
            }
        } catch (error) {
            console.error("Error completing task:", error);
            toast.error("Error", "Terjadi kesalahan saat menyelesaikan task");
        } finally {
            setProcessing(false);
        }
    };

    const getStatusBadge = (status: string) => {
        const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
            PENDING: { label: "Menunggu", variant: "secondary" },
            IN_PROGRESS: { label: "Sedang Dikerjakan", variant: "default" },
            COMPLETED: { label: "Selesai", variant: "outline" },
            VERIFIED: { label: "Terverifikasi", variant: "outline" },
        };
        const info = statusMap[status] || { label: status, variant: "secondary" };
        return <Badge variant={info.variant}>{info.label}</Badge>;
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

    const renderActionCard = () => {
        if (!batch || !session?.user) return null;

        const role = session.user.role;

        // PEMOTONG Actions
        if (role === "PEMOTONG" && batch.cuttingTask) {
            const task = batch.cuttingTask;
            const canStart = task.status === "PENDING";
            const canComplete = task.status === "IN_PROGRESS";

            return (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Package className="h-5 w-5" />
                            Tugas Pemotongan
                        </CardTitle>
                        <CardDescription>
                            Kelola proses pemotongan untuk batch ini
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm text-muted-foreground">Status</p>
                                <p className="font-medium">{getStatusBadge(task.status)}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Material Diterima</p>
                                <p className="font-medium">{task.materialReceived} unit</p>
                            </div>
                        </div>

                        {canStart && (
                            <Button onClick={handleStartTask} disabled={processing} className="w-full">
                                {processing ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Memproses...
                                    </>
                                ) : (
                                    <>
                                        <PlayCircle className="h-4 w-4 mr-2" />
                                        Mulai Pemotongan
                                    </>
                                )}
                            </Button>
                        )}

                        {canComplete && (
                            <div className="space-y-4">
                                <Separator />
                                <div className="space-y-3">
                                    <div className="space-y-2">
                                        <Label htmlFor="completed">Potongan Selesai *</Label>
                                        <Input
                                            id="completed"
                                            type="number"
                                            min="0"
                                            placeholder="Jumlah potongan yang selesai"
                                            value={piecesCompleted}
                                            onChange={(e) => setPiecesCompleted(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="reject">Potongan Reject</Label>
                                        <Input
                                            id="reject"
                                            type="number"
                                            min="0"
                                            placeholder="Jumlah potongan reject"
                                            value={rejectPieces}
                                            onChange={(e) => setRejectPieces(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="waste">Sisa Material (kg)</Label>
                                        <Input
                                            id="waste"
                                            type="number"
                                            min="0"
                                            step="0.1"
                                            placeholder="Sisa material dalam kg"
                                            value={wasteQty}
                                            onChange={(e) => setWasteQty(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="notes">Catatan</Label>
                                        <Textarea
                                            id="notes"
                                            placeholder="Tambahkan catatan (opsional)"
                                            value={notes}
                                            onChange={(e) => setNotes(e.target.value)}
                                            rows={3}
                                        />
                                    </div>
                                    <Button onClick={handleCompleteTask} disabled={processing} className="w-full">
                                        {processing ? (
                                            <>
                                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                Memproses...
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircle className="h-4 w-4 mr-2" />
                                                Selesaikan Pemotongan
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        )}

                        {task.status === "COMPLETED" && (
                            <Alert>
                                <CheckCircle2 className="h-4 w-4" />
                                <AlertDescription>
                                    Task pemotongan telah selesai. Menunggu verifikasi dari Kepala Produksi.
                                </AlertDescription>
                            </Alert>
                        )}

                        {task.status === "VERIFIED" && (
                            <Alert>
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                                <AlertDescription className="text-green-600">
                                    Task pemotongan telah diverifikasi dan disetujui.
                                </AlertDescription>
                            </Alert>
                        )}
                    </CardContent>
                </Card>
            );
        }

        // PENJAHIT Actions
        if (role === "PENJAHIT" && batch.sewingTask) {
            const task = batch.sewingTask;
            const canStart = task.status === "PENDING";
            const canComplete = task.status === "IN_PROGRESS";

            return (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Package className="h-5 w-5" />
                            Tugas Penjahitan
                        </CardTitle>
                        <CardDescription>
                            Kelola proses penjahitan untuk batch ini
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm text-muted-foreground">Status</p>
                                <p className="font-medium">{getStatusBadge(task.status)}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Potongan Diterima</p>
                                <p className="font-medium">{task.piecesReceived} pcs</p>
                            </div>
                        </div>

                        {canStart && (
                            <Button onClick={handleStartTask} disabled={processing} className="w-full">
                                {processing ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Memproses...
                                    </>
                                ) : (
                                    <>
                                        <PlayCircle className="h-4 w-4 mr-2" />
                                        Mulai Penjahitan
                                    </>
                                )}
                            </Button>
                        )}

                        {canComplete && (
                            <div className="space-y-4">
                                <Separator />
                                <div className="space-y-3">
                                    <div className="space-y-2">
                                        <Label htmlFor="completed">Jahitan Selesai *</Label>
                                        <Input
                                            id="completed"
                                            type="number"
                                            min="0"
                                            placeholder="Jumlah jahitan yang selesai"
                                            value={piecesCompleted}
                                            onChange={(e) => setPiecesCompleted(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="reject">Jahitan Reject</Label>
                                        <Input
                                            id="reject"
                                            type="number"
                                            min="0"
                                            placeholder="Jumlah jahitan reject"
                                            value={rejectPieces}
                                            onChange={(e) => setRejectPieces(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="notes">Catatan</Label>
                                        <Textarea
                                            id="notes"
                                            placeholder="Tambahkan catatan (opsional)"
                                            value={notes}
                                            onChange={(e) => setNotes(e.target.value)}
                                            rows={3}
                                        />
                                    </div>
                                    <Button onClick={handleCompleteTask} disabled={processing} className="w-full">
                                        {processing ? (
                                            <>
                                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                Memproses...
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircle className="h-4 w-4 mr-2" />
                                                Selesaikan Penjahitan
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        )}

                        {task.status === "COMPLETED" && (
                            <Alert>
                                <CheckCircle2 className="h-4 w-4" />
                                <AlertDescription>
                                    Task penjahitan telah selesai. Menunggu verifikasi dari Kepala Produksi.
                                </AlertDescription>
                            </Alert>
                        )}

                        {task.status === "VERIFIED" && (
                            <Alert>
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                                <AlertDescription className="text-green-600">
                                    Task penjahitan telah diverifikasi dan disetujui.
                                </AlertDescription>
                            </Alert>
                        )}
                    </CardContent>
                </Card>
            );
        }

        // FINISHING Actions
        if (role === "FINISHING" && batch.finishingTask) {
            const task = batch.finishingTask;
            const canStart = task.status === "PENDING";
            const canComplete = task.status === "IN_PROGRESS";

            return (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Package className="h-5 w-5" />
                            Tugas Finishing
                        </CardTitle>
                        <CardDescription>
                            Kelola proses finishing untuk batch ini
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm text-muted-foreground">Status</p>
                                <p className="font-medium">{getStatusBadge(task.status)}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Produk Diterima</p>
                                <p className="font-medium">{task.piecesReceived} pcs</p>
                            </div>
                        </div>

                        {canStart && (
                            <Button onClick={handleStartTask} disabled={processing} className="w-full">
                                {processing ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Memproses...
                                    </>
                                ) : (
                                    <>
                                        <PlayCircle className="h-4 w-4 mr-2" />
                                        Mulai Finishing
                                    </>
                                )}
                            </Button>
                        )}

                        {canComplete && (
                            <div className="space-y-4">
                                <Separator />
                                <div className="space-y-3">
                                    <div className="space-y-2">
                                        <Label htmlFor="completed">Produk Selesai *</Label>
                                        <Input
                                            id="completed"
                                            type="number"
                                            min="0"
                                            placeholder="Jumlah produk yang selesai"
                                            value={piecesCompleted}
                                            onChange={(e) => setPiecesCompleted(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="reject">Produk Reject</Label>
                                        <Input
                                            id="reject"
                                            type="number"
                                            min="0"
                                            placeholder="Jumlah produk reject"
                                            value={rejectPieces}
                                            onChange={(e) => setRejectPieces(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="notes">Catatan</Label>
                                        <Textarea
                                            id="notes"
                                            placeholder="Tambahkan catatan (opsional)"
                                            value={notes}
                                            onChange={(e) => setNotes(e.target.value)}
                                            rows={3}
                                        />
                                    </div>
                                    <Button onClick={handleCompleteTask} disabled={processing} className="w-full">
                                        {processing ? (
                                            <>
                                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                Memproses...
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircle className="h-4 w-4 mr-2" />
                                                Selesaikan Finishing
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        )}

                        {task.status === "COMPLETED" && (
                            <Alert>
                                <CheckCircle2 className="h-4 w-4" />
                                <AlertDescription>
                                    Task finishing telah selesai. Menunggu verifikasi dari Warehouse.
                                </AlertDescription>
                            </Alert>
                        )}

                        {task.status === "VERIFIED" && (
                            <Alert>
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                                <AlertDescription className="text-green-600">
                                    Task finishing telah diverifikasi dan disetujui.
                                </AlertDescription>
                            </Alert>
                        )}
                    </CardContent>
                </Card>
            );
        }

        // For roles without specific actions
        return (
            <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                    Tidak ada aksi yang tersedia untuk role Anda pada batch ini.
                </AlertDescription>
            </Alert>
        );
    };

    if (status === "loading" || loading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!batch) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <Card className="w-full max-w-md">
                    <CardContent className="pt-6">
                        <div className="text-center space-y-4">
                            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto" />
                            <div>
                                <h3 className="text-lg font-semibold">Batch Tidak Ditemukan</h3>
                                <p className="text-sm text-muted-foreground">
                                    Batch produksi yang Anda cari tidak ditemukan.
                                </p>
                            </div>
                            <Button onClick={() => router.push("/")} variant="outline">
                                Kembali ke Beranda
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => router.back()}
                        >
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <div>
                            <h2 className="text-3xl font-bold tracking-tight">{batch.batchSku}</h2>
                            <p className="text-muted-foreground">{batch.product.name}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                {/* Batch Info Card */}
                <Card>
                    <CardHeader>
                        <CardTitle>Informasi Batch</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm text-muted-foreground">SKU Produk</p>
                                <p className="font-medium">{batch.product.sku}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Target Quantity</p>
                                <p className="font-medium">{batch.targetQuantity} pcs</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Actual Quantity</p>
                                <p className="font-medium">{batch.actualQuantity || 0} pcs</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Reject Quantity</p>
                                <p className="font-medium">{batch.rejectQuantity} pcs</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Dibuat Oleh</p>
                                <p className="font-medium">{batch.createdBy.name}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Tanggal Dibuat</p>
                                <p className="font-medium">{formatDate(batch.createdAt)}</p>
                            </div>
                        </div>
                        {batch.notes && (
                            <div>
                                <p className="text-sm text-muted-foreground mb-1">Catatan</p>
                                <p className="text-sm bg-muted p-3 rounded-md">{batch.notes}</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Action Card based on Role */}
                {renderActionCard()}
            </div>
        </div>
    );
}
