"use client"

import { useEffect, useState } from "react"
import { Package, TrendingDown, TrendingUp, AlertTriangle, Box, CheckCircle } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"

interface PendingVerification {
    count: number
    totalPieces: number
    totalReject: number
}

interface Material {
    id: string
    name: string
    currentStock: number
    minimumStock: number
}

interface Transaction {
    id: string
    type: string
    quantity: number
    createdAt: Date
    material: {
        code: string
        name: string
        unit: string
    }
    batch?: {
        batchSku: string
    }
}

interface SubBatch {
    finishingOutput: number
    sewingReject: number
    finishingReject: number
}

export default function WarehouseDashboard() {
    const [pendingVerification, setPendingVerification] = useState<PendingVerification>({ count: 0, totalPieces: 0, totalReject: 0 })
    const [materials, setMaterials] = useState<Material[]>([])
    const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch pending verification sub-batches (new sub-batch flow)
                const verificationRes = await fetch('/api/sub-batches?status=SUBMITTED_TO_WAREHOUSE')
                if (verificationRes.ok) {
                    const result = await verificationRes.json()
                    const subBatches: SubBatch[] = result.data || []
                    const totalPieces = subBatches.reduce((sum: number, sb: SubBatch) => sum + sb.finishingOutput, 0)
                    const totalReject = subBatches.reduce((sum: number, sb: SubBatch) => sum + sb.sewingReject + sb.finishingReject, 0)
                    setPendingVerification({ count: subBatches.length, totalPieces, totalReject })
                }

                // Fetch materials for stock alerts
                const materialsRes = await fetch('/api/materials')
                if (materialsRes.ok) {
                    const result = await materialsRes.json()
                    setMaterials(result.data || [])
                }

                // Fetch recent transactions
                const transactionsRes = await fetch('/api/material-transactions?limit=5')
                if (transactionsRes.ok) {
                    const result = await transactionsRes.json()
                    setRecentTransactions(result.data || [])
                }
            } catch (error) {
                console.error('Failed to fetch dashboard data:', error)
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [])

    const getCriticalMaterials = () => {
        return materials.filter(m => {
            const stock = m.currentStock
            const min = m.minimumStock
            return stock <= min * 0.5
        })
    }

    const getLowStockMaterials = () => {
        return materials.filter(m => {
            const stock = m.currentStock
            const min = m.minimumStock
            return stock > min * 0.5 && stock <= min
        })
    }

    const getTodayTransactions = () => {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        return recentTransactions.filter(t => new Date(t.createdAt) >= today && t.type === 'IN')
    }

    const criticalMaterials = getCriticalMaterials()
    const lowStockMaterials = getLowStockMaterials()
    const todayStockIn = getTodayTransactions()

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Warehouse Dashboard</h2>
                    <p className="text-muted-foreground">
                        Monitor dan kelola stok bahan baku
                    </p>
                </div>
            </div>

            {/* Pending Verification Alert */}
            {!loading && pendingVerification.count > 0 && (
                <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950 dark:border-yellow-900">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <CheckCircle className="h-8 w-8 text-yellow-600" />
                                <div>
                                    <p className="font-bold text-lg">
                                        {pendingVerification.count} Sub-Batch Menunggu Verifikasi
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        Total {pendingVerification.totalPieces} pieces barang jadi siap disimpan
                                        {pendingVerification.totalReject > 0 && (
                                            <span className="text-red-500"> • {pendingVerification.totalReject} reject</span>
                                        )}
                                    </p>
                                </div>
                            </div>
                            <Link href="/warehouse/verification">
                                <Button size="lg">
                                    Verifikasi Sekarang
                                </Button>
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Total Bahan Baku
                        </CardTitle>
                        <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{materials.length}</div>
                        <p className="text-xs text-muted-foreground">
                            Jenis bahan aktif
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Stok Kritis
                        </CardTitle>
                        <AlertTriangle className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-500">{criticalMaterials.length}</div>
                        <p className="text-xs text-muted-foreground">
                            Perlu segera restock
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Stok Masuk Hari Ini
                        </CardTitle>
                        <TrendingUp className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{todayStockIn.length}</div>
                        <p className="text-xs text-muted-foreground">
                            Transaksi masuk
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Verifikasi Pending
                        </CardTitle>
                        <CheckCircle className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{pendingVerification.count}</div>
                        <p className="text-xs text-muted-foreground">
                            Sub-batch menunggu verifikasi
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                {/* Stock Alerts */}
                <Card className="lg:col-span-4">
                    <CardHeader>
                        <CardTitle>Stock Alerts</CardTitle>
                        <CardDescription>
                            Bahan baku yang perlu perhatian
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <p className="text-center py-8 text-muted-foreground">Memuat...</p>
                        ) : criticalMaterials.length === 0 && lowStockMaterials.length === 0 ? (
                            <p className="text-center py-8 text-muted-foreground">
                                Tidak ada alert stok saat ini
                            </p>
                        ) : (
                            <div className="space-y-4">
                                {criticalMaterials.map((material) => (
                                    <div
                                        key={material.id}
                                        className="flex items-center justify-between p-4 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-900"
                                    >
                                        <div className="flex items-center gap-3">
                                            <AlertTriangle className="h-5 w-5 text-red-500" />
                                            <div>
                                                <p className="font-medium">{material.name}</p>
                                                <p className="text-sm text-muted-foreground">
                                                    Stok: {parseFloat(material.currentStock.toString()).toFixed(2)} | Minimum: {parseFloat(material.minimumStock.toString()).toFixed(2)}
                                                </p>
                                            </div>
                                        </div>
                                        <Badge variant="destructive">Kritis</Badge>
                                    </div>
                                ))}
                                {lowStockMaterials.slice(0, 3 - criticalMaterials.length).map((material) => (
                                    <div
                                        key={material.id}
                                        className="flex items-center justify-between p-4 rounded-lg border border-orange-200 bg-orange-50 dark:bg-orange-950 dark:border-orange-900"
                                    >
                                        <div className="flex items-center gap-3">
                                            <TrendingDown className="h-5 w-5 text-orange-500" />
                                            <div>
                                                <p className="font-medium">{material.name}</p>
                                                <p className="text-sm text-muted-foreground">
                                                    Stok: {parseFloat(material.currentStock.toString()).toFixed(2)} | Minimum: {parseFloat(material.minimumStock.toString()).toFixed(2)}
                                                </p>
                                            </div>
                                        </div>
                                        <Badge variant="secondary">Rendah</Badge>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Recent Activity */}
                <Card className="lg:col-span-3">
                    <CardHeader>
                        <CardTitle>Aktivitas Terkini</CardTitle>
                        <CardDescription>
                            Transaksi stok terbaru
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <p className="text-center py-8 text-muted-foreground">Memuat...</p>
                        ) : recentTransactions.length === 0 ? (
                            <p className="text-center py-8 text-muted-foreground">
                                Belum ada transaksi
                            </p>
                        ) : (
                            <div className="space-y-4">
                                {recentTransactions.map((transaction) => (
                                    <div key={transaction.id} className="flex items-start gap-3">
                                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                                            {transaction.type === 'IN' ? (
                                                <TrendingUp className="h-4 w-4 text-green-500" />
                                            ) : (
                                                <TrendingDown className="h-4 w-4 text-red-500" />
                                            )}
                                        </div>
                                        <div className="flex-1 space-y-1">
                                            <p className="text-sm font-medium">
                                                {transaction.type === 'IN' ? 'Stok Masuk' :
                                                    transaction.type === 'OUT' ? 'Stok Keluar' :
                                                        transaction.type === 'RETURN' ? 'Return' : 'Adjustment'}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {transaction.material.name} • {parseFloat(transaction.quantity.toString()).toFixed(2)} {transaction.material.unit}
                                            </p>
                                            {transaction.batch && (
                                                <p className="text-xs text-muted-foreground">
                                                    Batch: {transaction.batch.batchSku}
                                                </p>
                                            )}
                                            <p className="text-xs text-muted-foreground">
                                                {new Date(transaction.createdAt).toLocaleDateString('id-ID', {
                                                    day: 'numeric',
                                                    month: 'short',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
