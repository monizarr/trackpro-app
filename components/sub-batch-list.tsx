"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
    ChevronDown,
    ChevronUp,
    CheckCircle2,
    Clock,
    Package,
    Warehouse,
    AlertTriangle
} from "lucide-react"
import { toast } from "@/lib/toast"
import { cn } from "@/lib/utils"

// Sub-batch item dengan reject detail
interface SubBatchItem {
    id: string
    productSize: string
    color: string
    goodQuantity: number
    rejectKotor: number
    rejectSobek: number
    rejectRusakJahit: number
}

// Sub-batch untuk workflow baru (dibuat di tahap finishing)
interface SubBatch {
    id: string
    subBatchSku: string
    status: string // CREATED | SUBMITTED_TO_WAREHOUSE | WAREHOUSE_VERIFIED | COMPLETED
    finishingGoodOutput: number
    rejectKotor: number
    rejectSobek: number
    rejectRusakJahit: number
    notes?: string
    warehouseVerifiedBy?: { id: string; name: string; username: string }
    items: SubBatchItem[]
    createdAt: string
    verifiedByProdAt?: string
    submittedToWarehouseAt?: string
    warehouseVerifiedAt?: string
}

interface SubBatchListProps {
    role: "FINISHING" | "WAREHOUSE" | "PRODUCTION_HEAD"
    batchId: string
    onRefresh: () => void
    onVerifyFinishing?: (subBatch: SubBatch) => void
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    CREATED: {
        label: "Menunggu Verifikasi Ka. Prod",
        color: "bg-yellow-100 text-yellow-800",
        icon: <Clock className="h-3 w-3" />
    },
    SUBMITTED_TO_WAREHOUSE: {
        label: "Diserahkan ke Gudang",
        color: "bg-purple-100 text-purple-800",
        icon: <Package className="h-3 w-3" />
    },
    WAREHOUSE_VERIFIED: {
        label: "Terverifikasi Gudang",
        color: "bg-green-100 text-green-800",
        icon: <CheckCircle2 className="h-3 w-3" />
    },
    COMPLETED: {
        label: "Selesai",
        color: "bg-gray-100 text-gray-800",
        icon: <CheckCircle2 className="h-3 w-3" />
    },
}

/**
 * Komponen untuk menampilkan daftar Sub-Batch di tahap Finishing
 * 
 * Workflow baru:
 * 1. CREATED - Sub-batch dibuat dari hasil finishing, menunggu verifikasi Ka. Prod
 * 2. SUBMITTED_TO_WAREHOUSE - Ka. Prod menyerahkan ke gudang
 * 3. WAREHOUSE_VERIFIED - Ka. Gudang memverifikasi
 * 4. COMPLETED - Selesai
 */
export function SubBatchList({ batchId, onRefresh, onVerifyFinishing, role }: SubBatchListProps) {
    const [subBatches, setSubBatches] = useState<SubBatch[]>([])
    const [loading, setLoading] = useState(true)
    const [expandedId, setExpandedId] = useState<string | null>(null)
    const [processing, setProcessing] = useState(false)

    const fetchSubBatches = useCallback(async () => {
        try {
            const response = await fetch(`/api/production-batches/${batchId}/sub-batches?source=FINISHING`)
            const result = await response.json()
            if (result.success) {
                setSubBatches(result.data)
            }
        } catch (error) {
            console.error("Error fetching sub-batches:", error)
        } finally {
            setLoading(false)
        }
    }, [batchId])

    useEffect(() => {
        fetchSubBatches()
    }, [fetchSubBatches])

    const handleAction = async (subBatch: SubBatch, action: string) => {
        setProcessing(true)
        try {
            const response = await fetch(`/api/production-batches/${batchId}/sub-batches/${subBatch.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action }),
            })

            const result = await response.json()

            if (result.success) {
                toast.success("Berhasil", result.message)
                fetchSubBatches()
                onRefresh()
            } else {
                toast.error("Error", result.error)
            }
        } catch (error) {
            console.error("Error:", error)
            toast.error("Error", "Terjadi kesalahan")
        } finally {
            setProcessing(false)
        }
    }

    const getTotalReject = (subBatch: SubBatch) => {
        return subBatch.rejectKotor + subBatch.rejectSobek + subBatch.rejectRusakJahit
    }

    const getGrandTotal = (subBatch: SubBatch) => {
        return subBatch.finishingGoodOutput + getTotalReject(subBatch)
    }

    if (loading) {
        return <div className="text-center py-4">Memuat sub-batch...</div>
    }

    if (subBatches.length === 0) {
        return (
            <Card className="border-dashed">
                <CardContent className="py-8 text-center text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Belum ada sub-batch hasil finishing</p>
                    <p className="text-sm">Buat sub-batch untuk mengirim hasil finishing ke gudang</p>
                </CardContent>
            </Card>
        )
    }

    // Calculate summary
    const summary = subBatches.reduce(
        (acc, sb) => ({
            total: acc.total + 1,
            goodOutput: acc.goodOutput + sb.finishingGoodOutput,
            rejectKotor: acc.rejectKotor + sb.rejectKotor,
            rejectSobek: acc.rejectSobek + sb.rejectSobek,
            rejectRusakJahit: acc.rejectRusakJahit + sb.rejectRusakJahit,
            verified: acc.verified + (sb.status === "WAREHOUSE_VERIFIED" || sb.status === "COMPLETED" ? 1 : 0),
        }),
        { total: 0, goodOutput: 0, rejectKotor: 0, rejectSobek: 0, rejectRusakJahit: 0, verified: 0 }
    )

    return (
        <div className="space-y-4">
            {/* Summary Card */}
            <Card className="bg-muted">
                <CardHeader className="py-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                        <Package className="h-5 w-5" />
                        Sub-Batch Hasil Finishing ({summary.verified}/{summary.total} terverifikasi)
                    </CardTitle>
                </CardHeader>
                <CardContent className="py-2">
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-center">
                        <div>
                            <p className="text-2xl font-bold text-green-600">{summary.goodOutput}</p>
                            <p className="text-xs text-muted-foreground">Barang Jadi</p>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-yellow-600">{summary.rejectKotor}</p>
                            <p className="text-xs text-muted-foreground">Kotor</p>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-red-600">{summary.rejectSobek}</p>
                            <p className="text-xs text-muted-foreground">Sobek</p>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-red-600">{summary.rejectRusakJahit}</p>
                            <p className="text-xs text-muted-foreground">Rusak Jahit</p>
                        </div>
                        <div>
                            <p className="text-2xl font-bold">
                                {summary.goodOutput + summary.rejectKotor + summary.rejectSobek + summary.rejectRusakJahit}
                            </p>
                            <p className="text-xs text-muted-foreground">Total</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Sub-batch list */}
            {subBatches.map((subBatch) => {
                const status = statusConfig[subBatch.status] || statusConfig.COMPLETED
                const isExpanded = expandedId === subBatch.id
                const totalReject = getTotalReject(subBatch)

                return (
                    <Card key={subBatch.id} className="overflow-hidden">
                        <CardHeader
                            className="py-3 cursor-pointer hover:bg-muted/50"
                            onClick={() => setExpandedId(isExpanded ? null : subBatch.id)}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                    <div>
                                        <CardTitle className="text-sm">{subBatch.subBatchSku}</CardTitle>
                                        <CardDescription className="text-xs">
                                            Dibuat: {new Date(subBatch.createdAt).toLocaleDateString("id-ID")}
                                            {subBatch.warehouseVerifiedBy && ` • Verifikasi: ${subBatch.warehouseVerifiedBy.name}`}
                                        </CardDescription>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Badge className={cn("text-xs", status.color)}>
                                        {status.icon}
                                        <span className="ml-1">{status.label}</span>
                                    </Badge>
                                    <Badge variant="outline" className="text-green-600">
                                        {subBatch.finishingGoodOutput} good
                                    </Badge>
                                    {totalReject > 0 && (
                                        <Badge variant="outline" className="text-red-600">
                                            <AlertTriangle className="h-3 w-3 mr-1" />
                                            {totalReject} reject
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        </CardHeader>

                        {isExpanded && (
                            <CardContent className="pt-0 space-y-4">
                                {/* Items table */}
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Ukuran</TableHead>
                                            <TableHead>Warna</TableHead>
                                            <TableHead className="text-right text-green-600">Good</TableHead>
                                            <TableHead className="text-right text-yellow-600">Kotor</TableHead>
                                            <TableHead className="text-right text-red-600">Sobek</TableHead>
                                            <TableHead className="text-right text-red-600">Rusak Jahit</TableHead>
                                            <TableHead className="text-right">Total</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {subBatch.items.map((item) => (
                                            <TableRow key={item.id}>
                                                <TableCell>{item.productSize}</TableCell>
                                                <TableCell>{item.color}</TableCell>
                                                <TableCell className="text-right text-green-600">{item.goodQuantity}</TableCell>
                                                <TableCell className="text-right text-yellow-600">{item.rejectKotor || "-"}</TableCell>
                                                <TableCell className="text-right text-red-600">{item.rejectSobek || "-"}</TableCell>
                                                <TableCell className="text-right text-red-600">{item.rejectRusakJahit || "-"}</TableCell>
                                                <TableCell className="text-right font-semibold">
                                                    {item.goodQuantity + (item.rejectKotor || 0) + (item.rejectSobek || 0) + (item.rejectRusakJahit || 0)}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        <TableRow className="font-semibold bg-muted">
                                            <TableCell colSpan={2}>Total</TableCell>
                                            <TableCell className="text-right text-green-600">{subBatch.finishingGoodOutput}</TableCell>
                                            <TableCell className="text-right text-yellow-600">{subBatch.rejectKotor || "-"}</TableCell>
                                            <TableCell className="text-right text-red-600">{subBatch.rejectSobek || "-"}</TableCell>
                                            <TableCell className="text-right text-red-600">{subBatch.rejectRusakJahit || "-"}</TableCell>
                                            <TableCell className="text-right">{getGrandTotal(subBatch)}</TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>

                                {/* Notes */}
                                {subBatch.notes && (
                                    <div className="bg-muted p-3 rounded-md">
                                        <p className="text-sm text-muted-foreground">
                                            <strong>Catatan:</strong> {subBatch.notes}
                                        </p>
                                    </div>
                                )}

                                {/* Actions */}
                                <div className="flex flex-wrap gap-2">
                                    {role !== "FINISHING" && subBatch.status === "CREATED" && (
                                        <>
                                            <Button
                                                size="sm"
                                                onClick={() => onVerifyFinishing?.(subBatch)}
                                                variant="default"
                                            >
                                                <CheckCircle2 className="h-4 w-4 mr-1" />
                                                Verifikasi Hasil
                                            </Button>
                                        </>
                                    )}

                                    {/* {role !== "FINISHING" && subBatch.status === "CREATED" && (
                                        <Button
                                            size="sm"
                                            onClick={() => handleAction(subBatch, "SUBMIT_TO_WAREHOUSE")}
                                            disabled={processing}
                                        >
                                            <Package className="h-4 w-4 mr-1" />
                                            Serahkan ke Gudang
                                        </Button>
                                    )} */}

                                    {role !== "FINISHING" && subBatch.status === "SUBMITTED_TO_WAREHOUSE" && (
                                        <Button
                                            size="sm"
                                            onClick={() => handleAction(subBatch, "VERIFY_WAREHOUSE")}
                                            disabled={processing}
                                        >
                                            <Warehouse className="h-4 w-4 mr-1" />
                                            Verifikasi Gudang
                                        </Button>
                                    )}

                                    {(subBatch.status === "WAREHOUSE_VERIFIED" || subBatch.status === "COMPLETED") && (
                                        <Badge className="bg-green-100 text-green-800">
                                            <CheckCircle2 className="h-3 w-3 mr-1" />
                                            Selesai
                                        </Badge>
                                    )}
                                </div>

                                {/* Reject info */}
                                {totalReject > 0 && (
                                    <div className="bg-amber-50 border border-amber-200 p-3 rounded-md">
                                        <p className="text-sm text-amber-800">
                                            <strong>Penanganan Reject:</strong>
                                        </p>
                                        <ul className="text-sm text-amber-700 mt-1 space-y-1">
                                            {subBatch.rejectKotor > 0 && (
                                                <li>• {subBatch.rejectKotor} pcs kotor → Re-produksi dengan dicuci di gudang</li>
                                            )}
                                            {subBatch.rejectSobek > 0 && (
                                                <li>• {subBatch.rejectSobek} pcs sobek → Simpan di Bad Stock (BS)</li>
                                            )}
                                            {subBatch.rejectRusakJahit > 0 && (
                                                <li>• {subBatch.rejectRusakJahit} pcs rusak jahit → Simpan di Bad Stock (BS)</li>
                                            )}
                                        </ul>
                                    </div>
                                )}
                            </CardContent>
                        )}
                    </Card>
                )
            })}
        </div>
    )
}
