"use client"

import { useState, useEffect } from "react"
import { Search, Package, Clock, Users, CheckCircle2, XCircle, Eye, ChevronDown, ChevronRight, Calendar, RefreshCw, TrendingUp, Scissors, Sparkles } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "@/lib/toast"
import Link from "next/link"
import { SpinnerCustom } from "@/components/ui/spinner"
import { Separator } from "@/components/ui/separator"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"

// Types
type ProductionStatus =
    | "PENDING"
    | "MATERIAL_REQUESTED"
    | "MATERIAL_ALLOCATED"
    | "ASSIGNED_TO_CUTTER"
    | "IN_CUTTING"
    | "CUTTING_COMPLETED"
    | "CUTTING_VERIFIED"
    | "ASSIGNED_TO_SEWER"
    | "IN_SEWING"
    | "SEWING_COMPLETED"
    | "SEWING_VERIFIED"
    | "IN_FINISHING"
    | "FINISHING_COMPLETED"
    | "WAREHOUSE_VERIFIED"
    | "COMPLETED"
    | "CANCELLED"

interface MaterialColorVariant {
    id: string
    materialId: string
    colorName: string
    stock: number
    material: {
        name: string
        code: string
        unit: string
    }
}

interface MaterialColorAllocation {
    id: string
    materialColorVariantId: string
    rollQuantity: number
    allocatedQty: number
    meterPerRoll: number
    materialColorVariant: MaterialColorVariant
}

interface SizeColorRequest {
    id: string
    productSize: string
    color: string
    requestedPieces: number
}

interface CuttingResult {
    id: string
    productSize: string
    color: string
    actualPieces: number
    isConfirmed: boolean
    confirmedBy?: {
        name: string
        role: string
    }
}

interface SubBatchItem {
    id: string
    productSize: string
    color: string
    pieces: number
}

interface SubBatch {
    id: string
    subBatchSku: string
    productSize: string
    color: string
    assignedPieces: number
    completedPieces: number
    rejectPieces: number
    status: string
    createdAt: string
    assignedTo?: {
        name: string
        role: string
    }
    subBatchItems: SubBatchItem[]
}

interface Batch {
    id: string
    batchSku: string
    status: ProductionStatus
    totalRolls: number
    actualQuantity: number | null
    rejectQuantity: number
    createdAt: string
    product: {
        id: string
        sku: string
        name: string
    }
    createdBy?: {
        name: string
    }
    materialColorAllocations?: MaterialColorAllocation[]
    sizeColorRequests?: SizeColorRequest[]
    cuttingResults?: CuttingResult[]
    subBatches?: SubBatch[]
}

// Status groups for tabs
const STATUS_GROUPS: Record<string, {
    label: string
    statuses: ProductionStatus[]
    icon: typeof Package
    color: string
}> = {
    ALL: {
        label: "Semua",
        statuses: ["PENDING", "MATERIAL_REQUESTED", "MATERIAL_ALLOCATED", "ASSIGNED_TO_CUTTER", "IN_CUTTING", "CUTTING_COMPLETED", "CUTTING_VERIFIED", "ASSIGNED_TO_SEWER", "IN_SEWING", "SEWING_COMPLETED", "SEWING_VERIFIED", "IN_FINISHING", "FINISHING_COMPLETED", "WAREHOUSE_VERIFIED", "COMPLETED"],
        icon: Package,
        color: "text-gray-600"
    },
    PENDING: {
        label: "Menunggu",
        statuses: ["PENDING", "MATERIAL_REQUESTED", "MATERIAL_ALLOCATED"],
        icon: Clock,
        color: "text-yellow-600"
    },
    CUTTING: {
        label: "Pemotongan",
        statuses: ["ASSIGNED_TO_CUTTER", "IN_CUTTING", "CUTTING_COMPLETED", "CUTTING_VERIFIED"],
        icon: Scissors,
        color: "text-blue-600"
    },
    SEWING: {
        label: "Penjahitan",
        statuses: ["ASSIGNED_TO_SEWER", "IN_SEWING", "SEWING_COMPLETED", "SEWING_VERIFIED"],
        icon: Users,
        color: "text-purple-600"
    },
    FINISHING: {
        label: "Finishing",
        statuses: ["IN_FINISHING", "FINISHING_COMPLETED"],
        icon: Sparkles,
        color: "text-orange-600"
    },
    COMPLETED: {
        label: "Selesai",
        statuses: ["WAREHOUSE_VERIFIED", "COMPLETED"],
        icon: CheckCircle2,
        color: "text-green-600"
    }
}

// Month names in Indonesian
const MONTHS = [
    { value: 0, label: "Januari" },
    { value: 1, label: "Februari" },
    { value: 2, label: "Maret" },
    { value: 3, label: "April" },
    { value: 4, label: "Mei" },
    { value: 5, label: "Juni" },
    { value: 6, label: "Juli" },
    { value: 7, label: "Agustus" },
    { value: 8, label: "September" },
    { value: 9, label: "Oktober" },
    { value: 10, label: "November" },
    { value: 11, label: "Desember" },
]

export default function OwnerBatchMonitoring() {
    const [batches, setBatches] = useState<Batch[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")
    const [activeTab, setActiveTab] = useState("ALL")
    const [expandedBatches, setExpandedBatches] = useState<Set<string>>(new Set())
    const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null)
    const [showDetailDialog, setShowDetailDialog] = useState(false)
    const [loadingSubBatches, setLoadingSubBatches] = useState<Set<string>>(new Set())

    // Month filter state
    const currentYear = new Date().getFullYear()
    const currentMonth = new Date().getMonth()
    const [selectedMonth, setSelectedMonth] = useState<number | null>(null) // null means all months

    useEffect(() => {
        fetchBatches()
    }, [])

    const fetchBatches = async () => {
        try {
            setLoading(true)
            const response = await fetch("/api/production-batches")
            const data = await response.json()

            if (data.success) {
                setBatches(data.data)
            } else {
                toast.error("Error", data.error || "Failed to fetch batches")
            }
        } catch (error) {
            console.error("Error fetching batches:", error)
            toast.error("Error", "Failed to fetch production batches")
        } finally {
            setLoading(false)
        }
    }

    const fetchSubBatches = async (batchId: string) => {
        try {
            setLoadingSubBatches(prev => new Set(prev).add(batchId))

            const response = await fetch(`/api/production-batches/${batchId}/sub-batches`)
            const data = await response.json()

            if (data.success) {
                // Update batch with sub-batches
                setBatches(prev => prev.map(batch =>
                    batch.id === batchId
                        ? { ...batch, subBatches: data.data }
                        : batch
                ))
            } else {
                toast.error("Error", data.error || "Failed to fetch sub-batches")
            }
        } catch (error) {
            console.error("Error fetching sub-batches:", error)
            toast.error("Error", "Failed to fetch sub-batches")
        } finally {
            setLoadingSubBatches(prev => {
                const newSet = new Set(prev)
                newSet.delete(batchId)
                return newSet
            })
        }
    }

    const toggleBatchExpand = (batchId: string) => {
        const newExpanded = new Set(expandedBatches)
        if (newExpanded.has(batchId)) {
            newExpanded.delete(batchId)
        } else {
            newExpanded.add(batchId)
            // Fetch sub-batches if not already loaded
            const batch = batches.find(b => b.id === batchId)
            if (batch && !batch.subBatches) {
                fetchSubBatches(batchId)
            }
        }
        setExpandedBatches(newExpanded)
    }

    const getStatusBadge = (status: ProductionStatus) => {
        const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
            PENDING: "secondary",
            MATERIAL_REQUESTED: "secondary",
            MATERIAL_ALLOCATED: "outline",
            ASSIGNED_TO_CUTTER: "outline",
            IN_CUTTING: "default",
            CUTTING_COMPLETED: "default",
            CUTTING_VERIFIED: "default",
            ASSIGNED_TO_SEWER: "outline",
            IN_SEWING: "default",
            SEWING_COMPLETED: "default",
            SEWING_VERIFIED: "default",
            IN_FINISHING: "default",
            FINISHING_COMPLETED: "default",
            WAREHOUSE_VERIFIED: "default",
            COMPLETED: "default",
            CANCELLED: "destructive",
        }

        const labels: Record<ProductionStatus, string> = {
            PENDING: "Pending",
            MATERIAL_REQUESTED: "Material Diminta",
            MATERIAL_ALLOCATED: "Material Dialokasi",
            ASSIGNED_TO_CUTTER: "Di-assign ke Pemotong",
            IN_CUTTING: "Proses Potong",
            CUTTING_COMPLETED: "Potong Selesai",
            CUTTING_VERIFIED: "Potong Terverifikasi",
            ASSIGNED_TO_SEWER: "Di-assign ke Penjahit",
            IN_SEWING: "Proses Jahit",
            SEWING_COMPLETED: "Jahit Selesai",
            SEWING_VERIFIED: "Jahit Terverifikasi",
            IN_FINISHING: "Proses Finishing",
            FINISHING_COMPLETED: "Finishing Selesai",
            WAREHOUSE_VERIFIED: "Terverifikasi Gudang",
            COMPLETED: "Selesai",
            CANCELLED: "Dibatalkan",
        }

        return (
            <Badge variant={variants[status] || "secondary"}>
                {labels[status] || status}
            </Badge>
        )
    }

    const getSubBatchStatusBadge = (status: string) => {
        const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
            PENDING: "secondary",
            ASSIGNED: "outline",
            IN_PROGRESS: "default",
            COMPLETED: "default",
            VERIFIED: "default",
        }

        return (
            <Badge variant={variants[status] || "secondary"} className="text-xs">
                {status}
            </Badge>
        )
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("id-ID", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        })
    }

    const filterBatches = (groupStatuses: ProductionStatus[]) => {
        return batches.filter(batch => {
            const matchesStatus = groupStatuses.includes(batch.status)
            const matchesSearch = search.trim() === "" ||
                batch.batchSku.toLowerCase().includes(search.toLowerCase()) ||
                batch.product.name.toLowerCase().includes(search.toLowerCase()) ||
                batch.product.sku.toLowerCase().includes(search.toLowerCase())

            // Month filter
            let matchesMonth = true
            if (selectedMonth !== null) {
                const batchDate = new Date(batch.createdAt)
                matchesMonth = batchDate.getMonth() === selectedMonth && batchDate.getFullYear() === currentYear
            }

            return matchesStatus && matchesSearch && matchesMonth
        })
    }

    const getGroupStats = (groupStatuses: ProductionStatus[]) => {
        const groupBatches = batches.filter(b => {
            const matchesStatus = groupStatuses.includes(b.status)
            let matchesMonth = true
            if (selectedMonth !== null) {
                const batchDate = new Date(b.createdAt)
                matchesMonth = batchDate.getMonth() === selectedMonth && batchDate.getFullYear() === currentYear
            }
            return matchesStatus && matchesMonth
        })
        return {
            total: groupBatches.length,
            totalRolls: groupBatches.reduce((sum, b) => sum + b.totalRolls, 0),
            totalPieces: groupBatches.reduce((sum, b) => sum + (b.actualQuantity || 0), 0),
            totalReject: groupBatches.reduce((sum, b) => sum + b.rejectQuantity, 0),
        }
    }

    // Get overall stats for the selected month
    const getOverallStats = () => {
        const filteredBatches = batches.filter(b => {
            if (selectedMonth === null) return true
            const batchDate = new Date(b.createdAt)
            return batchDate.getMonth() === selectedMonth && batchDate.getFullYear() === currentYear
        })

        return {
            total: filteredBatches.length,
            pending: filteredBatches.filter(b => STATUS_GROUPS.PENDING.statuses.includes(b.status)).length,
            cutting: filteredBatches.filter(b => STATUS_GROUPS.CUTTING.statuses.includes(b.status)).length,
            sewing: filteredBatches.filter(b => STATUS_GROUPS.SEWING.statuses.includes(b.status)).length,
            finishing: filteredBatches.filter(b => STATUS_GROUPS.FINISHING.statuses.includes(b.status)).length,
            completed: filteredBatches.filter(b => STATUS_GROUPS.COMPLETED.statuses.includes(b.status)).length,
            totalRolls: filteredBatches.reduce((sum, b) => sum + b.totalRolls, 0),
            totalPieces: filteredBatches.reduce((sum, b) => sum + (b.actualQuantity || 0), 0),
            totalReject: filteredBatches.reduce((sum, b) => sum + b.rejectQuantity, 0),
        }
    }

    const handleViewDetail = (batch: Batch) => {
        setSelectedBatch(batch)
        setShowDetailDialog(true)
    }

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center p-8">
                <SpinnerCustom />
            </div>
        )
    }

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Monitoring Batch Produksi</h2>
                    <p className="text-muted-foreground mt-1">
                        Monitor semua batch produksi dan progress secara real-time
                    </p>
                </div>
                <Button onClick={fetchBatches} variant="outline">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                </Button>
            </div>

            {/* Month Filter */}
            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Calendar className="h-5 w-5 text-muted-foreground" />
                            <CardTitle className="text-base">Filter Bulan - {currentYear}</CardTitle>
                        </div>
                        {selectedMonth !== null && (
                            <Button variant="ghost" size="sm" onClick={() => setSelectedMonth(null)}>
                                Reset Filter
                            </Button>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-wrap gap-2">
                        <Button
                            variant={selectedMonth === null ? "default" : "outline"}
                            size="sm"
                            onClick={() => setSelectedMonth(null)}
                        >
                            Semua
                        </Button>
                        {MONTHS.map((month) => (
                            <Button
                                key={month.value}
                                variant={selectedMonth === month.value ? "default" : "outline"}
                                size="sm"
                                onClick={() => setSelectedMonth(month.value)}
                                className={month.value === currentMonth ? "ring-2 ring-primary ring-offset-2" : ""}
                            >
                                {month.label}
                            </Button>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Overview Stats */}
            {(() => {
                const stats = getOverallStats()
                const completionRate = stats.total > 0 ? (stats.completed / stats.total) * 100 : 0

                return (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Batch</CardTitle>
                                <Package className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{stats.total}</div>
                                <p className="text-xs text-muted-foreground">
                                    {selectedMonth !== null ? MONTHS[selectedMonth].label : "Semua bulan"} {currentYear}
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Roll</CardTitle>
                                <Package className="h-4 w-4 text-blue-600" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-blue-600">{stats.totalRolls}</div>
                                <p className="text-xs text-muted-foreground">
                                    Roll bahan digunakan
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Output Produksi</CardTitle>
                                <TrendingUp className="h-4 w-4 text-green-600" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-green-600">{stats.totalPieces}</div>
                                <p className="text-xs text-muted-foreground">
                                    Pieces diproduksi
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Reject</CardTitle>
                                <XCircle className="h-4 w-4 text-destructive" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-destructive">{stats.totalReject}</div>
                                <p className="text-xs text-muted-foreground">
                                    Pieces ditolak
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Tingkat Selesai</CardTitle>
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{completionRate.toFixed(1)}%</div>
                                <Progress value={completionRate} className="h-2 mt-2" />
                            </CardContent>
                        </Card>
                    </div>
                )
            })()}

            {/* Progress Distribution */}
            {(() => {
                const stats = getOverallStats()
                return (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Distribusi Status Batch</CardTitle>
                            <CardDescription>
                                Pembagian batch berdasarkan fase produksi
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
                                    <Clock className="h-6 w-6 mx-auto text-yellow-600 mb-1" />
                                    <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
                                    <p className="text-xs text-muted-foreground">Menunggu</p>
                                </div>
                                <div className="text-center p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                                    <Scissors className="h-6 w-6 mx-auto text-blue-600 mb-1" />
                                    <div className="text-2xl font-bold text-blue-600">{stats.cutting}</div>
                                    <p className="text-xs text-muted-foreground">Pemotongan</p>
                                </div>
                                <div className="text-center p-3 bg-purple-50 dark:bg-purple-950 rounded-lg">
                                    <Users className="h-6 w-6 mx-auto text-purple-600 mb-1" />
                                    <div className="text-2xl font-bold text-purple-600">{stats.sewing}</div>
                                    <p className="text-xs text-muted-foreground">Penjahitan</p>
                                </div>
                                <div className="text-center p-3 bg-orange-50 dark:bg-orange-950 rounded-lg">
                                    <Sparkles className="h-6 w-6 mx-auto text-orange-600 mb-1" />
                                    <div className="text-2xl font-bold text-orange-600">{stats.finishing}</div>
                                    <p className="text-xs text-muted-foreground">Finishing</p>
                                </div>
                                <div className="text-center p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                                    <CheckCircle2 className="h-6 w-6 mx-auto text-green-600 mb-1" />
                                    <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
                                    <p className="text-xs text-muted-foreground">Selesai</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )
            })()}

            {/* Search */}
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Cari batch, produk, atau SKU..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                />
            </div>

            {/* Tabs by Status Group */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <TabsList className="grid w-full grid-cols-6">
                    {Object.entries(STATUS_GROUPS).map(([key, group]) => {
                        const stats = getGroupStats(group.statuses)
                        const Icon = group.icon
                        return (
                            <TabsTrigger key={key} value={key} className="relative text-xs sm:text-sm">
                                <Icon className={`h-4 w-4 mr-1 sm:mr-2 ${group.color}`} />
                                <span className="hidden sm:inline">{group.label}</span>
                                <span className="sm:hidden">{group.label.substring(0, 3)}</span>
                                {stats.total > 0 && (
                                    <Badge variant="secondary" className="ml-1 sm:ml-2 h-5 min-w-5 p-0 px-1 flex items-center justify-center text-xs">
                                        {stats.total}
                                    </Badge>
                                )}
                            </TabsTrigger>
                        )
                    })}
                </TabsList>

                {Object.entries(STATUS_GROUPS).map(([key, group]) => {
                    const filteredBatches = filterBatches(group.statuses)
                    const stats = getGroupStats(group.statuses)

                    return (
                        <TabsContent key={key} value={key} className="space-y-4">
                            {/* Stats Cards */}
                            <div className="grid gap-4 md:grid-cols-4">
                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">Batch</CardTitle>
                                        <Package className="h-4 w-4 text-muted-foreground" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">{stats.total}</div>
                                        <p className="text-xs text-muted-foreground">
                                            batch dalam fase ini
                                        </p>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">Total Roll</CardTitle>
                                        <Package className="h-4 w-4 text-blue-600" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold text-blue-600">{stats.totalRolls}</div>
                                        <p className="text-xs text-muted-foreground">
                                            Roll bahan
                                        </p>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">Output</CardTitle>
                                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold text-green-600">{stats.totalPieces}</div>
                                        <p className="text-xs text-muted-foreground">
                                            Pcs diproduksi
                                        </p>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">Reject</CardTitle>
                                        <XCircle className="h-4 w-4 text-destructive" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold text-destructive">{stats.totalReject}</div>
                                        <p className="text-xs text-muted-foreground">
                                            Pcs ditolak
                                        </p>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Batches Table */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Batch {group.label}</CardTitle>
                                    <CardDescription>
                                        {filteredBatches.length} batch{filteredBatches.length !== 1 ? 'es' : ''} dalam tahap {group.label.toLowerCase()}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {filteredBatches.length === 0 ? (
                                        <div className="text-center py-12 text-muted-foreground">
                                            <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                            <p>Tidak ada batch dalam tahap ini</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {filteredBatches.map((batch) => {
                                                const isExpanded = expandedBatches.has(batch.id)
                                                const isLoadingSubBatches = loadingSubBatches.has(batch.id)

                                                return (
                                                    <div key={batch.id} className="border rounded-lg">
                                                        {/* Batch Header */}
                                                        <div className="p-4 hover:bg-muted/50 transition-colors">
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex items-center gap-3 flex-1">
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        onClick={() => toggleBatchExpand(batch.id)}
                                                                        className="h-8 w-8 p-0"
                                                                    >
                                                                        {isExpanded ? (
                                                                            <ChevronDown className="h-4 w-4" />
                                                                        ) : (
                                                                            <ChevronRight className="h-4 w-4" />
                                                                        )}
                                                                    </Button>

                                                                    <div className="flex-1">
                                                                        <div className="flex items-center gap-2 flex-wrap">
                                                                            <Link
                                                                                href={`/owner/production-batches/${batch.id}`}
                                                                                className="font-mono font-semibold text-primary hover:underline"
                                                                            >
                                                                                {batch.batchSku}
                                                                            </Link>
                                                                            {getStatusBadge(batch.status)}
                                                                        </div>
                                                                        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                                                                            <span>{batch.product.name}</span>
                                                                            <span>•</span>
                                                                            <span>{batch.totalRolls} roll</span>
                                                                            {batch.actualQuantity !== null && batch.actualQuantity > 0 && (
                                                                                <>
                                                                                    <span>•</span>
                                                                                    <span className="text-green-600 font-medium">
                                                                                        {batch.actualQuantity} pcs
                                                                                    </span>
                                                                                </>
                                                                            )}
                                                                            <span>•</span>
                                                                            <span>{formatDate(batch.createdAt)}</span>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => handleViewDetail(batch)}
                                                                >
                                                                    <Eye className="h-4 w-4 mr-2" />
                                                                    Detail
                                                                </Button>
                                                            </div>
                                                        </div>

                                                        {/* Sub-batches (Expanded) */}
                                                        {isExpanded && (
                                                            <div className="border-t bg-muted/30">
                                                                {isLoadingSubBatches ? (
                                                                    <div className="p-8 flex items-center justify-center">
                                                                        <SpinnerCustom />
                                                                    </div>
                                                                ) : batch.subBatches && batch.subBatches.length > 0 ? (
                                                                    <div className="p-4">
                                                                        <h4 className="font-semibold mb-3 flex items-center gap-2">
                                                                            <Package className="h-4 w-4" />
                                                                            Sub-Batches ({batch.subBatches.length})
                                                                        </h4>
                                                                        <div className="space-y-2">
                                                                            {batch.subBatches.map((subBatch) => (
                                                                                <div key={subBatch.id} className="bg-background border rounded-lg p-3">
                                                                                    <div className="flex items-start justify-between gap-4">
                                                                                        <div className="flex-1">
                                                                                            <div className="flex items-center gap-2 flex-wrap mb-2">
                                                                                                <span className="font-mono text-sm font-semibold">
                                                                                                    {subBatch.subBatchSku}
                                                                                                </span>
                                                                                                {getSubBatchStatusBadge(subBatch.status)}
                                                                                                <Badge variant="outline" className="text-xs">
                                                                                                    {subBatch.productSize}
                                                                                                </Badge>
                                                                                                <Badge
                                                                                                    variant="outline"
                                                                                                    className="text-xs"
                                                                                                    style={{
                                                                                                        borderColor: subBatch.color,
                                                                                                        color: subBatch.color
                                                                                                    }}
                                                                                                >
                                                                                                    {subBatch.color}
                                                                                                </Badge>
                                                                                            </div>

                                                                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                                                                                                <div>
                                                                                                    <span className="text-muted-foreground">Assigned:</span>
                                                                                                    <span className="ml-1 font-medium">{subBatch.assignedPieces} pcs</span>
                                                                                                </div>
                                                                                                <div>
                                                                                                    <span className="text-muted-foreground">Completed:</span>
                                                                                                    <span className="ml-1 font-medium text-green-600">
                                                                                                        {subBatch.completedPieces} pcs
                                                                                                    </span>
                                                                                                </div>
                                                                                                <div>
                                                                                                    <span className="text-muted-foreground">Reject:</span>
                                                                                                    <span className="ml-1 font-medium text-red-600">
                                                                                                        {subBatch.rejectPieces} pcs
                                                                                                    </span>
                                                                                                </div>
                                                                                                {subBatch.assignedTo && (
                                                                                                    <div>
                                                                                                        <span className="text-muted-foreground">Worker:</span>
                                                                                                        <span className="ml-1 font-medium">{subBatch.assignedTo.name}</span>
                                                                                                    </div>
                                                                                                )}
                                                                                            </div>

                                                                                            {/* Sub-batch Items */}
                                                                                            {subBatch.subBatchItems && subBatch.subBatchItems.length > 0 && (
                                                                                                <div className="mt-2 pt-2 border-t">
                                                                                                    <div className="text-xs text-muted-foreground mb-1">Items:</div>
                                                                                                    <div className="flex flex-wrap gap-1">
                                                                                                        {subBatch.subBatchItems.map((item, idx) => (
                                                                                                            <Badge key={idx} variant="secondary" className="text-xs">
                                                                                                                {item.productSize} - {item.color}: {item.pieces} pcs
                                                                                                            </Badge>
                                                                                                        ))}
                                                                                                    </div>
                                                                                                </div>
                                                                                            )}
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <div className="p-8 text-center text-sm text-muted-foreground">
                                                                        Belum ada sub-batch untuk batch ini
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>
                    )
                })}
            </Tabs>

            {/* Detail Dialog */}
            <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Batch Detail - {selectedBatch?.batchSku}</DialogTitle>
                        <DialogDescription>
                            Informasi lengkap batch produksi dan material
                        </DialogDescription>
                    </DialogHeader>

                    {selectedBatch && (
                        <div className="space-y-6">
                            {/* Basic Info */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-muted-foreground">Product</Label>
                                    <p className="font-medium">{selectedBatch.product.name}</p>
                                    <p className="text-sm text-muted-foreground">{selectedBatch.product.sku}</p>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground">Status</Label>
                                    <div className="mt-1">{getStatusBadge(selectedBatch.status)}</div>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground">Total Rolls</Label>
                                    <p className="font-medium">{selectedBatch.totalRolls} roll</p>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground">Production</Label>
                                    <p className="font-medium text-green-600">
                                        {selectedBatch.actualQuantity || 0} pcs
                                    </p>
                                    {selectedBatch.rejectQuantity > 0 && (
                                        <p className="text-sm text-red-600">
                                            Reject: {selectedBatch.rejectQuantity} pcs
                                        </p>
                                    )}
                                </div>
                            </div>

                            <Separator />

                            {/* Material Allocations */}
                            {selectedBatch.materialColorAllocations && selectedBatch.materialColorAllocations.length > 0 && (
                                <div>
                                    <h4 className="font-semibold mb-3">Material yang Digunakan</h4>
                                    <div className="space-y-2">
                                        {selectedBatch.materialColorAllocations.map((alloc) => (
                                            <div key={alloc.id} className="border rounded-lg p-3 bg-muted/30">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <p className="font-medium">{alloc.materialColorVariant.material.name}</p>
                                                        <p className="text-sm text-muted-foreground">
                                                            {alloc.materialColorVariant.colorName}
                                                        </p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="font-medium">{alloc.rollQuantity} roll</p>
                                                        <p className="text-sm text-muted-foreground">
                                                            {alloc.allocatedQty} {alloc.materialColorVariant.material.unit}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Size Color Requests */}
                            {selectedBatch.sizeColorRequests && selectedBatch.sizeColorRequests.length > 0 && (
                                <div>
                                    <h4 className="font-semibold mb-3">Request Ukuran & Warna</h4>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                        {selectedBatch.sizeColorRequests.map((req) => (
                                            <div key={req.id} className="border rounded-lg p-2 text-sm">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <Badge variant="outline" className="text-xs mb-1">
                                                            {req.productSize}
                                                        </Badge>
                                                        <p className="text-xs text-muted-foreground">{req.color}</p>
                                                    </div>
                                                    <span className="font-medium">{req.requestedPieces} pcs</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Cutting Results */}
                            {selectedBatch.cuttingResults && selectedBatch.cuttingResults.length > 0 && (
                                <div>
                                    <h4 className="font-semibold mb-3">Hasil Pemotongan</h4>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                        {selectedBatch.cuttingResults.map((result) => (
                                            <div key={result.id} className="border rounded-lg p-2 text-sm">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <Badge variant="outline" className="text-xs mb-1">
                                                            {result.productSize}
                                                        </Badge>
                                                        <p className="text-xs text-muted-foreground">{result.color}</p>
                                                        {result.isConfirmed && result.confirmedBy && (
                                                            <p className="text-xs text-green-600 mt-1">
                                                                ✓ Verified
                                                            </p>
                                                        )}
                                                    </div>
                                                    <span className="font-medium text-green-600">
                                                        {result.actualPieces} pcs
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}
