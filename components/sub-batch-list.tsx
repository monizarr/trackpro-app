"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
    ChevronDown,
    ChevronUp,
    CheckCircle2,
    Clock,
    Play,
    UserPlus,
    Package,
    Scissors,
    Shirt
} from "lucide-react"
import { toast } from "@/lib/toast"
import { cn } from "@/lib/utils"

interface SubBatchItem {
    id: string
    productSize: string
    color: string
    piecesAssigned: number
    sewingOutput: number
    finishingOutput: number
}

interface SubBatch {
    id: string
    subBatchSku: string
    status: string
    piecesAssigned: number
    sewingOutput: number
    sewingReject: number
    finishingOutput: number
    finishingReject: number
    assignedSewer: { id: string; name: string; username: string }
    assignedFinisher?: { id: string; name: string; username: string }
    items: SubBatchItem[]
    sewingStartedAt?: string
    sewingCompletedAt?: string
    finishingStartedAt?: string
    finishingCompletedAt?: string
}

interface Finisher {
    id: string
    name: string
    username: string
}

interface SubBatchListProps {
    batchId: string
    onRefresh: () => void
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    ASSIGNED_TO_SEWER: { label: "Menunggu Jahit", color: "bg-yellow-100 text-yellow-800", icon: <Clock className="h-3 w-3" /> },
    IN_SEWING: { label: "Sedang Dijahit", color: "bg-blue-100 text-blue-800", icon: <Play className="h-3 w-3" /> },
    SEWING_COMPLETED: { label: "Jahit Selesai", color: "bg-green-100 text-green-800", icon: <CheckCircle2 className="h-3 w-3" /> },
    ASSIGNED_TO_FINISHING: { label: "Menunggu Finishing", color: "bg-yellow-100 text-yellow-800", icon: <Clock className="h-3 w-3" /> },
    IN_FINISHING: { label: "Sedang Finishing", color: "bg-blue-100 text-blue-800", icon: <Play className="h-3 w-3" /> },
    FINISHING_COMPLETED: { label: "Finishing Selesai", color: "bg-green-100 text-green-800", icon: <CheckCircle2 className="h-3 w-3" /> },
    SUBMITTED_TO_WAREHOUSE: { label: "Diserahkan ke Gudang", color: "bg-purple-100 text-purple-800", icon: <Package className="h-3 w-3" /> },
    WAREHOUSE_VERIFIED: { label: "Terverifikasi Gudang", color: "bg-green-100 text-green-800", icon: <CheckCircle2 className="h-3 w-3" /> },
    COMPLETED: { label: "Selesai", color: "bg-gray-100 text-gray-800", icon: <CheckCircle2 className="h-3 w-3" /> },
}

export function SubBatchList({ batchId, onRefresh }: SubBatchListProps) {
    const [subBatches, setSubBatches] = useState<SubBatch[]>([])
    const [loading, setLoading] = useState(true)
    const [expandedId, setExpandedId] = useState<string | null>(null)

    // Dialog states
    const [showInputDialog, setShowInputDialog] = useState(false)
    const [showAssignFinisherDialog, setShowAssignFinisherDialog] = useState(false)
    const [selectedSubBatch, setSelectedSubBatch] = useState<SubBatch | null>(null)
    const [inputType, setInputType] = useState<"sewing" | "finishing">("sewing")
    const [itemInputs, setItemInputs] = useState<Record<string, number>>({})
    const [rejectCount, setRejectCount] = useState(0)
    const [finishers, setFinishers] = useState<Finisher[]>([])
    const [selectedFinisherId, setSelectedFinisherId] = useState("")
    const [processing, setProcessing] = useState(false)

    const fetchSubBatches = useCallback(async () => {
        try {
            const response = await fetch(`/api/production-batches/${batchId}/sub-batches`)
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

    const fetchFinishers = async () => {
        try {
            const response = await fetch("/api/users/finishers")
            const result = await response.json()
            if (result.success) {
                setFinishers(result.data)
            }
        } catch (error) {
            console.error("Error fetching finishers:", error)
        }
    }

    const handleAction = async (subBatch: SubBatch, action: string, body?: Record<string, unknown>) => {
        setProcessing(true)
        try {
            const response = await fetch(`/api/production-batches/${batchId}/sub-batches/${subBatch.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action, ...body }),
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

    const openInputDialog = (subBatch: SubBatch, type: "sewing" | "finishing") => {
        setSelectedSubBatch(subBatch)
        setInputType(type)

        // Initialize with current values or assigned pieces
        const inputs: Record<string, number> = {}
        for (const item of subBatch.items) {
            if (type === "sewing") {
                inputs[item.id] = item.sewingOutput || item.piecesAssigned
            } else {
                inputs[item.id] = item.finishingOutput || item.sewingOutput
            }
        }
        setItemInputs(inputs)
        setRejectCount(type === "sewing" ? subBatch.sewingReject : subBatch.finishingReject)
        setShowInputDialog(true)
    }

    const handleInputSubmit = async () => {
        if (!selectedSubBatch) return

        const items = selectedSubBatch.items.map((item) => ({
            id: item.id,
            [inputType === "sewing" ? "sewingOutput" : "finishingOutput"]: itemInputs[item.id] || 0,
        }))

        await handleAction(
            selectedSubBatch,
            inputType === "sewing" ? "INPUT_SEWING_RESULT" : "INPUT_FINISHING_RESULT",
            {
                items,
                [inputType === "sewing" ? "sewingReject" : "finishingReject"]: rejectCount,
            }
        )

        setShowInputDialog(false)
        setSelectedSubBatch(null)
    }

    const openAssignFinisherDialog = async (subBatch: SubBatch) => {
        setSelectedSubBatch(subBatch)
        setSelectedFinisherId("")
        await fetchFinishers()
        setShowAssignFinisherDialog(true)
    }

    const handleAssignFinisher = async () => {
        if (!selectedSubBatch || !selectedFinisherId) return

        await handleAction(selectedSubBatch, "ASSIGN_FINISHING", {
            finisherId: selectedFinisherId,
        })

        setShowAssignFinisherDialog(false)
        setSelectedSubBatch(null)
    }

    if (loading) {
        return <div className="text-center py-4">Memuat sub-batch...</div>
    }

    if (subBatches.length === 0) {
        return null
    }

    return (
        <div className="space-y-4">
            <h3 className="font-semibold text-lg flex items-center gap-2">
                <Scissors className="h-5 w-5" />
                Sub-Batch ({subBatches.length})
            </h3>

            {subBatches.map((subBatch) => {
                const status = statusConfig[subBatch.status] || statusConfig.COMPLETED
                const isExpanded = expandedId === subBatch.id

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
                                            Penjahit: {subBatch.assignedSewer.name}
                                            {subBatch.assignedFinisher && ` → Finishing: ${subBatch.assignedFinisher.name}`}
                                        </CardDescription>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Badge className={cn("text-xs", status.color)}>
                                        {status.icon}
                                        <span className="ml-1">{status.label}</span>
                                    </Badge>
                                    <Badge variant="outline">
                                        {subBatch.finishingOutput || subBatch.sewingOutput || subBatch.piecesAssigned} pcs
                                    </Badge>
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
                                            <TableHead className="text-right">Assigned</TableHead>
                                            <TableHead className="text-right">Jahit</TableHead>
                                            <TableHead className="text-right">Finishing</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {subBatch.items.map((item) => (
                                            <TableRow key={item.id}>
                                                <TableCell>{item.productSize}</TableCell>
                                                <TableCell>{item.color}</TableCell>
                                                <TableCell className="text-right">{item.piecesAssigned}</TableCell>
                                                <TableCell className="text-right">{item.sewingOutput || "-"}</TableCell>
                                                <TableCell className="text-right">{item.finishingOutput || "-"}</TableCell>
                                            </TableRow>
                                        ))}
                                        <TableRow className="font-semibold">
                                            <TableCell colSpan={2}>Total</TableCell>
                                            <TableCell className="text-right">{subBatch.piecesAssigned}</TableCell>
                                            <TableCell className="text-right">
                                                {subBatch.sewingOutput || "-"}
                                                {subBatch.sewingReject > 0 && (
                                                    <span className="text-destructive text-xs ml-1">(-{subBatch.sewingReject})</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {subBatch.finishingOutput || "-"}
                                                {subBatch.finishingReject > 0 && (
                                                    <span className="text-destructive text-xs ml-1">(-{subBatch.finishingReject})</span>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>

                                {/* Actions */}
                                <div className="flex flex-wrap gap-2">
                                    {subBatch.status === "ASSIGNED_TO_SEWER" && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => openInputDialog(subBatch, "sewing")}
                                            disabled={processing}
                                        >
                                            <Shirt className="h-4 w-4 mr-1" />
                                            Input Hasil Jahit
                                        </Button>
                                    )}

                                    {subBatch.status === "IN_SEWING" && (
                                        <>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => openInputDialog(subBatch, "sewing")}
                                                disabled={processing}
                                            >
                                                <Shirt className="h-4 w-4 mr-1" />
                                                Update Hasil Jahit
                                            </Button>
                                            <Button
                                                size="sm"
                                                onClick={() => handleAction(subBatch, "CONFIRM_SEWING")}
                                                disabled={processing || subBatch.sewingOutput === 0}
                                            >
                                                <CheckCircle2 className="h-4 w-4 mr-1" />
                                                Konfirmasi Jahit
                                            </Button>
                                        </>
                                    )}

                                    {subBatch.status === "SEWING_COMPLETED" && (
                                        <Button
                                            size="sm"
                                            onClick={() => openAssignFinisherDialog(subBatch)}
                                            disabled={processing}
                                        >
                                            <UserPlus className="h-4 w-4 mr-1" />
                                            Assign ke Finishing
                                        </Button>
                                    )}

                                    {subBatch.status === "ASSIGNED_TO_FINISHING" && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => openInputDialog(subBatch, "finishing")}
                                            disabled={processing}
                                        >
                                            Input Hasil Finishing
                                        </Button>
                                    )}

                                    {subBatch.status === "IN_FINISHING" && (
                                        <>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => openInputDialog(subBatch, "finishing")}
                                                disabled={processing}
                                            >
                                                Update Hasil Finishing
                                            </Button>
                                            <Button
                                                size="sm"
                                                onClick={() => handleAction(subBatch, "CONFIRM_FINISHING")}
                                                disabled={processing || subBatch.finishingOutput === 0}
                                            >
                                                <CheckCircle2 className="h-4 w-4 mr-1" />
                                                Konfirmasi Finishing
                                            </Button>
                                        </>
                                    )}

                                    {subBatch.status === "FINISHING_COMPLETED" && (
                                        <Button
                                            size="sm"
                                            onClick={() => handleAction(subBatch, "SUBMIT_TO_WAREHOUSE")}
                                            disabled={processing}
                                        >
                                            <Package className="h-4 w-4 mr-1" />
                                            Serahkan ke Gudang
                                        </Button>
                                    )}

                                    {subBatch.status === "SUBMITTED_TO_WAREHOUSE" && (
                                        <Button
                                            size="sm"
                                            onClick={() => handleAction(subBatch, "VERIFY_WAREHOUSE")}
                                            disabled={processing}
                                        >
                                            <CheckCircle2 className="h-4 w-4 mr-1" />
                                            Verifikasi Gudang
                                        </Button>
                                    )}
                                </div>
                            </CardContent>
                        )}
                    </Card>
                )
            })}

            {/* Input Dialog */}
            <Dialog open={showInputDialog} onOpenChange={setShowInputDialog}>
                <DialogContent className="max-w-[95vw] sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>
                            Input Hasil {inputType === "sewing" ? "Jahitan" : "Finishing"}
                        </DialogTitle>
                        <DialogDescription>
                            {selectedSubBatch?.subBatchSku}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        {selectedSubBatch?.items.map((item) => (
                            <div key={item.id} className="flex items-center gap-4">
                                <Label className="w-24">
                                    {item.productSize} {item.color}
                                </Label>
                                <Input
                                    type="number"
                                    value={itemInputs[item.id] || 0}
                                    onChange={(e) => setItemInputs({
                                        ...itemInputs,
                                        [item.id]: parseInt(e.target.value) || 0,
                                    })}
                                    className="w-24"
                                    min={0}
                                    max={inputType === "sewing" ? item.piecesAssigned : item.sewingOutput}
                                />
                                <span className="text-sm text-muted-foreground">
                                    / {inputType === "sewing" ? item.piecesAssigned : item.sewingOutput}
                                </span>
                            </div>
                        ))}

                        <div className="flex items-center gap-4 pt-2 border-t">
                            <Label className="w-24">Reject</Label>
                            <Input
                                type="number"
                                value={rejectCount}
                                onChange={(e) => setRejectCount(parseInt(e.target.value) || 0)}
                                className="w-24"
                                min={0}
                            />
                            <span className="text-sm text-muted-foreground">pcs</span>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowInputDialog(false)}>
                            Batal
                        </Button>
                        <Button onClick={handleInputSubmit} disabled={processing}>
                            {processing ? "Menyimpan..." : "Simpan"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Assign Finisher Dialog */}
            <Dialog open={showAssignFinisherDialog} onOpenChange={setShowAssignFinisherDialog}>
                <DialogContent className="max-w-[95vw] sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Assign ke Finishing</DialogTitle>
                        <DialogDescription>
                            {selectedSubBatch?.subBatchSku} - {selectedSubBatch?.sewingOutput} pcs
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Pilih Finisher</Label>
                            <Select
                                value={selectedFinisherId}
                                onChange={(e) => setSelectedFinisherId(e.target.value)}
                            >
                                <option value="">Pilih Finisher</option>
                                {finishers.map((finisher) => (
                                    <option key={finisher.id} value={finisher.id}>
                                        {finisher.name} ({finisher.username})
                                    </option>
                                ))}
                            </Select>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowAssignFinisherDialog(false)}>
                            Batal
                        </Button>
                        <Button onClick={handleAssignFinisher} disabled={processing || !selectedFinisherId}>
                            {processing ? "Menyimpan..." : "Assign"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
