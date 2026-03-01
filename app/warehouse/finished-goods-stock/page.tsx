"use client"

import { useEffect, useState, useCallback } from "react"
import {
    Package,
    TrendingUp,
    TrendingDown,
    Plus,
    ArrowUpDown,
    Loader2,
    Search,
    Calendar,
    ChevronDown,
    ChevronUp,
    FileText,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select } from "@/components/ui/select"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "@/lib/toast"

interface Product {
    id: string
    sku: string
    name: string
}

interface Transaction {
    id: string
    productId: string
    type: "IN" | "OUT" | "ADJUSTMENT"
    quantity: number
    date: string
    notes: string | null
    reference: string | null
    destination: string | null
    batchId: string | null
    product: { id: string; sku: string; name: string }
    user: { name: string }
    batch: { batchSku: string } | null
}

interface DailySummary {
    date: string
    totalIn: number
    totalOut: number
    totalAdjustment: number
    transactions: Transaction[]
}

interface MonthlySummary {
    month: string
    totalIn: number
    totalOut: number
    totalAdjustment: number
    transactionCount: number
}

interface StockSummary {
    product: { id: string; sku: string; name: string }
    totalIn: number
    totalOut: number
    currentStock: number
}

export default function FinishedGoodStockPage() {
    const [loading, setLoading] = useState(true)
    const [products, setProducts] = useState<Product[]>([])
    const [stockSummary, setStockSummary] = useState<StockSummary[]>([])
    const [dailySummary, setDailySummary] = useState<DailySummary[]>([])
    const [monthlySummary, setMonthlySummary] = useState<MonthlySummary | null>(null)
    const [searchQuery, setSearchQuery] = useState("")
    const [expandedDate, setExpandedDate] = useState<string | null>(null)
    const [showTransactionDialog, setShowTransactionDialog] = useState(false)
    const [submitting, setSubmitting] = useState(false)

    // Filters
    const now = new Date()
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
    const [selectedMonth, setSelectedMonth] = useState(currentMonth)
    const [filterType, setFilterType] = useState<string>("")
    const [filterProduct, setFilterProduct] = useState<string>("")

    // Form
    const [form, setForm] = useState({
        productId: "",
        type: "IN" as "IN" | "OUT" | "ADJUSTMENT",
        quantity: "",
        date: new Date().toISOString().split("T")[0],
        notes: "",
        reference: "",
        destination: "",
    })

    const fetchProducts = useCallback(async () => {
        try {
            const response = await fetch("/api/products")
            if (response.ok) {
                const result = await response.json()
                setProducts(result.data || [])
            }
        } catch {
            // silent
        }
    }, [])

    const fetchStockSummary = useCallback(async () => {
        try {
            const response = await fetch("/api/finished-goods/transactions/summary")
            if (response.ok) {
                const result = await response.json()
                setStockSummary(result.data || [])
            }
        } catch {
            // silent
        }
    }, [])

    const fetchTransactions = useCallback(async () => {
        try {
            setLoading(true)
            const params = new URLSearchParams()
            params.set("month", selectedMonth)
            if (filterType) params.set("type", filterType)
            if (filterProduct) params.set("productId", filterProduct)

            const response = await fetch(`/api/finished-goods/transactions?${params.toString()}`)
            if (response.ok) {
                const result = await response.json()
                if (result.success) {
                    setDailySummary(result.data.dailySummary || [])
                    setMonthlySummary(result.data.monthlySummary || null)
                }
            }
        } catch {
            toast.error("Error", "Gagal memuat data transaksi")
        } finally {
            setLoading(false)
        }
    }, [selectedMonth, filterType, filterProduct])

    useEffect(() => {
        fetchProducts()
        fetchStockSummary()
    }, [fetchProducts, fetchStockSummary])

    useEffect(() => {
        fetchTransactions()
    }, [fetchTransactions])

    const handleSubmit = async () => {
        if (!form.productId || !form.quantity) {
            toast.error("Error", "Produk dan jumlah wajib diisi")
            return
        }

        setSubmitting(true)
        try {
            const response = await fetch("/api/finished-goods/transactions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    productId: form.productId,
                    type: form.type,
                    quantity: parseInt(form.quantity),
                    date: form.date,
                    notes: form.notes || undefined,
                    reference: form.reference || undefined,
                    destination: form.destination || undefined,
                }),
            })

            const result = await response.json()
            if (result.success) {
                toast.success("Berhasil", result.message)
                setShowTransactionDialog(false)
                resetForm()
                fetchTransactions()
                fetchStockSummary()
            } else {
                toast.error("Gagal", result.error)
            }
        } catch {
            toast.error("Error", "Gagal menyimpan transaksi")
        } finally {
            setSubmitting(false)
        }
    }

    const resetForm = () => {
        setForm({
            productId: "",
            type: "IN",
            quantity: "",
            date: new Date().toISOString().split("T")[0],
            notes: "",
            reference: "",
            destination: "",
        })
    }

    const getTypeBadge = (type: string) => {
        switch (type) {
            case "IN":
                return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Masuk</Badge>
            case "OUT":
                return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">Keluar</Badge>
            case "ADJUSTMENT":
                return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">Penyesuaian</Badge>
            default:
                return <Badge variant="outline">{type}</Badge>
        }
    }

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr)
        return date.toLocaleDateString("id-ID", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
        })
    }

    // Generate month options (last 12 months)
    const monthOptions = Array.from({ length: 12 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
        const label = d.toLocaleDateString("id-ID", { month: "long", year: "numeric" })
        return { value, label }
    })

    // Filter daily summary by search
    const filteredDailySummary = dailySummary.map((day) => ({
        ...day,
        transactions: day.transactions.filter((tx) => {
            if (!searchQuery) return true
            const q = searchQuery.toLowerCase()
            return (
                tx.product.name.toLowerCase().includes(q) ||
                tx.product.sku.toLowerCase().includes(q) ||
                (tx.reference && tx.reference.toLowerCase().includes(q)) ||
                (tx.destination && tx.destination.toLowerCase().includes(q)) ||
                (tx.batch?.batchSku && tx.batch.batchSku.toLowerCase().includes(q))
            )
        }),
    })).filter((day) => day.transactions.length > 0)

    // Total stock
    const totalStock = stockSummary.reduce((sum, s) => sum + s.currentStock, 0)

    if (loading && dailySummary.length === 0) {
        return (
            <div className="flex-1 flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        )
    }

    return (
        <div className="flex-1 space-y-4 p-4 sm:p-6 md:p-8 pt-4 sm:pt-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                    <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Stok Barang Jadi</h2>
                    <p className="text-sm sm:text-base text-muted-foreground">
                        Kelola barang masuk & keluar gudang per hari
                    </p>
                </div>
                <Button onClick={() => { resetForm(); setShowTransactionDialog(true) }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Input Transaksi
                </Button>
            </div>

            {/* Monthly Summary Cards */}
            <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Stok Gudang</CardTitle>
                        <Package className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalStock.toLocaleString("id-ID")}</div>
                        <p className="text-xs text-muted-foreground">
                            Pcs total barang jadi
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Masuk Bulan Ini</CardTitle>
                        <TrendingUp className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                            +{(monthlySummary?.totalIn || 0).toLocaleString("id-ID")}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Pcs masuk gudang
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Keluar Bulan Ini</CardTitle>
                        <TrendingDown className="h-4 w-4 text-red-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">
                            -{(monthlySummary?.totalOut || 0).toLocaleString("id-ID")}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Pcs keluar gudang
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Transaksi</CardTitle>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {(monthlySummary?.transactionCount || 0).toLocaleString("id-ID")}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Transaksi bulan ini
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="pt-4 pb-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        {/* Month Filter */}
                        <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Bulan</Label>
                            <Select
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(e.target.value)}
                            >
                                {monthOptions.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </option>
                                ))}
                            </Select>
                        </div>

                        {/* Type Filter */}
                        <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Tipe</Label>
                            <Select
                                value={filterType}
                                onChange={(e) => setFilterType(e.target.value)}
                            >
                                <option value="">Semua Tipe</option>
                                <option value="IN">Barang Masuk</option>
                                <option value="OUT">Barang Keluar</option>
                                <option value="ADJUSTMENT">Penyesuaian</option>
                            </Select>
                        </div>

                        {/* Product Filter */}
                        <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Produk</Label>
                            <Select
                                value={filterProduct}
                                onChange={(e) => setFilterProduct(e.target.value)}
                            >
                                <option value="">Semua Produk</option>
                                {products.map((p) => (
                                    <option key={p.id} value={p.id}>
                                        {p.name} ({p.sku})
                                    </option>
                                ))}
                            </Select>
                        </div>

                        {/* Search */}
                        <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Cari</Label>
                            <div className="relative">
                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="SKU, referensi, tujuan..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-8"
                                />
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Stock Summary per Product */}
            {stockSummary.length > 0 && (
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base">Stok Per Produk</CardTitle>
                        <CardDescription>Ringkasan stok barang jadi di gudang</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Produk</TableHead>
                                        <TableHead>SKU</TableHead>
                                        <TableHead className="text-right text-green-600">Total Masuk</TableHead>
                                        <TableHead className="text-right text-red-600">Total Keluar</TableHead>
                                        <TableHead className="text-right font-bold">Stok Saat Ini</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {stockSummary.map((item) => (
                                        <TableRow key={item.product.id}>
                                            <TableCell className="font-medium">{item.product.name}</TableCell>
                                            <TableCell className="font-mono text-sm">{item.product.sku}</TableCell>
                                            <TableCell className="text-right text-green-600">
                                                +{item.totalIn.toLocaleString("id-ID")}
                                            </TableCell>
                                            <TableCell className="text-right text-red-600">
                                                -{item.totalOut.toLocaleString("id-ID")}
                                            </TableCell>
                                            <TableCell className="text-right font-bold">
                                                {item.currentStock.toLocaleString("id-ID")} pcs
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Daily Transactions */}
            <div className="space-y-3">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Transaksi Harian
                </h3>

                {loading ? (
                    <div className="flex justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                ) : filteredDailySummary.length === 0 ? (
                    <Card>
                        <CardContent className="py-8 text-center text-muted-foreground">
                            <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>Tidak ada transaksi untuk periode ini</p>
                            <p className="text-sm">Ubah filter atau tambahkan transaksi baru</p>
                        </CardContent>
                    </Card>
                ) : (
                    filteredDailySummary.map((day) => {
                        const isExpanded = expandedDate === day.date
                        return (
                            <Card key={day.date} className="overflow-hidden">
                                <CardHeader
                                    className="py-3 cursor-pointer hover:bg-muted/50 transition-colors"
                                    onClick={() => setExpandedDate(isExpanded ? null : day.date)}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            {isExpanded ? (
                                                <ChevronUp className="h-4 w-4 text-muted-foreground" />
                                            ) : (
                                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                            )}
                                            <div>
                                                <CardTitle className="text-sm">
                                                    {formatDate(day.date)}
                                                </CardTitle>
                                                <CardDescription className="text-xs">
                                                    {day.transactions.length} transaksi
                                                </CardDescription>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 text-sm">
                                            {day.totalIn > 0 && (
                                                <span className="flex items-center gap-1 text-green-600 font-medium">
                                                    <TrendingUp className="h-3.5 w-3.5" />
                                                    +{day.totalIn.toLocaleString("id-ID")}
                                                </span>
                                            )}
                                            {day.totalOut > 0 && (
                                                <span className="flex items-center gap-1 text-red-600 font-medium">
                                                    <TrendingDown className="h-3.5 w-3.5" />
                                                    -{day.totalOut.toLocaleString("id-ID")}
                                                </span>
                                            )}
                                            {day.totalAdjustment > 0 && (
                                                <span className="flex items-center gap-1 text-blue-600 font-medium">
                                                    <ArrowUpDown className="h-3.5 w-3.5" />
                                                    {day.totalAdjustment.toLocaleString("id-ID")}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </CardHeader>

                                {isExpanded && (
                                    <CardContent className="pt-0">
                                        <div className="overflow-x-auto">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>Tipe</TableHead>
                                                        <TableHead>Produk</TableHead>
                                                        <TableHead className="text-right">Qty</TableHead>
                                                        <TableHead className="hidden sm:table-cell">Referensi</TableHead>
                                                        <TableHead className="hidden md:table-cell">Catatan</TableHead>
                                                        <TableHead className="hidden lg:table-cell">Oleh</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {day.transactions.map((tx) => (
                                                        <TableRow key={tx.id}>
                                                            <TableCell>{getTypeBadge(tx.type)}</TableCell>
                                                            <TableCell>
                                                                <div>
                                                                    <p className="font-medium text-sm">{tx.product.name}</p>
                                                                    <p className="text-xs text-muted-foreground font-mono">{tx.product.sku}</p>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="text-right font-semibold">
                                                                <span className={
                                                                    tx.type === "IN"
                                                                        ? "text-green-600"
                                                                        : tx.type === "OUT"
                                                                            ? "text-red-600"
                                                                            : "text-blue-600"
                                                                }>
                                                                    {tx.type === "IN" ? "+" : tx.type === "OUT" ? "-" : ""}
                                                                    {tx.quantity.toLocaleString("id-ID")} pcs
                                                                </span>
                                                            </TableCell>
                                                            <TableCell className="hidden sm:table-cell">
                                                                <div className="text-sm">
                                                                    {tx.reference && (
                                                                        <span className="font-mono text-xs">{tx.reference}</span>
                                                                    )}
                                                                    {tx.batch && (
                                                                        <span className="text-muted-foreground text-xs block">
                                                                            Batch: {tx.batch.batchSku}
                                                                        </span>
                                                                    )}
                                                                    {tx.destination && (
                                                                        <span className="text-muted-foreground text-xs block">
                                                                            Tujuan: {tx.destination}
                                                                        </span>
                                                                    )}
                                                                    {!tx.reference && !tx.batch && !tx.destination && (
                                                                        <span className="text-muted-foreground text-xs">-</span>
                                                                    )}
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="hidden md:table-cell text-sm text-muted-foreground max-w-50 truncate">
                                                                {tx.notes || "-"}
                                                            </TableCell>
                                                            <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                                                                {tx.user.name}
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </CardContent>
                                )}
                            </Card>
                        )
                    })
                )}
            </div>

            {/* New Transaction Dialog */}
            <Dialog open={showTransactionDialog} onOpenChange={setShowTransactionDialog}>
                <DialogContent className="max-w-[95vw] sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Input Transaksi Barang Jadi</DialogTitle>
                        <DialogDescription>
                            Catat barang masuk atau keluar gudang
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        {/* Tipe Transaksi */}
                        <div className="space-y-2">
                            <Label>Tipe Transaksi *</Label>
                            <Select
                                value={form.type}
                                onChange={(e) => setForm({ ...form, type: e.target.value as "IN" | "OUT" | "ADJUSTMENT" })}
                            >
                                <option value="IN">Barang Masuk (dari produksi/retur)</option>
                                <option value="OUT">Barang Keluar (distribusi/pengiriman)</option>
                                <option value="ADJUSTMENT">Penyesuaian Stok</option>
                            </Select>
                        </div>

                        {/* Produk */}
                        <div className="space-y-2">
                            <Label>Produk *</Label>
                            <Select
                                value={form.productId}
                                onChange={(e) => setForm({ ...form, productId: e.target.value })}
                            >
                                <option value="">Pilih Produk</option>
                                {products.map((p) => (
                                    <option key={p.id} value={p.id}>
                                        {p.name} ({p.sku})
                                    </option>
                                ))}
                            </Select>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Quantity */}
                            <div className="space-y-2">
                                <Label>Jumlah (pcs) *</Label>
                                <Input
                                    type="number"
                                    min="1"
                                    placeholder="0"
                                    value={form.quantity}
                                    onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                                />
                            </div>

                            {/* Tanggal */}
                            <div className="space-y-2">
                                <Label>Tanggal</Label>
                                <Input
                                    type="date"
                                    value={form.date}
                                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Referensi */}
                        <div className="space-y-2">
                            <Label>No. Referensi</Label>
                            <Input
                                placeholder="PO/DO/Nota number..."
                                value={form.reference}
                                onChange={(e) => setForm({ ...form, reference: e.target.value })}
                            />
                        </div>

                        {/* Destination (for OUT type) */}
                        {form.type === "OUT" && (
                            <div className="space-y-2">
                                <Label>Tujuan Pengiriman</Label>
                                <Input
                                    placeholder="Nama toko / alamat tujuan..."
                                    value={form.destination}
                                    onChange={(e) => setForm({ ...form, destination: e.target.value })}
                                />
                            </div>
                        )}

                        {/* Notes */}
                        <div className="space-y-2">
                            <Label>Catatan</Label>
                            <Textarea
                                placeholder="Catatan tambahan..."
                                value={form.notes}
                                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                                rows={2}
                            />
                        </div>
                    </div>

                    <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setShowTransactionDialog(false)}
                            disabled={submitting}
                        >
                            Batal
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={submitting || !form.productId || !form.quantity}
                        >
                            {submitting ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Menyimpan...
                                </>
                            ) : (
                                <>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Simpan Transaksi
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
