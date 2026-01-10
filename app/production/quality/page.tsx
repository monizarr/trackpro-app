"use client"

import { CheckCircle, XCircle, AlertTriangle } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useEffect, useState } from "react"
import { useToast } from "@/hooks/use-toast"

interface VerificationItem {
    id: string
    type: string
    code: string
    stage: string
    worker: string
    product: string
    qty: number
    time: Date
}

export default function QualityControlPage() {
    const [pendingVerification, setPendingVerification] = useState<VerificationItem[]>([])
    const [approvedItems, setApprovedItems] = useState<VerificationItem[]>([])
    const [rejectedItems, setRejectedItems] = useState<VerificationItem[]>([])
    const [loading, setLoading] = useState(true)
    const [processing, setProcessing] = useState<string | null>(null)
    const { toast } = useToast()

    useEffect(() => {
        fetchPendingVerification()
    }, [])

    const fetchPendingVerification = async () => {
        try {
            const response = await fetch("/api/production/quality?status=pending")
            const result = await response.json()

            if (result.success) {
                setPendingVerification(result.data)
            }
        } catch (error) {
            console.error("Error fetching pending verification:", error)
        } finally {
            setLoading(false)
        }
    }

    const fetchApprovedItems = async () => {
        try {
            const response = await fetch("/api/production/quality?status=approved")
            const result = await response.json()

            if (result.success) {
                setApprovedItems(result.data)
            }
        } catch (error) {
            console.error("Error fetching approved items:", error)
        }
    }

    const fetchRejectedItems = async () => {
        try {
            const response = await fetch("/api/production/quality?status=rejected")
            const result = await response.json()

            if (result.success) {
                setRejectedItems(result.data)
            }
        } catch (error) {
            console.error("Error fetching rejected items:", error)
        }
    }

    const handleApprove = async (id: string, type: string) => {
        setProcessing(id)
        try {
            const response = await fetch("/api/production/quality", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ id, type, action: "approve" }),
            })

            const result = await response.json()

            if (result.success) {
                toast({
                    title: "Berhasil",
                    description: "Item telah disetujui",
                })
                fetchPendingVerification()
            } else {
                toast({
                    title: "Error",
                    description: result.error || "Gagal menyetujui item",
                    variant: "destructive",
                })
            }
        } catch (error) {
            console.error("Error approving item:", error)
            toast({
                title: "Error",
                description: "Terjadi kesalahan saat menyetujui item",
                variant: "destructive",
            })
        } finally {
            setProcessing(null)
        }
    }

    const handleReject = async (id: string, type: string) => {
        setProcessing(id)
        try {
            const response = await fetch("/api/production/quality", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ id, type, action: "reject" }),
            })

            const result = await response.json()

            if (result.success) {
                toast({
                    title: "Berhasil",
                    description: "Item telah ditolak",
                })
                fetchPendingVerification()
            } else {
                toast({
                    title: "Error",
                    description: result.error || "Gagal menolak item",
                    variant: "destructive",
                })
            }
        } catch (error) {
            console.error("Error rejecting item:", error)
            toast({
                title: "Error",
                description: "Terjadi kesalahan saat menolak item",
                variant: "destructive",
            })
        } finally {
            setProcessing(null)
        }
    }

    const getTimeAgo = (date: Date) => {
        const now = new Date()
        const diff = now.getTime() - new Date(date).getTime()
        const minutes = Math.floor(diff / 60000)

        if (minutes < 1) return "baru saja"
        if (minutes < 60) return `${minutes} menit lalu`

        const hours = Math.floor(minutes / 60)
        if (hours < 24) return `${hours} jam lalu`

        const days = Math.floor(hours / 24)
        return `${days} hari lalu`
    }

    // Calculate statistics
    const approvedToday = approvedItems.filter((item) => {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        return new Date(item.time) >= today
    }).length

    const rejectRate = approvedItems.length + rejectedItems.length > 0
        ? ((rejectedItems.length / (approvedItems.length + rejectedItems.length)) * 100).toFixed(1)
        : "0.0"

    if (loading) {
        return (
            <div className="flex-1 space-y-4 p-8 pt-6">
                <div className="text-center">Loading...</div>
            </div>
        )
    }

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Kontrol Kualitas</h2>
                    <p className="text-muted-foreground">
                        Verifikasi hasil produksi dari setiap tahap
                    </p>
                </div>
            </div>

            {/* Summary */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Perlu Verifikasi</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{pendingVerification.length}</div>
                        <p className="text-xs text-muted-foreground">Item menunggu</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Disetujui Hari Ini</CardTitle>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{approvedToday}</div>
                        <p className="text-xs text-muted-foreground">Verifikasi passed</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Reject Rate</CardTitle>
                        <XCircle className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{rejectRate}%</div>
                        <p className="text-xs text-muted-foreground">Total rejection rate</p>
                    </CardContent>
                </Card>
            </div>

            {/* Verification Queue */}
            <Tabs defaultValue="pending" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="pending">Pending Verifikasi ({pendingVerification.length})</TabsTrigger>
                    <TabsTrigger value="approved">Approved</TabsTrigger>
                    <TabsTrigger value="rejected">Rejected</TabsTrigger>
                </TabsList>

                <TabsContent value="pending" className="space-y-4">
                    {pendingVerification.length === 0 ? (
                        <Card>
                            <CardContent className="flex flex-col items-center justify-center py-12">
                                <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
                                <p className="text-muted-foreground">Tidak ada verifikasi pending</p>
                            </CardContent>
                        </Card>
                    ) : (
                        pendingVerification.map((item) => (
                            <Card key={`${item.type}-${item.id}`}>
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <CardTitle className="text-lg font-mono">{item.code}</CardTitle>
                                            <CardDescription>{item.product}</CardDescription>
                                        </div>
                                        <Badge variant="secondary">{item.stage}</Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-3 gap-4 text-sm">
                                        <div>
                                            <p className="text-muted-foreground">Pekerja</p>
                                            <p className="font-medium">{item.worker}</p>
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground">Quantity</p>
                                            <p className="font-medium">{item.qty} pcs</p>
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground">Waktu</p>
                                            <p className="font-medium">{getTimeAgo(item.time)}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            className="flex-1"
                                            onClick={() => handleApprove(item.id, item.type)}
                                            disabled={processing === item.id}
                                        >
                                            <CheckCircle className="h-4 w-4 mr-2" />
                                            {processing === item.id ? "Processing..." : "Setujui"}
                                        </Button>
                                        <Button
                                            variant="destructive"
                                            className="flex-1"
                                            onClick={() => handleReject(item.id, item.type)}
                                            disabled={processing === item.id}
                                        >
                                            <XCircle className="h-4 w-4 mr-2" />
                                            {processing === item.id ? "Processing..." : "Reject"}
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </TabsContent>

                <TabsContent value="approved" onFocus={fetchApprovedItems}>
                    <Card>
                        <CardContent className="py-4">
                            {approvedItems.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12">
                                    <CheckCircle className="h-12 w-12 text-muted-foreground mb-4" />
                                    <p className="text-muted-foreground">Riwayat approved akan ditampilkan di sini</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {approvedItems.map((item) => (
                                        <div key={`${item.type}-${item.id}`} className="flex items-start gap-3 p-3 rounded-lg border">
                                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900">
                                                <CheckCircle className="h-4 w-4 text-green-600" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-mono text-sm font-medium">{item.code}</p>
                                                <p className="text-sm text-muted-foreground">{item.product} • {item.stage}</p>
                                                <p className="text-xs text-muted-foreground">{getTimeAgo(item.time)}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="rejected" onFocus={fetchRejectedItems}>
                    <Card>
                        <CardContent className="py-4">
                            {rejectedItems.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12">
                                    <XCircle className="h-12 w-12 text-muted-foreground mb-4" />
                                    <p className="text-muted-foreground">Riwayat rejected akan ditampilkan di sini</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {rejectedItems.map((item) => (
                                        <div key={`${item.type}-${item.id}`} className="flex items-start gap-3 p-3 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-900">
                                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900">
                                                <XCircle className="h-4 w-4 text-red-600" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-mono text-sm font-medium">{item.code}</p>
                                                <p className="text-sm text-muted-foreground">{item.product} • {item.stage}</p>
                                                <p className="text-xs text-muted-foreground">{getTimeAgo(item.time)}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
