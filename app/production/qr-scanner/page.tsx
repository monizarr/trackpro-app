"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { QRCodeScanner } from "@/components/qr-code-scanner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/lib/toast";
import {
    CheckCircle,
    AlertCircle,
    Package,
    Calendar,
    User,
    ArrowRight,
    Loader2
} from "lucide-react";

interface BatchInfo {
    id: string;
    batchSku: string;
    status: string;
    targetQuantity: number;
    actualQuantity: number;
    rejectQuantity: number;
    product: {
        name: string;
        sku: string;
    };
    createdBy: {
        name: string;
    };
    createdAt: string;
}

export default function QRScannerPage() {
    const router = useRouter();
    const [scannedBatch, setScannedBatch] = useState<BatchInfo | null>(null);
    const [loading, setLoading] = useState(false);

    const handleScanSuccess = async (decodedText: string) => {
        try {
            setLoading(true);

            // Parse QR Code data
            const qrData = JSON.parse(decodedText);

            if (qrData.type !== "production-batch") {
                toast.error("Kode QR Tidak Valid", "Bukan kode QR batch produksi");
                return;
            }

            // Fetch batch details
            const response = await fetch(`/api/production-batches/${qrData.id}`);
            const result = await response.json();

            if (result.success) {
                setScannedBatch(result.data);
                toast.success("Kode QR Berhasil Dipindai!", `Batch: ${result.data.batchSku}`);
            } else {
                toast.error("Batch Tidak Ditemukan", result.error || "Silakan coba lagi");
            }
        } catch (err: unknown) {
            console.error("Error processing scan:", err);
            toast.error("Error", "Format kode QR tidak valid atau terjadi kesalahan");
        } finally {
            setLoading(false);
        }
    };

    const handleViewDetails = () => {
        if (scannedBatch) {
            router.push(`/production/batch/${scannedBatch.id}`);
        }
    };

    const handleScanAnother = () => {
        setScannedBatch(null);
    };

    const getStatusBadge = (status: string) => {
        const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info" }> = {
            PENDING: { label: "Menunggu", variant: "secondary" },
            MATERIAL_REQUESTED: { label: "Material Diminta", variant: "info" },
            MATERIAL_ALLOCATED: { label: "Material Dialokasi", variant: "info" },
            CUTTING: { label: "Pemotongan", variant: "warning" },
            SEWING: { label: "Penjahitan", variant: "warning" },
            FINISHING: { label: "Finishing", variant: "warning" },
            CUTTING_COMPLETED: { label: "Potongan Selesai", variant: "success" },
            SEWING_COMPLETED: { label: "Jahitan Selesai", variant: "success" },
            FINISHING_COMPLETED: { label: "Finishing Selesai", variant: "success" },
            WAREHOUSE_VERIFIED: { label: "Terverifikasi", variant: "success" },
            COMPLETED: { label: "Selesai", variant: "success" },
            CANCELLED: { label: "Dibatalkan", variant: "destructive" },
        };
        const config = statusMap[status] || { label: status, variant: "outline" as const };
        return <Badge variant={config.variant}>{config.label}</Badge>;
    };

    return (
        <div className="flex-1 space-y-6 p-8 pt-6">
            {/* Header */}
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Pemindai Kode QR</h2>
                <p className="text-muted-foreground">
                    Pindai kode QR batch produksi untuk verifikasi dan tracking
                </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Scanner Section */}
                <div>
                    <QRCodeScanner
                        onScanSuccess={handleScanSuccess}
                        onScanError={(err) => toast.error("Error Pemindai", err)}
                    />
                </div>

                {/* Results Section */}
                <div>
                    {loading && (
                        <Card>
                            <CardContent className="flex items-center justify-center min-h-[400px]">
                                <div className="text-center">
                                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                                    <p className="text-muted-foreground">Memuat data batch...</p>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {scannedBatch && !loading && (
                        <Card>
                            <CardHeader>
                                <div className="flex items-start justify-between">
                                    <div>
                                        <CardTitle className="flex items-center gap-2">
                                            <CheckCircle className="h-5 w-5 text-green-600" />
                                            Batch Ditemukan
                                        </CardTitle>
                                        <CardDescription className="mt-2">
                                            Kode QR berhasil dipindai dan batch terverifikasi
                                        </CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Batch SKU */}
                                <div>
                                    <p className="text-sm text-muted-foreground">Batch SKU</p>
                                    <p className="text-2xl font-bold font-mono">{scannedBatch.batchSku}</p>
                                </div>

                                <Separator />

                                {/* Batch Info */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Produk</p>
                                        <p className="font-medium">{scannedBatch.product.name}</p>
                                        <p className="text-xs text-muted-foreground">{scannedBatch.product.sku}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Status</p>
                                        <div className="mt-1">
                                            {getStatusBadge(scannedBatch.status)}
                                        </div>
                                    </div>
                                </div>

                                <Separator />

                                {/* Quantities */}
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="text-center p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                                        <Package className="h-5 w-5 mx-auto mb-1 text-blue-600" />
                                        <p className="text-xs text-muted-foreground">Target</p>
                                        <p className="text-lg font-bold">{scannedBatch.targetQuantity}</p>
                                    </div>
                                    <div className="text-center p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                                        <CheckCircle className="h-5 w-5 mx-auto mb-1 text-green-600" />
                                        <p className="text-xs text-muted-foreground">Selesai</p>
                                        <p className="text-lg font-bold text-green-600">{scannedBatch.actualQuantity}</p>
                                    </div>
                                    <div className="text-center p-3 bg-red-50 dark:bg-red-950 rounded-lg">
                                        <AlertCircle className="h-5 w-5 mx-auto mb-1 text-red-600" />
                                        <p className="text-xs text-muted-foreground">Reject</p>
                                        <p className="text-lg font-bold text-red-600">{scannedBatch.rejectQuantity}</p>
                                    </div>
                                </div>

                                <Separator />

                                {/* Additional Info */}
                                <div className="space-y-2 text-sm">
                                    <div className="flex items-center gap-2">
                                        <User className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-muted-foreground">Dibuat oleh:</span>
                                        <span className="font-medium">{scannedBatch.createdBy.name}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Calendar className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-muted-foreground">Tanggal:</span>
                                        <span className="font-medium">
                                            {new Date(scannedBatch.createdAt).toLocaleDateString("id-ID", {
                                                day: "numeric",
                                                month: "long",
                                                year: "numeric"
                                            })}
                                        </span>
                                    </div>
                                </div>

                                <Separator />

                                {/* Actions */}
                                <div className="flex gap-2">
                                    <Button onClick={handleViewDetails} className="flex-1">
                                        <ArrowRight className="h-4 w-4 mr-2" />
                                        Lihat Detail
                                    </Button>
                                    <Button onClick={handleScanAnother} variant="outline" className="flex-1">
                                        Pindai Lagi
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {!scannedBatch && !loading && (
                        <Card>
                            <CardContent className="flex items-center justify-center min-h-[400px]">
                                <div className="text-center space-y-4">
                                    <Package className="h-16 w-16 mx-auto text-muted-foreground opacity-20" />
                                    <div>
                                        <p className="font-medium">Belum Ada Pemindaian</p>
                                        <p className="text-sm text-muted-foreground">
                                            Hasil pemindaian akan muncul di sini
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}
