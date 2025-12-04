"use client"

import { useEffect, useState } from "react"
import { Package, Search, Plus, Edit, TrendingDown, AlertTriangle, Loader2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Select } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"

interface Material {
    id: string
    code: string
    name: string
    description: string | null
    unit: string
    currentStock: number
    minimumStock: number
    price: number
    isActive: boolean
}

export default function StockManagementPage() {
    const [materials, setMaterials] = useState<Material[]>([])
    const [filteredMaterials, setFilteredMaterials] = useState<Material[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState("")
    const [showStockInDialog, setShowStockInDialog] = useState(false)
    const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null)
    const [submitting, setSubmitting] = useState(false)
    const { toast } = useToast()

    // Stock in form
    const [stockInForm, setStockInForm] = useState({
        materialId: "",
        quantity: "",
        notes: ""
    })

    const fetchMaterials = async () => {
        try {
            const response = await fetch('/api/materials')
            if (response.ok) {
                const result = await response.json()
                const mats = result.data || []
                setMaterials(mats)
                setFilteredMaterials(mats)
            }
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Error",
                description: "Gagal memuat data bahan baku"
            })
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchMaterials()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        if (searchQuery.trim() === "") {
            setFilteredMaterials(materials)
        } else {
            const query = searchQuery.toLowerCase()
            const filtered = materials.filter(m =>
                m.name.toLowerCase().includes(query) ||
                m.code.toLowerCase().includes(query)
            )
            setFilteredMaterials(filtered)
        }
    }, [searchQuery, materials])

    const getStockStatus = (material: Material) => {
        const stock = parseFloat(material.currentStock.toString())
        const min = parseFloat(material.minimumStock.toString())

        if (stock <= min * 0.5) return "critical"
        if (stock <= min) return "low"
        return "good"
    }

    const openStockInDialog = (material?: Material) => {
        if (material) {
            setSelectedMaterial(material)
            setStockInForm({
                materialId: material.id,
                quantity: "",
                notes: ""
            })
        } else {
            setSelectedMaterial(null)
            setStockInForm({
                materialId: "",
                quantity: "",
                notes: ""
            })
        }
        setShowStockInDialog(true)
    }

    const handleStockIn = async () => {
        if (!stockInForm.materialId || !stockInForm.quantity) {
            toast({
                variant: "destructive",
                title: "Error",
                description: "Pilih bahan dan masukkan jumlah"
            })
            return
        }

        setSubmitting(true)
        try {
            const response = await fetch('/api/material-transactions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    materialId: stockInForm.materialId,
                    type: 'IN',
                    quantity: parseFloat(stockInForm.quantity),
                    notes: stockInForm.notes
                })
            })

            if (response.ok) {
                toast({
                    title: "Berhasil",
                    description: "Stok berhasil ditambahkan"
                })
                setShowStockInDialog(false)
                fetchMaterials()
            } else {
                const error = await response.json()
                throw new Error(error.error || 'Failed to add stock')
            }
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Error",
                description: error instanceof Error ? error.message : "Gagal menambah stok"
            })
        } finally {
            setSubmitting(false)
        }
    }

    const lowStockCount = filteredMaterials.filter(m => getStockStatus(m) === "low").length
    const criticalStockCount = filteredMaterials.filter(m => getStockStatus(m) === "critical").length

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
                    <h2 className="text-3xl font-bold tracking-tight">Manajemen Stok</h2>
                    <p className="text-muted-foreground">
                        Kelola stok bahan baku gudang
                    </p>
                </div>
                <Button onClick={() => openStockInDialog()}>
                    <Plus className="h-4 w-4 mr-2" />
                    Input Stok Masuk
                </Button>
            </div>

            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Bahan</CardTitle>
                        <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{materials.length}</div>
                        <p className="text-xs text-muted-foreground">Jenis bahan aktif</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Stok Rendah</CardTitle>
                        <TrendingDown className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-500">
                            {lowStockCount}
                        </div>
                        <p className="text-xs text-muted-foreground">Perlu monitoring</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Stok Kritis</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-500">
                            {criticalStockCount}
                        </div>
                        <p className="text-xs text-muted-foreground">Segera restock</p>
                    </CardContent>
                </Card>
            </div>

            {/* Materials Table */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Daftar Bahan Baku</CardTitle>
                            <CardDescription>Kelola dan monitor stok bahan baku</CardDescription>
                        </div>
                    </div>
                    <div className="relative mt-4">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Cari bahan baku..."
                            className="pl-10"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Kode</TableHead>
                                    <TableHead>Nama Bahan</TableHead>
                                    <TableHead>Stok</TableHead>
                                    <TableHead>Unit</TableHead>
                                    <TableHead>Min. Stok</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Aksi</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredMaterials.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                            {searchQuery ? "Tidak ada bahan yang sesuai pencarian" : "Belum ada data bahan baku"}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredMaterials.map((material) => {
                                        const status = getStockStatus(material)
                                        return (
                                            <TableRow key={material.id}>
                                                <TableCell className="font-mono text-sm">{material.code}</TableCell>
                                                <TableCell className="font-medium">{material.name}</TableCell>
                                                <TableCell className="font-bold">
                                                    {parseFloat(material.currentStock.toString()).toFixed(2)}
                                                </TableCell>
                                                <TableCell>{material.unit}</TableCell>
                                                <TableCell>
                                                    {parseFloat(material.minimumStock.toString()).toFixed(2)}
                                                </TableCell>
                                                <TableCell>
                                                    {status === "good" && <Badge>Aman</Badge>}
                                                    {status === "low" && (
                                                        <Badge variant="secondary">
                                                            <TrendingDown className="h-3 w-3 mr-1" />
                                                            Rendah
                                                        </Badge>
                                                    )}
                                                    {status === "critical" && (
                                                        <Badge variant="destructive">
                                                            <AlertTriangle className="h-3 w-3 mr-1" />
                                                            Kritis
                                                        </Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => openStockInDialog(material)}
                                                    >
                                                        <Plus className="h-4 w-4 mr-1" />
                                                        Tambah
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* Stock In Dialog */}
            <Dialog open={showStockInDialog} onOpenChange={setShowStockInDialog}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Input Stok Masuk</DialogTitle>
                        <DialogDescription>
                            Tambahkan stok bahan baku ke gudang
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="material">Bahan Baku <span className="text-red-500">*</span></Label>
                            <Select
                                id="material"
                                value={stockInForm.materialId}
                                onChange={(e) => {
                                    const value = e.target.value
                                    const mat = materials.find(m => m.id === value)
                                    setStockInForm({ ...stockInForm, materialId: value })
                                    setSelectedMaterial(mat || null)
                                }}
                                disabled={!!selectedMaterial}
                            >
                                <option value="">Pilih bahan baku</option>
                                {materials.map((material) => (
                                    <option key={material.id} value={material.id}>
                                        {material.code} - {material.name}
                                    </option>
                                ))}
                            </Select>
                        </div>

                        {selectedMaterial && (
                            <div className="p-4 border rounded-lg space-y-1 bg-muted/50">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Stok Saat Ini:</span>
                                    <span className="font-bold">
                                        {parseFloat(selectedMaterial.currentStock.toString()).toFixed(2)} {selectedMaterial.unit}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Min. Stok:</span>
                                    <span>
                                        {parseFloat(selectedMaterial.minimumStock.toString()).toFixed(2)} {selectedMaterial.unit}
                                    </span>
                                </div>
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="quantity">
                                Jumlah {selectedMaterial ? `(${selectedMaterial.unit})` : ""} <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="quantity"
                                type="number"
                                step="0.01"
                                min="0"
                                value={stockInForm.quantity}
                                onChange={(e) => setStockInForm({ ...stockInForm, quantity: e.target.value })}
                                placeholder="Masukkan jumlah"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="notes">Catatan</Label>
                            <Textarea
                                id="notes"
                                value={stockInForm.notes}
                                onChange={(e) => setStockInForm({ ...stockInForm, notes: e.target.value })}
                                placeholder="Tambahkan catatan (opsional)"
                                rows={3}
                            />
                        </div>

                        <div className="flex gap-2 justify-end pt-4 border-t">
                            <Button
                                variant="outline"
                                onClick={() => setShowStockInDialog(false)}
                                disabled={submitting}
                            >
                                Batal
                            </Button>
                            <Button
                                onClick={handleStockIn}
                                disabled={submitting || !stockInForm.materialId || !stockInForm.quantity}
                            >
                                {submitting ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Menyimpan...
                                    </>
                                ) : (
                                    <>
                                        <Plus className="h-4 w-4 mr-2" />
                                        Simpan
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
