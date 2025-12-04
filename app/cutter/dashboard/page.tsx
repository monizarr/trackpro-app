"use client"

import { Scissors, CheckCircle, Clock, Package, AlertCircle } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { useEffect, useState } from "react"

interface Product {
    id: string;
    name: string;
    sku: string;
}

interface ProductionBatch {
    id: string;
    batchSku: string;
    targetQuantity: number;
    actualQuantity: number;
    status: string;
    startDate: string;
    product: Product;
}

interface CuttingTask {
    id: string;
    batchId: string;
    materialReceived: number;
    piecesCompleted: number;
    rejectPieces: number;
    wasteQty: number | null;
    status: string;
    notes: string | null;
    startedAt: string | null;
    completedAt: string | null;
    createdAt: string;
    batch: ProductionBatch;
}

interface DashboardStats {
    activeTasks: number;
    completedToday: number;
    totalCompleted: number;
    avgProgress: number;
}

export default function CutterDashboard() {
    const [tasks, setTasks] = useState<CuttingTask[]>([]);
    const [stats, setStats] = useState<DashboardStats>({
        activeTasks: 0,
        completedToday: 0,
        totalCompleted: 0,
        avgProgress: 0,
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            const response = await fetch("/api/cutting-tasks/me");

            if (response.ok) {
                const data: CuttingTask[] = await response.json();
                setTasks(data);

                // Calculate stats
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                const activeTasks = data.filter(t =>
                    t.status === "IN_PROGRESS" || t.status === "PENDING"
                );

                const completedToday = data.filter(t => {
                    if (!t.completedAt) return false;
                    const completedDate = new Date(t.completedAt);
                    completedDate.setHours(0, 0, 0, 0);
                    return completedDate.getTime() === today.getTime();
                });

                const totalCompleted = data.filter(t => t.status === "COMPLETED");

                // Calculate average progress for active tasks
                let totalProgress = 0;
                activeTasks.forEach(task => {
                    const target = task.batch.targetQuantity;
                    if (target > 0) {
                        totalProgress += (task.piecesCompleted / target) * 100;
                    }
                });
                const avgProgress = activeTasks.length > 0
                    ? Math.round(totalProgress / activeTasks.length)
                    : 0;

                setStats({
                    activeTasks: activeTasks.length,
                    completedToday: completedToday.length,
                    totalCompleted: totalCompleted.length,
                    avgProgress,
                });
            }
        } catch (error) {
            console.error("Error fetching dashboard data:", error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status: string) => {
        const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
            PENDING: { label: "Menunggu", variant: "secondary" },
            IN_PROGRESS: { label: "Dikerjakan", variant: "default" },
            COMPLETED: { label: "Selesai", variant: "outline" },
            VERIFIED: { label: "Terverifikasi", variant: "default" },
        };
        const config = statusConfig[status] || { label: status, variant: "outline" };
        return <Badge variant={config.variant}>{config.label}</Badge>;
    };

    const getProgressPercentage = (task: CuttingTask) => {
        const target = task.batch.targetQuantity;
        if (target === 0) return 0;
        return Math.round((task.piecesCompleted / target) * 100);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("id-ID", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    // Get active tasks for display
    const activeTasks = tasks.filter(t =>
        t.status === "IN_PROGRESS" || t.status === "PENDING"
    );

    if (loading) {
        return (
            <div className="flex-1 space-y-4 p-8 pt-6">
                <div className="flex items-center justify-center h-96">
                    <div className="text-center">
                        <Scissors className="h-8 w-8 animate-pulse mx-auto mb-4" />
                        <p className="text-muted-foreground">Loading dashboard...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Dashboard Pemotong</h2>
                    <p className="text-muted-foreground">
                        Kelola pekerjaan pemotongan Anda
                    </p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Batch Aktif</CardTitle>
                        <Scissors className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.activeTasks}</div>
                        <p className="text-xs text-muted-foreground">Sedang dikerjakan</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Selesai Hari Ini</CardTitle>
                        <CheckCircle className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.completedToday}</div>
                        <p className="text-xs text-muted-foreground">Total: {stats.totalCompleted} batch</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Rata-rata Progress</CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.avgProgress}%</div>
                        <p className="text-xs text-muted-foreground">Batch aktif</p>
                    </CardContent>
                </Card>
            </div>

            {/* Active Batches */}
            <Card>
                <CardHeader>
                    <CardTitle>Batch Aktif</CardTitle>
                    <CardDescription>
                        {activeTasks.length > 0
                            ? `Pekerjaan pemotongan yang sedang berlangsung (${activeTasks.length} batch)`
                            : "Tidak ada batch aktif saat ini"}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {activeTasks.length > 0 ? (
                        activeTasks.map((task) => (
                            <div key={task.id} className="space-y-3 p-4 rounded-lg border bg-card">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-1">
                                        <p className="font-mono text-sm font-medium">{task.batch.batchSku}</p>
                                        <p className="text-sm text-muted-foreground">{task.batch.product.name}</p>
                                    </div>
                                    {getStatusBadge(task.status)}
                                </div>

                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <p className="text-muted-foreground">Material Diterima</p>
                                        <p className="font-medium">{task.materialReceived} unit</p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground">Progress</p>
                                        <p className="font-medium">
                                            {task.piecesCompleted}/{task.batch.targetQuantity} pcs
                                        </p>
                                    </div>
                                </div>

                                {task.rejectPieces > 0 && (
                                    <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-2 rounded">
                                        <AlertCircle className="h-4 w-4" />
                                        <span>Reject: {task.rejectPieces} pcs</span>
                                    </div>
                                )}

                                <div className="space-y-1">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground">Completion</span>
                                        <span className="font-medium">{getProgressPercentage(task)}%</span>
                                    </div>
                                    <Progress value={getProgressPercentage(task)} />
                                </div>

                                {task.startedAt && (
                                    <p className="text-xs text-muted-foreground">
                                        Dimulai: {formatDate(task.startedAt)}
                                    </p>
                                )}

                                {task.notes && (
                                    <div className="text-sm bg-muted p-2 rounded">
                                        <p className="text-muted-foreground text-xs mb-1">Catatan:</p>
                                        <p>{task.notes}</p>
                                    </div>
                                )}
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-12 text-muted-foreground">
                            <Package className="h-12 w-12 mx-auto mb-4 opacity-20" />
                            <p className="text-lg font-medium mb-2">Tidak ada batch aktif</p>
                            <p className="text-sm">Hubungi kepala produksi untuk mendapatkan tugas pemotongan</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
                <CardHeader>
                    <CardTitle>Panduan Kerja</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                    <div className="flex items-start gap-2">
                        <div className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />
                        <p>Ambil material dari gudang sesuai alokasi</p>
                    </div>
                    <div className="flex items-start gap-2">
                        <div className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />
                        <p>Lakukan pemotongan sesuai pola yang ditentukan</p>
                    </div>
                    <div className="flex items-start gap-2">
                        <div className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />
                        <p>Update progress secara berkala</p>
                    </div>
                    <div className="flex items-start gap-2">
                        <div className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />
                        <p>Submit untuk verifikasi setelah selesai</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
