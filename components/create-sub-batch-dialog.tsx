"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Trash2, Users } from "lucide-react"
import { toast } from "@/lib/toast"

interface CuttingResult {
    id: string
    productSize: string
    color: string
    actualPieces: number
    isConfirmed: boolean
}

interface Sewer {
    id: string
    name: string
    username: string
}

interface Assignment {
    sewerId: string
    sewerName: string
    items: {
        productSize: string
        color: string
        pieces: number
        maxPieces: number
    }[]
    notes: string
}

interface CreateSubBatchDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    batchId: string
    batchSku: string
    cuttingResults: CuttingResult[]
    onSuccess: () => void
}

export function CreateSubBatchDialog({
    open,
    onOpenChange,
    batchId,
    batchSku,
    cuttingResults,
    onSuccess,
}: CreateSubBatchDialogProps) {
    const [sewers, setSewers] = useState<Sewer[]>([])
    const [assignments, setAssignments] = useState<Assignment[]>([])
    const [submitting, setSubmitting] = useState(false)

    // Calculate available pieces per size/color
    const getAvailablePieces = () => {
        const available = new Map<string, number>()

        // Sum up confirmed cutting results
        for (const result of cuttingResults) {
            if (result.isConfirmed) {
                const key = `${result.productSize}-${result.color}`
                available.set(key, (available.get(key) || 0) + result.actualPieces)
            }
        }

        // Subtract already assigned pieces
        for (const assignment of assignments) {
            for (const item of assignment.items) {
                const key = `${item.productSize}-${item.color}`
                const current = available.get(key) || 0
                available.set(key, current - item.pieces)
            }
        }

        return available
    }

    // Get unique size/color combinations
    const getSizeColorOptions = () => {
        const options: { productSize: string; color: string; totalPieces: number }[] = []
        const map = new Map<string, number>()

        for (const result of cuttingResults) {
            if (result.isConfirmed) {
                const key = `${result.productSize}-${result.color}`
                map.set(key, (map.get(key) || 0) + result.actualPieces)
            }
        }

        for (const [key, pieces] of map) {
            const [productSize, color] = key.split("-")
            options.push({ productSize, color, totalPieces: pieces })
        }

        return options
    }

    useEffect(() => {
        if (open) {
            fetchSewers()
            setAssignments([])
        }
    }, [open])

    const fetchSewers = async () => {
        try {
            const response = await fetch("/api/users/sewers")
            const result = await response.json()
            if (result.success) {
                setSewers(result.data)
            }
        } catch (error) {
            console.error("Error fetching sewers:", error)
            toast.error("Error", "Gagal memuat daftar penjahit")
        }
    }

    const addAssignment = () => {
        setAssignments([
            ...assignments,
            {
                sewerId: "",
                sewerName: "",
                items: [],
                notes: "",
            },
        ])
    }

    const removeAssignment = (index: number) => {
        setAssignments(assignments.filter((_, i) => i !== index))
    }

    const updateAssignment = (index: number, field: keyof Assignment, value: string) => {
        const updated = [...assignments]
        if (field === "sewerId") {
            const sewer = sewers.find((s) => s.id === value)
            updated[index] = {
                ...updated[index],
                sewerId: value,
                sewerName: sewer?.name || "",
            }
        } else if (field === "notes") {
            updated[index] = { ...updated[index], notes: value }
        }
        setAssignments(updated)
    }

    const addItemToAssignment = (assignmentIndex: number, productSize: string, color: string) => {
        const available = getAvailablePieces()
        const key = `${productSize}-${color}`
        const maxPieces = available.get(key) || 0

        if (maxPieces <= 0) {
            toast.error("Error", "Tidak ada sisa pieces untuk item ini")
            return
        }

        const updated = [...assignments]
        updated[assignmentIndex].items.push({
            productSize,
            color,
            pieces: maxPieces,
            maxPieces,
        })
        setAssignments(updated)
    }

    const updateItemPieces = (assignmentIndex: number, itemIndex: number, pieces: number) => {
        const updated = [...assignments]
        const item = updated[assignmentIndex].items[itemIndex]
        updated[assignmentIndex].items[itemIndex] = {
            ...item,
            pieces: Math.min(Math.max(0, pieces), item.maxPieces),
        }
        setAssignments(updated)
    }

    const removeItemFromAssignment = (assignmentIndex: number, itemIndex: number) => {
        const updated = [...assignments]
        updated[assignmentIndex].items = updated[assignmentIndex].items.filter(
            (_, i) => i !== itemIndex
        )
        setAssignments(updated)
    }

    const validateAssignments = () => {
        if (assignments.length === 0) {
            toast.error("Error", "Tambahkan minimal 1 assignment")
            return false
        }

        for (let i = 0; i < assignments.length; i++) {
            const assignment = assignments[i]
            if (!assignment.sewerId) {
                toast.error("Error", `Assignment ${i + 1}: Pilih penjahit`)
                return false
            }
            if (assignment.items.length === 0) {
                toast.error("Error", `Assignment ${i + 1}: Tambahkan minimal 1 item`)
                return false
            }
            for (const item of assignment.items) {
                if (item.pieces <= 0) {
                    toast.error("Error", `Assignment ${i + 1}: Jumlah pieces harus > 0`)
                    return false
                }
            }
        }

        // Check all pieces are assigned
        const available = getAvailablePieces()
        for (const [key, remaining] of available) {
            if (remaining !== 0) {
                toast.error("Error", `Masih ada ${remaining} pieces tersisa untuk ${key}`)
                return false
            }
        }

        return true
    }

    const handleSubmit = async () => {
        if (!validateAssignments()) return

        setSubmitting(true)
        try {
            const response = await fetch(`/api/production-batches/${batchId}/sub-batches`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    assignments: assignments.map((a) => ({
                        sewerId: a.sewerId,
                        items: a.items.map((item) => ({
                            productSize: item.productSize,
                            color: item.color,
                            pieces: item.pieces,
                        })),
                        notes: a.notes,
                    })),
                }),
            })

            const result = await response.json()

            if (result.success) {
                toast.success("Berhasil", result.message || "Sub-batch berhasil dibuat")
                onOpenChange(false)
                onSuccess()
            } else {
                toast.error("Error", result.error || "Gagal membuat sub-batch")
            }
        } catch (error) {
            console.error("Error creating sub-batches:", error)
            toast.error("Error", "Terjadi kesalahan saat membuat sub-batch")
        } finally {
            setSubmitting(false)
        }
    }

    const sizeColorOptions = getSizeColorOptions()
    const availablePieces = getAvailablePieces()

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Assign ke Penjahit - {batchSku}
                    </DialogTitle>
                    <DialogDescription>
                        Pecah batch menjadi sub-batch dan assign ke masing-masing penjahit
                    </DialogDescription>
                </DialogHeader>

                {/* Summary of cutting results */}
                <Card className="mb-4">
                    <CardHeader className="py-3">
                        <CardTitle className="text-sm">Hasil Potong yang Dikonfirmasi</CardTitle>
                    </CardHeader>
                    <CardContent className="py-2">
                        {sizeColorOptions.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                Tidak ada hasil potong yang dikonfirmasi. Pastikan hasil potongan sudah diverifikasi oleh Kepala Produksi.
                            </p>
                        ) : (
                            <div className="flex flex-wrap gap-2">
                                {sizeColorOptions.map((opt) => {
                                    const key = `${opt.productSize}-${opt.color}`
                                    const remaining = availablePieces.get(key) || 0
                                    return (
                                        <Badge
                                            key={key}
                                            variant={remaining === 0 ? "default" : remaining === opt.totalPieces ? "outline" : "secondary"}
                                        >
                                            {opt.productSize} {opt.color}: {remaining}/{opt.totalPieces}
                                        </Badge>
                                    )
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Assignments */}
                <div className="space-y-4">
                    {assignments.map((assignment, assignmentIndex) => (
                        <Card key={assignmentIndex} className="border-2">
                            <CardHeader className="py-3 flex flex-row items-center justify-between">
                                <CardTitle className="text-sm">
                                    Sub-Batch #{assignmentIndex + 1}
                                    {assignment.sewerName && ` - ${assignment.sewerName}`}
                                </CardTitle>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeAssignment(assignmentIndex)}
                                >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Penjahit</Label>
                                        <Select
                                            value={assignment.sewerId}
                                            onChange={(e) =>
                                                updateAssignment(assignmentIndex, "sewerId", e.target.value)
                                            }
                                        >
                                            <option value="">Pilih Penjahit</option>
                                            {sewers.map((sewer) => (
                                                <option
                                                    key={sewer.id}
                                                    value={sewer.id}
                                                    disabled={assignments.some(
                                                        (a, i) => i !== assignmentIndex && a.sewerId === sewer.id
                                                    )}
                                                >
                                                    {sewer.name} ({sewer.username})
                                                </option>
                                            ))}
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Catatan (Opsional)</Label>
                                        <Textarea
                                            value={assignment.notes}
                                            onChange={(e) =>
                                                updateAssignment(assignmentIndex, "notes", e.target.value)
                                            }
                                            placeholder="Catatan untuk penjahit"
                                            rows={1}
                                        />
                                    </div>
                                </div>

                                {/* Items in this assignment */}
                                <div className="space-y-2">
                                    <Label>Item yang Di-assign</Label>
                                    {assignment.items.length === 0 ? (
                                        <p className="text-sm text-muted-foreground">
                                            Belum ada item. Tambahkan dari daftar di bawah.
                                        </p>
                                    ) : (
                                        <div className="space-y-2">
                                            {assignment.items.map((item, itemIndex) => (
                                                <div
                                                    key={itemIndex}
                                                    className="flex items-center gap-2 p-2 bg-muted rounded"
                                                >
                                                    <Badge variant="outline">
                                                        {item.productSize} {item.color}
                                                    </Badge>
                                                    <Input
                                                        type="number"
                                                        value={item.pieces}
                                                        onChange={(e) =>
                                                            updateItemPieces(
                                                                assignmentIndex,
                                                                itemIndex,
                                                                parseInt(e.target.value) || 0
                                                            )
                                                        }
                                                        className="w-20"
                                                        min={1}
                                                        max={item.maxPieces}
                                                    />
                                                    <span className="text-sm text-muted-foreground">
                                                        / {item.maxPieces} pcs
                                                    </span>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() =>
                                                            removeItemFromAssignment(assignmentIndex, itemIndex)
                                                        }
                                                    >
                                                        <Trash2 className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Add item buttons */}
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {sizeColorOptions.length === 0 ? (
                                            <p className="text-sm text-destructive">
                                                Tidak ada hasil potong yang tersedia untuk di-assign.
                                            </p>
                                        ) : (
                                            <>
                                                {sizeColorOptions.every((opt) => {
                                                    const key = `${opt.productSize}-${opt.color}`
                                                    const remaining = availablePieces.get(key) || 0
                                                    const alreadyAdded = assignment.items.some(
                                                        (item) =>
                                                            item.productSize === opt.productSize && item.color === opt.color
                                                    )
                                                    return remaining <= 0 || alreadyAdded
                                                }) && assignment.items.length === 0 ? (
                                                    <p className="text-sm text-muted-foreground">
                                                        Semua item sudah di-assign ke sub-batch lain.
                                                    </p>
                                                ) : (
                                                    sizeColorOptions.map((opt) => {
                                                        const key = `${opt.productSize}-${opt.color}`
                                                        const remaining = availablePieces.get(key) || 0
                                                        const alreadyAdded = assignment.items.some(
                                                            (item) =>
                                                                item.productSize === opt.productSize && item.color === opt.color
                                                        )

                                                        if (remaining <= 0 || alreadyAdded) return null

                                                        return (
                                                            <Button
                                                                key={key}
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() =>
                                                                    addItemToAssignment(assignmentIndex, opt.productSize, opt.color)
                                                                }
                                                            >
                                                                <Plus className="h-3 w-3 mr-1" />
                                                                {opt.productSize} {opt.color} ({remaining})
                                                            </Button>
                                                        )
                                                    })
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}

                    <Button variant="outline" className="w-full" onClick={addAssignment}>
                        <Plus className="h-4 w-4 mr-2" />
                        Tambah Sub-Batch
                    </Button>
                </div>

                <DialogFooter className="flex-col sm:flex-row gap-2">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Batal
                    </Button>
                    <Button onClick={handleSubmit} disabled={submitting || assignments.length === 0}>
                        {submitting ? "Menyimpan..." : `Buat ${assignments.length} Sub-Batch`}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
