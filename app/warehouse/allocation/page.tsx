"use client"

import { useEffect, useState } from "react"
import { Box, Search, CheckCircle, Clock, AlertCircle, Loader2, Package } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"

interface MaterialAllocation {
    id: string
    requestedQty: number
    allocatedQty: number | null
    status: string
    material: {
        code: string
        name: string
        unit: string
        currentStock: number
    }
}

interface Batch {
    id: string
    batchSku: string
    targetQuantity: number
    status: string
    createdAt: Date
    product: {
        name: string
        sku: string
    }
    materialAllocations: MaterialAllocation[]
    createdBy?: {
        name: string
    }
}

export default function MaterialAllocationPage() {
    const [pendingBatches, setPendingBatches] = useState<Batch[]>([])
    const [allocatedBatches, setAllocatedBatches] = useState<Batch[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null)
    const [showAllocateDialog, setShowAllocateDialog] = useState(false)
    const [allocating, setAllocating] = useState(false)
    const [notes, setNotes] = useState("")
    const [searchQuery, setSearchQuery] = useState("")
    const { toast } = useToast()

    const fetchPendingBatches = async () => {
        try {
            const response = await fetch('/api/production-batches?status=MATERIAL_REQUESTED')
            if (response.ok) {
                const result = await response.json()
                setPendingBatches(result.data || [])
            }
        } catch (error: unknown) {
            void error
            toast({
                variant: "destructive",
                title: "Error",
                description: "Gagal memuat data batch pending"
            })
        }
    }

    const fetchAllocatedBatches = async () => {
        try {
            const response = await fetch('/api/production-batches?status=MATERIAL_ALLOCATED')
            if (response.ok) {
                const result = await response.json()
                setAllocatedBatches(result.data || [])
            }
        } catch (error: unknown) {
            void error
            toast({
                variant: "destructive",
                title: "Error",
                description: "Gagal memuat data batch teralokasi"
            })
        }
    }

    useEffect(() => {
        const loadData = async () => {
            setLoading(true)
            await Promise.all([fetchPendingBatches(), fetchAllocatedBatches()])
            setLoading(false)
        }
        loadData()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const openAllocateDialog = async (batch: Batch) => {
        // Fetch full batch details with material allocations
        try {
            const response = await fetch(`/api/production-batches/${batch.id}/allocate`)
            if (response.ok) {
                const result = await response.json()
                setSelectedBatch(result.data)
                setNotes("")
                setShowAllocateDialog(true)
            }
        } catch (error: unknown) {
            void error
            toast({
                variant: "destructive",
                title: "Error",
                description: "Gagal memuat detail batch"
            })
        }
    }

    const handleAllocate = async () => {
        if (!selectedBatch) return

        setAllocating(true)
        try {
            const response = await fetch(`/api/production-batches/${selectedBatch.id}/allocate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ notes })
            })

            if (response.ok) {
                toast({
                    title: "Berhasil",
                    description: `Material untuk batch ${selectedBatch.batchSku} telah dialokasikan`
                })
                setShowAllocateDialog(false)
                await Promise.all([fetchPendingBatches(), fetchAllocatedBatches()])
            } else {
                const error = await response.json()
                throw new Error(error.error || 'Failed to allocate')
            }
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Error",
                description: error instanceof Error ? error.message : "Gagal mengalokasikan material"
            })
        } finally {
            setAllocating(false)
        }
    }

    const filteredPending = searchQuery
        ? pendingBatches.filter(b =>
            b.batchSku.toLowerCase().includes(searchQuery.toLowerCase()) ||
            b.product.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
        : pendingBatches

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        )
    }

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Alokasi Bahan</h2>
                    <p className="text-muted-foreground">
                        Kelola permintaan dan alokasi bahan untuk batch produksi
                    </p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Permintaan Menunggu</CardTitle>
                        <Clock className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{pendingBatches.length}</div>
                        <p className="text-xs text-muted-foreground">Menunggu alokasi</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Dialokasikan</CardTitle>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{allocatedBatches.length}</div>
                        <p className="text-xs text-muted-foreground">Batch teralokasi</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Pcs</CardTitle>
                        <Box className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {pendingBatches.reduce((sum, b) => sum + b.targetQuantity, 0)}
                        </div>
                        <p className="text-xs text-muted-foreground">Target produksi menunggu</p>
                    </CardContent>
                </Card>
            </div>

            {/* Allocation Tabs */}
            <Tabs defaultValue="pending" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="pending">
                        Permintaan Menunggu ({pendingBatches.length})
                    </TabsTrigger>
                    <TabsTrigger value="allocated">
                        Teralokasi ({allocatedBatches.length})
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="pending" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Permintaan Alokasi Bahan</CardTitle>
                            <CardDescription>Batch produksi yang menunggu alokasi bahan</CardDescription>
                            <div className="relative mt-4">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Cari batch..."
                                    className="pl-10"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </CardHeader>
                        <CardContent>
                            {filteredPending.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-center">
                                    <Package className="h-12 w-12 text-muted-foreground mb-4" />
                                    <p className="text-muted-foreground">
                                        {searchQuery ? "Tidak ada batch yang sesuai pencarian" : "Tidak ada permintaan alokasi menunggu"}
                                    </p>
                                </div>
                            ) : (
                                <div className="rounded-md border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Kode Batch</TableHead>
                                                <TableHead>Produk</TableHead>
                                                <TableHead>Target Qty</TableHead>
                                                <TableHead>Diminta Oleh</TableHead>
                                                <TableHead>Tanggal</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead className="text-right">Aksi</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredPending.map((batch) => (
                                                <TableRow key={batch.id}>
                                                    <TableCell className="font-mono text-sm font-medium">
                                                        {batch.batchSku}
                                                    </TableCell>
                                                    <TableCell>{batch.product.name}</TableCell>
                                                    <TableCell>{batch.targetQuantity} pcs</TableCell>
                                                    <TableCell>{batch.createdBy?.name || "-"}</TableCell>
                                                    <TableCell className="text-sm text-muted-foreground">
                                                        {new Date(batch.createdAt).toLocaleDateString('id-ID', {
                                                            day: 'numeric',
                                                            month: 'short',
                                                            year: 'numeric',
                                                            hour: '2-digit',
                                                            minute: '2-digit'
                                                        })}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="secondary">
                                                            <Clock className="h-3 w-3 mr-1" />
                                                            Menunggu
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Button size="sm" onClick={() => openAllocateDialog(batch)}>
                                                            Alokasikan
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="allocated" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Batch Teralokasi</CardTitle>
                            <CardDescription>Batch yang sudah mendapat alokasi bahan</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {allocatedBatches.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-center">
                                    <Package className="h-12 w-12 text-muted-foreground mb-4" />
                                    <p className="text-muted-foreground">Belum ada batch yang teralokasi</p>
                                </div>
                            ) : (
                                <div className="rounded-md border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Kode Batch</TableHead>
                                                <TableHead>Produk</TableHead>
                                                <TableHead>Target Qty</TableHead>
                                                <TableHead>Tanggal Alokasi</TableHead>
                                                <TableHead>Status</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {allocatedBatches.map((batch) => (
                                                <TableRow key={batch.id}>
                                                    <TableCell className="font-mono text-sm font-medium">
                                                        {batch.batchSku}
                                                    </TableCell>
                                                    <TableCell>{batch.product.name}</TableCell>
                                                    <TableCell>{batch.targetQuantity} pcs</TableCell>
                                                    <TableCell className="text-sm text-muted-foreground">
                                                        {new Date(batch.createdAt).toLocaleDateString('id-ID', {
                                                            day: 'numeric',
                                                            month: 'short',
                                                            year: 'numeric'
                                                        })}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge>
                                                            <CheckCircle className="h-3 w-3 mr-1" />
                                                            Teralokasi
                                                        </Badge>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Allocate Dialog */}
            <Dialog open={showAllocateDialog} onOpenChange={setShowAllocateDialog}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>Alokasikan Bahan</DialogTitle>
                        <DialogDescription>
                            Tinjau dan alokasikan bahan untuk batch produksi
                        </DialogDescription>
                    </DialogHeader>

                    {selectedBatch && (
                        <div className="space-y-4">
                            {/* Batch Info */}
                            <div className="p-4 border rounded-lg space-y-2 bg-muted/50">
                                <div className="flex justify-between">
                                    <span className="text-sm text-muted-foreground">Batch:</span>
                                    <span className="font-mono font-bold">{selectedBatch.batchSku}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-muted-foreground">Produk:</span>
                                    <span className="font-medium">{selectedBatch.product.name}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-muted-foreground">Target:</span>
                                    <span className="font-bold">{selectedBatch.targetQuantity} pcs</span>
                                </div>
                            </div>

                            {/* Material Allocations */}
                            <div className="space-y-2">
                                <Label>Bahan yang Diminta:</Label>
                                <div className="rounded-md border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Bahan</TableHead>
                                                <TableHead>Diminta</TableHead>
                                                <TableHead>Stok</TableHead>
                                                <TableHead>Status</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {selectedBatch.materialAllocations?.map((alloc) => {
                                                const sufficient = parseFloat(alloc.material.currentStock.toString()) >= parseFloat(alloc.requestedQty.toString())
                                                return (
                                                    <TableRow key={alloc.id}>
                                                        <TableCell>
                                                            <div className="font-medium">{alloc.material.name}</div>
                                                            <div className="text-xs text-muted-foreground">{alloc.material.code}</div>
                                                        </TableCell>
                                                        <TableCell>
                                                            {parseFloat(alloc.requestedQty.toString()).toFixed(2)} {alloc.material.unit}
                                                        </TableCell>
                                                        <TableCell>
                                                            {parseFloat(alloc.material.currentStock.toString()).toFixed(2)} {alloc.material.unit}
                                                        </TableCell>
                                                        <TableCell>
                                                            {sufficient ? (
                                                                <Badge variant="outline" className="text-green-600">
                                                                    <CheckCircle className="h-3 w-3 mr-1" />
                                                                    Tersedia
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
                            </div>

                            {/* Notes */}
                            <div className="space-y-2">
                                <Label htmlFor="notes">Catatan</Label>
                                <Textarea
                                    id="notes"
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Tambahkan catatan (opsional)"
                                    rows={3}
                                />
                            </div>

                            {/* Check if any material is insufficient */}
                            {selectedBatch.materialAllocations?.some(alloc =>
                                parseFloat(alloc.material.currentStock.toString()) < parseFloat(alloc.requestedQty.toString())
                            ) && (
                                    <div className="p-4 border border-red-200 bg-red-50 dark:bg-red-950 rounded-lg">
                                        <div className="flex items-start gap-2">
                                            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                                            <div>
                                                <p className="font-medium text-red-600">Stok Tidak Mencukupi</p>
                                                <p className="text-sm text-red-600">
                                                    Beberapa bahan tidak memiliki stok yang cukup untuk dialokasikan.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                            {/* Actions */}
                            <div className="flex gap-2 justify-end pt-4 border-t">
                                <Button
                                    variant="outline"
                                    onClick={() => setShowAllocateDialog(false)}
                                    disabled={allocating}
                                >
                                    Batal
                                </Button>
                                <Button
                                    onClick={handleAllocate}
                                    disabled={
                                        allocating ||
                                        selectedBatch.materialAllocations?.some(alloc =>
                                            parseFloat(alloc.material.currentStock.toString()) < parseFloat(alloc.requestedQty.toString())
                                        )
                                    }
                                >
                                    {allocating ? (
                                        <>
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            Mengalokasikan...
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle className="h-4 w-4 mr-2" />
                                            Alokasikan Bahan
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}
