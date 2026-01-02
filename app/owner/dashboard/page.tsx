"use client";

import { Package, Users, AlertTriangle, CheckCircle, Clock, Activity, TrendingUp, Boxes, AlertCircle } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { useEffect, useState } from "react";

interface Product {
    id: string;
    name: string;
    sku: string;
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
    product: Product;
    createdBy: {
        name: string;
    };
}

interface MaterialColorVariant {
    id: string;
    colorName: string;
    stock: number;
    minimumStock: number;
    material: {
        id: string;
        name: string;
        code: string;
    };
}

interface DashboardStats {
    totalProducts: number;
    totalBatches: number;
    activeBatches: number;
    completedBatches: number;
    criticalMaterials: number;
}

export default function DashboardPage() {
    const [stats, setStats] = useState<DashboardStats>({
        totalProducts: 0,
        totalBatches: 0,
        activeBatches: 0,
        completedBatches: 0,
        criticalMaterials: 0,
    });
    const [recentBatches, setRecentBatches] = useState<ProductionBatch[]>([]);
    const [criticalMaterials, setCriticalMaterials] = useState<MaterialColorVariant[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);

            // Fetch all data in parallel
            const [productsRes, batchesRes, materialVariantsRes] = await Promise.all([
                fetch("/api/products"),
                fetch("/api/production-batches"),
                fetch("/api/material-color-variants"),
            ]);

            const productsData = await productsRes.json();
            const batchesData = await batchesRes.json();
            const materialVariantsData = await materialVariantsRes.json();

            if (productsData.success && batchesData.success && materialVariantsData.success) {
                const products = productsData.data || [];
                const batches = batchesData.data || [];
                const materialVariants = materialVariantsData.data || [];

                // Calculate stats
                const activeBatches = batches.filter((b: ProductionBatch) =>
                    !["COMPLETED", "CANCELLED"].includes(b.status)
                );
                const completedBatches = batches.filter((b: ProductionBatch) =>
                    b.status === "COMPLETED"
                );

                // Get critical materials (stock <= 50% of minimum)
                const critical = materialVariants.filter((m: MaterialColorVariant) =>
                    Number(m.stock) <= Number(m.minimumStock) * 0.5
                );

                setStats({
                    totalProducts: products.length,
                    totalBatches: batches.length,
                    activeBatches: activeBatches.length,
                    completedBatches: completedBatches.length,
                    criticalMaterials: critical.length,
                });

                // Get recent batches (last 5)
                setRecentBatches(batches.slice(0, 5));
                setCriticalMaterials(critical.slice(0, 5));
            }
        } catch (error) {
            console.error("Error fetching dashboard data:", error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status: string) => {
        const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
            MATERIAL_REQUESTED: { label: "Material Requested", variant: "secondary" },
            MATERIAL_ALLOCATED: { label: "Material Allocated", variant: "outline" },
            CUTTING: { label: "Cutting", variant: "default" },
            SEWING: { label: "Sewing", variant: "default" },
            FINISHING: { label: "Finishing", variant: "default" },
            CUTTING_COMPLETED: { label: "Cutting Done", variant: "secondary" },
            SEWING_COMPLETED: { label: "Sewing Done", variant: "secondary" },
            FINISHING_COMPLETED: { label: "Finishing Done", variant: "secondary" },
            WAREHOUSE_VERIFIED: { label: "Verified", variant: "outline" },
            COMPLETED: { label: "Completed", variant: "default" },
            CANCELLED: { label: "Cancelled", variant: "destructive" },
        };
        const config = statusConfig[status] || { label: status, variant: "outline" };
        return <Badge variant={config.variant}>{config.label}</Badge>;
    };

    const getProgressPercentage = (batch: ProductionBatch) => {
        if (batch.status === "COMPLETED") return 100;
        if (batch.targetQuantity === 0) return 0;
        return Math.round((batch.actualQuantity / batch.targetQuantity) * 100);
    };

    if (loading) {
        return (
            <div className="flex-1 space-y-4 p-8 pt-6">
                <div className="flex items-center justify-center h-96">
                    <div className="text-center">
                        <Activity className="h-8 w-8 animate-spin mx-auto mb-4" />
                        <p className="text-muted-foreground">Loading dashboard...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 space-y-4 p-4 sm:p-6 md:p-8 pt-4 sm:pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Dashboard</h2>
            </div>

            <Tabs defaultValue="overview" className="space-y-4">
                <TabsList className="w-full sm:w-auto">
                    <TabsTrigger value="overview" className="flex-1 sm:flex-none">Overview</TabsTrigger>
                    <TabsTrigger value="analytics" className="flex-1 sm:flex-none">Analytics</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                    {/* Stats Cards */}
                    <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-5">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Products</CardTitle>
                                <Package className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{stats.totalProducts}</div>
                                <p className="text-xs text-muted-foreground">Active products</p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Active Batches</CardTitle>
                                <Activity className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{stats.activeBatches}</div>
                                <p className="text-xs text-muted-foreground">In production</p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Completed</CardTitle>
                                <CheckCircle className="h-4 w-4 text-green-600" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{stats.completedBatches}</div>
                                <p className="text-xs text-muted-foreground">Total finished</p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Batches</CardTitle>
                                <Boxes className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{stats.totalBatches}</div>
                                <p className="text-xs text-muted-foreground">All time</p>
                            </CardContent>
                        </Card>

                        <Card className={stats.criticalMaterials > 0 ? "border-red-300 bg-red-50" : ""}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Critical Stock</CardTitle>
                                <AlertTriangle className={`h-4 w-4 ${stats.criticalMaterials > 0 ? "text-red-600" : "text-muted-foreground"}`} />
                            </CardHeader>
                            <CardContent>
                                <div className={`text-2xl font-bold ${stats.criticalMaterials > 0 ? "text-red-600" : ""}`}>
                                    {stats.criticalMaterials}
                                </div>
                                <p className="text-xs text-muted-foreground">Materials need restock</p>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                        {/* Recent Production Batches */}
                        <Card className="col-span-4">
                            <CardHeader>
                                <CardTitle>Recent Production Batches</CardTitle>
                                <CardDescription>
                                    {stats.activeBatches > 0
                                        ? `You have ${stats.activeBatches} active production batch${stats.activeBatches > 1 ? 'es' : ''}.`
                                        : "No active production batches."}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {recentBatches.length > 0 ? (
                                    <div className="space-y-6">
                                        {recentBatches.map((batch) => (
                                            <div key={batch.id} className="flex items-center">
                                                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100">
                                                    <Package className="h-4 w-4 text-blue-600" />
                                                </div>
                                                <div className="ml-4 space-y-1 flex-1">
                                                    <p className="text-sm font-medium leading-none font-mono">{batch.batchSku}</p>
                                                    <p className="text-sm text-muted-foreground">{batch.product.name}</p>
                                                </div>
                                                <div className="ml-auto flex items-center gap-3">
                                                    {getStatusBadge(batch.status)}
                                                    <div className="text-right">
                                                        <p className="text-sm font-medium">{getProgressPercentage(batch)}%</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {batch.actualQuantity}/{batch.targetQuantity}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <Package className="h-12 w-12 mx-auto mb-2 opacity-20" />
                                        <p>No production batches yet</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <div className="col-span-3 space-y-4">
                            {/* Critical Materials Alert */}
                            <Card className={stats.criticalMaterials > 0 ? "border-red-300" : ""}>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <AlertTriangle className={`h-4 w-4 ${stats.criticalMaterials > 0 ? "text-red-600" : ""}`} />
                                        Material Alerts
                                    </CardTitle>
                                    <CardDescription>
                                        {stats.criticalMaterials > 0
                                            ? `${stats.criticalMaterials} material${stats.criticalMaterials > 1 ? 's' : ''} need${stats.criticalMaterials === 1 ? 's' : ''} immediate attention`
                                            : "All materials at healthy levels"}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {criticalMaterials.length > 0 ? (
                                        criticalMaterials.map((variant) => (
                                            <div key={variant.id} className="flex items-start space-x-3 rounded-lg border p-3 bg-red-50 border-red-200">
                                                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                                                <div className="space-y-1 flex-1 min-w-0">
                                                    <p className="text-sm font-medium leading-none">
                                                        {variant.material.name} - {variant.colorName}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        Current: <span className="font-medium text-red-600">{Number(variant.stock).toFixed(2)}m</span> /
                                                        Min: {Number(variant.minimumStock).toFixed(2)}m
                                                    </p>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-6 text-muted-foreground">
                                            <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-600" />
                                            <p className="text-sm">All materials are well stocked</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Production Summary */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Production Summary</CardTitle>
                                    <CardDescription>Current production status</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-center">
                                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-100">
                                            <CheckCircle className="h-4 w-4 text-green-600" />
                                        </div>
                                        <div className="ml-4 space-y-1 flex-1">
                                            <p className="text-sm font-medium leading-none">Completed</p>
                                            <p className="text-xs text-muted-foreground">All time batches</p>
                                        </div>
                                        <div className="text-2xl font-bold">{stats.completedBatches}</div>
                                    </div>
                                    <Separator />
                                    <div className="flex items-center">
                                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100">
                                            <Clock className="h-4 w-4 text-blue-600" />
                                        </div>
                                        <div className="ml-4 space-y-1 flex-1">
                                            <p className="text-sm font-medium leading-none">In Progress</p>
                                            <p className="text-xs text-muted-foreground">Active batches</p>
                                        </div>
                                        <div className="text-2xl font-bold">{stats.activeBatches}</div>
                                    </div>
                                    <Separator />
                                    <div className="flex items-center">
                                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-100">
                                            <TrendingUp className="h-4 w-4 text-purple-600" />
                                        </div>
                                        <div className="ml-4 space-y-1 flex-1">
                                            <p className="text-sm font-medium leading-none">Total Products</p>
                                            <p className="text-xs text-muted-foreground">Product catalog</p>
                                        </div>
                                        <div className="text-2xl font-bold">{stats.totalProducts}</div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="analytics" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Analytics</CardTitle>
                            <CardDescription>Detailed production analytics and reports</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="text-center py-12 text-muted-foreground">
                                <Activity className="h-12 w-12 mx-auto mb-4 opacity-20" />
                                <p className="text-lg font-medium mb-2">Analytics Dashboard</p>
                                <p className="text-sm">Detailed analytics and reports coming soon</p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
