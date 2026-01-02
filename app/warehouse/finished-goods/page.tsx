"use client"

import { useEffect, useState } from "react"
import { Package, XCircle, Loader2, Search, Filter } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"

interface FinishedGood {
    id: string
    type: "FINISHED" | "REJECT"
    quantity: number
    location: string | null
    notes: string | null
    verifiedAt: Date
    batch: {
        batchSku: string
        product: {
            name: string
            sku: string
        }
    }
    subBatch?: {
        id: string
        subBatchSku: string
        assignedSewer: { name: string }
        assignedFinisher?: { name: string }
    }
    verifiedBy: {
        name: string
    }
}

export default function FinishedGoodsPage() {
    const [goods, setGoods] = useState<FinishedGood[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState("")
    const [activeTab, setActiveTab] = useState<"all" | "finished" | "reject">("all")
    const { toast } = useToast()

    const fetchGoods = async (type?: string) => {
        try {
            const url = type ? `/api/finished-goods?type=${type}` : '/api/finished-goods'
            const response = await fetch(url)

            if (response.ok) {
                const data = await response.json()
                setGoods(data)
            }
        } catch (err) {
            toast({
                variant: "destructive",
                title: "Error",
                description: "Gagal memuat data barang: " + err
            })
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (activeTab === "all") {
            fetchGoods()
        } else if (activeTab === "finished") {
            fetchGoods("FINISHED")
        } else {
            fetchGoods("REJECT")
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab])

    const filteredGoods = goods.filter(good => {
        const query = searchQuery.toLowerCase()
        return (
            good.batch.batchSku.toLowerCase().includes(query) ||
            good.batch.product.name.toLowerCase().includes(query) ||
            good.batch.product.sku.toLowerCase().includes(query) ||
            (good.location && good.location.toLowerCase().includes(query)) ||
            (good.subBatch?.subBatchSku && good.subBatch.subBatchSku.toLowerCase().includes(query))
        )
    })

    const stats = {
        totalFinished: goods.filter(g => g.type === "FINISHED").reduce((sum, g) => sum + g.quantity, 0),
        totalReject: goods.filter(g => g.type === "REJECT").reduce((sum, g) => sum + g.quantity, 0),
        totalBatches: new Set(goods.map(g => g.batch.batchSku)).size,
    }

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
                    <h2 className="text-3xl font-bold tracking-tight">Barang Jadi</h2>
                    <p className="text-muted-foreground">
                        Kelola barang jadi dan barang gagal di gudang
                    </p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Total Barang Jadi
                        </CardTitle>
                        <Package className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{stats.totalFinished}</div>
                        <p className="text-xs text-muted-foreground">
                            Pieces siap distribusi
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Total Barang Gagal
                        </CardTitle>
                        <XCircle className="h-4 w-4 text-red-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">{stats.totalReject}</div>
                        <p className="text-xs text-muted-foreground">
                            Pieces reject/gagal
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Total Batch
                        </CardTitle>
                        <Filter className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalBatches}</div>
                        <p className="text-xs text-muted-foreground">
                            Batch tersimpan
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Search */}
            <div className="flex items-center gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Cari batch, produk, SKU, atau lokasi..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8"
                    />
                </div>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)}>
                <TabsList>
                    <TabsTrigger value="all">Semua</TabsTrigger>
                    <TabsTrigger value="finished">
                        <Package className="h-4 w-4 mr-2" />
                        Barang Jadi
                    </TabsTrigger>
                    <TabsTrigger value="reject">
                        <XCircle className="h-4 w-4 mr-2" />
                        Barang Gagal
                    </TabsTrigger>
                </TabsList>

                <TabsContent value={activeTab} className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>
                                {activeTab === "all" && "Semua Barang"}
                                {activeTab === "finished" && "Barang Jadi"}
                                {activeTab === "reject" && "Barang Gagal"}
                            </CardTitle>
                            <CardDescription>
                                {filteredGoods.length} item ditemukan
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {filteredGoods.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    Tidak ada data barang
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Batch / Sub-Batch</TableHead>
                                            <TableHead>Produk</TableHead>
                                            <TableHead>Tipe</TableHead>
                                            <TableHead className="text-right">Quantity</TableHead>
                                            <TableHead>Lokasi</TableHead>
                                            <TableHead>Verifikasi</TableHead>
                                            <TableHead>Catatan</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredGoods.map((good) => (
                                            <TableRow key={good.id}>
                                                <TableCell className="font-mono">
                                                    <div>
                                                        <p className="font-medium">{good.batch.batchSku}</p>
                                                        {good.subBatch && (
                                                            <p className="text-xs text-muted-foreground">
                                                                Sub: {good.subBatch.subBatchSku}
                                                            </p>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div>
                                                        <p className="font-medium">{good.batch.product.name}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            SKU: {good.batch.product.sku}
                                                        </p>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={good.type === "FINISHED" ? "default" : "destructive"}>
                                                        {good.type === "FINISHED" ? (
                                                            <>
                                                                <Package className="h-3 w-3 mr-1" />
                                                                Barang Jadi
                                                            </>
                                                        ) : (
                                                            <>
                                                                <XCircle className="h-3 w-3 mr-1" />
                                                                Reject
                                                            </>
                                                        )}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right font-bold">
                                                    {good.quantity} pcs
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline">{good.location || "-"}</Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <div>
                                                        <p className="text-sm">{good.verifiedBy.name}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {new Date(good.verifiedAt).toLocaleDateString("id-ID", {
                                                                day: "2-digit",
                                                                month: "short",
                                                                year: "numeric",
                                                                hour: "2-digit",
                                                                minute: "2-digit"
                                                            })}
                                                        </p>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="max-w-xs">
                                                    <p className="text-sm truncate">
                                                        {good.notes || "-"}
                                                    </p>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
