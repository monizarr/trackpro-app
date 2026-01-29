"use client"

import { useEffect, useState } from "react"
import { CheckCircle, Loader2, AlertCircle } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface SubBatchItem {
    id: string
    productSize: string
    color: string
    goodQuantity: number
    rejectKotor: number
    rejectSobek: number
    rejectRusakJahit: number
}

interface SubBatch {
    id: string
    subBatchSku: string
    batchId: string
    finishingGoodOutput: number
    rejectKotor: number
    rejectSobek: number
    rejectRusakJahit: number
    status: string
    notes: string | null
    createdAt: string
    items: SubBatchItem[]
    batch: {
        batchSku: string
        targetQuantity: number
        product: {
            name: string
        }
    }
}

export default function FinishingProcessPage() {
    const [subBatches, setSubBatches] = useState<SubBatch[]>([])
    const [selectedSubBatch, setSelectedSubBatch] = useState<SubBatch | null>(null)
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [activeTab, setActiveTab] = useState("CREATED")
    const [selectedMonth, setSelectedMonth] = useState(() => {
        const now = new Date()
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    })
    const { toast } = useToast()

    // Form state untuk input hasil finishing per sub-batch
    const [finishingResults, setFinishingResults] = useState<Array<{
        itemId: string
        productSize: string
        color: string
        goodQuantity: number
        rejectKotor: number
        rejectSobek: number
        rejectRusakJahit: number
    }>>([])
    const [notes, setNotes] = useState("")
    const [qualityChecks, setQualityChecks] = useState<Record<string, boolean>>({})

    const STATUS_GROUPS = {
        CREATED: {
            label: "Dibuat",
            statuses: ["CREATED"],
        },
        IN_PROGRESS: {
            label: "Proses Finishing",
            statuses: ["IN_PROGRESS"],
        },
        COMPLETED: {
            label: "Selesai",
            statuses: ["SUBMITTED_TO_WAREHOUSE", "WAREHOUSE_VERIFIED", "COMPLETED"],
        }
    }

    const qualityCheckList = [
        { id: "qc1", label: "Cek jahitan rapi dan kuat" },
        { id: "qc2", label: "Cek ukuran sesuai spesifikasi" },
        { id: "qc3", label: "Cek warna tidak luntur" },
        { id: "qc4", label: "Setrika dengan rapi" },
        { id: "qc5", label: "Pasang label dan tag" },
        { id: "qc6", label: "Packaging dengan plastik" },
    ]

    const filterSubBatches = (groupStatuses: string[]) => {
        return subBatches.filter(batch => {
            const matchesStatus = groupStatuses.includes(batch.status)

            // Filter by month
            const batchDate = new Date(batch.createdAt)
            const batchMonth = `${batchDate.getFullYear()}-${String(batchDate.getMonth() + 1).padStart(2, '0')}`
            const matchesMonth = batchMonth === selectedMonth

            return matchesStatus && matchesMonth
        })
    }

    const getGroupStats = (groupStatuses: string[]) => {
        const groupBatches = filterSubBatches(groupStatuses)
        return {
            total: groupBatches.length,
            totalGood: groupBatches.reduce((sum, b) => sum + b.finishingGoodOutput, 0),
            totalReject: groupBatches.reduce((sum, b) => sum + (b.rejectKotor + b.rejectSobek + b.rejectRusakJahit), 0),
        }
    }

    const fetchSubBatches = async () => {
        try {
            const response = await fetch('/api/sub-batches')

            if (response.ok) {
                const result = await response.json()
                const data = result.data || []
                setSubBatches(data)

                // Auto-select first sub-batch in CREATED or first available
                const activeSubBatch = data.find((sb: SubBatch) =>
                    sb.status === 'CREATED'
                ) || data[0]

                if (activeSubBatch) {
                    setSelectedSubBatch(activeSubBatch)
                    // Initialize finishing results from sub-batch items
                    if (activeSubBatch.items) {
                        setFinishingResults(activeSubBatch.items.map((item: SubBatchItem) => ({
                            itemId: item.id,
                            productSize: item.productSize,
                            color: item.color,
                            goodQuantity: item.goodQuantity || 0,
                            rejectKotor: item.rejectKotor || 0,
                            rejectSobek: item.rejectSobek || 0,
                            rejectRusakJahit: item.rejectRusakJahit || 0,
                        })))
                    }
                    setNotes(activeSubBatch.notes || "")
                }
            }
        } catch (err) {
            toast({
                variant: "destructive",
                title: "Gagal",
                description: "Gagal memuat data sub-batch: " + err
            })
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchSubBatches()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // Handle tab and month change - auto-select appropriate sub-batch
    useEffect(() => {
        const currentGroupStatuses = STATUS_GROUPS[activeTab as keyof typeof STATUS_GROUPS]?.statuses || []
        const filteredSubBatches = filterSubBatches(currentGroupStatuses)

        // Check if current selectedSubBatch is still in filtered list
        if (selectedSubBatch) {
            const subBatchStillExists = filteredSubBatches.some(sb => sb.id === selectedSubBatch.id)
            if (subBatchStillExists) {
                return
            }
        }

        // Auto-select first sub-batch from new filtered list
        if (filteredSubBatches.length > 0) {
            const autoSelectSubBatch = filteredSubBatches[0]
            setSelectedSubBatch(autoSelectSubBatch)
            if (autoSelectSubBatch.items) {
                setFinishingResults(autoSelectSubBatch.items.map(item => ({
                    itemId: item.id,
                    productSize: item.productSize,
                    color: item.color,
                    goodQuantity: item.goodQuantity || 0,
                    rejectKotor: item.rejectKotor || 0,
                    rejectSobek: item.rejectSobek || 0,
                    rejectRusakJahit: item.rejectRusakJahit || 0,
                })))
            }
            setNotes(autoSelectSubBatch.notes || "")
        } else {
            setSelectedSubBatch(null)
            setFinishingResults([])
            setNotes("")
            setQualityChecks({})
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab, selectedMonth])

    const handleUpdateFinishingResults = async () => {
        if (!selectedSubBatch || finishingResults.length === 0) {
            toast({
                variant: "destructive",
                title: "Gagal",
                description: "Tidak ada hasil finishing untuk disimpan"
            })
            return
        }

        setSubmitting(true)
        try {
            const response = await fetch(`/api/sub-batches/${selectedSubBatch.id}/update-finishing`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    items: finishingResults,
                    notes
                })
            })

            if (response.ok) {
                toast({
                    title: "Berhasil",
                    description: "Hasil finishing berhasil disimpan"
                })
                fetchSubBatches()
            } else {
                const error = await response.json()
                throw new Error(error.error || 'Gagal menyimpan hasil finishing')
            }
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Gagal",
                description: error instanceof Error ? error.message : "Gagal menyimpan hasil finishing"
            })
        } finally {
            setSubmitting(false)
        }
    }

    const handleCompleteSubBatch = async () => {
        if (!selectedSubBatch) return

        setSubmitting(true)
        try {
            const response = await fetch(`/api/sub-batches/${selectedSubBatch.id}/complete`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    notes
                })
            })

            if (response.ok) {
                toast({
                    title: "Berhasil",
                    description: "Sub-batch selesai dan siap dikirim ke gudang"
                })
                fetchSubBatches()
                setSelectedSubBatch(null)
                setFinishingResults([])
                setNotes("")
            } else {
                const error = await response.json()
                throw new Error(error.error || 'Gagal menyelesaikan sub-batch')
            }
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Gagal",
                description: error instanceof Error ? error.message : "Gagal menyelesaikan sub-batch"
            })
        } finally {
            setSubmitting(false)
        }
    }

    const getStatusBadge = (status: string) => {
        const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", label: string }> = {
            'CREATED': { variant: 'outline', label: 'Dibuat' },
            'IN_PROGRESS': { variant: 'default', label: 'Proses' },
            'SUBMITTED_TO_WAREHOUSE': { variant: 'default', label: 'Dikirim ke Gudang' },
            'WAREHOUSE_VERIFIED': { variant: 'secondary', label: 'Terverifikasi' },
            'COMPLETED': { variant: 'secondary', label: 'Selesai' },
        }
        const config = variants[status] || { variant: 'outline', label: status }
        return <Badge variant={config.variant}>{config.label}</Badge>
    }

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        )
    }

    if (subBatches.length === 0) {
        return (
            <div className="flex-1 space-y-4 p-8 pt-6">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Proses Finishing</h2>
                    <p className="text-muted-foreground">
                        Input hasil finishing produk per sub-batch
                    </p>
                </div>
                <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                        Tidak ada sub-batch finishing yang ditugaskan saat ini.
                    </AlertDescription>
                </Alert>
            </div>
        )
    }

    const currentBatchInfo = selectedSubBatch ? {
        batchCode: selectedSubBatch.batch.batchSku,
        subBatchCode: selectedSubBatch.subBatchSku,
        product: selectedSubBatch.batch.product.name,
        target: selectedSubBatch.batch.targetQuantity,
        status: selectedSubBatch.status
    } : null

    return (
        <div className="flex-1 space-y-4 p-4 sm:p-6 md:p-8 pt-4 sm:pt-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Proses Finishing</h2>
                    <p className="text-sm sm:text-base text-muted-foreground">
                        Input hasil finishing produk - Reject: Kotor, Sobek, Rusak Jahit
                    </p>
                </div>
            </div>

            {/* Filter Section - Month */}
            <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
                <div className="w-full sm:w-auto">
                    <Label className="text-sm text-muted-foreground mb-2 block">Filter Bulan</Label>
                    <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                        {Array.from({ length: 12 }, (_, i) => {
                            const date = new Date()
                            date.setMonth(date.getMonth() - i)
                            const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
                            const label = date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
                            return (
                                <option key={month} value={month}>
                                    {label}
                                </option>
                            )
                        })}
                    </select>
                </div>
            </div>

            {/* Tabs by Status */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <TabsList className="grid w-full grid-cols-3">
                    {Object.entries(STATUS_GROUPS).map(([key, group]) => {
                        const stats = getGroupStats(group.statuses)
                        return (
                            <TabsTrigger key={key} value={key} className="relative">
                                <span>{group.label}</span>
                                {stats.total > 0 && (
                                    <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                                        {stats.total}
                                    </Badge>
                                )}
                            </TabsTrigger>
                        )
                    })}
                </TabsList>

                {Object.entries(STATUS_GROUPS).map(([key, group]) => {
                    const tabFilteredSubBatches = filterSubBatches(group.statuses)
                    const stats = getGroupStats(group.statuses)

                    return (
                        <TabsContent key={key} value={key} className="space-y-4">
                            {/* Stats Cards */}
                            <div className="grid gap-4 md:grid-cols-3">
                                <Card>
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Sub-Batch</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">{stats.total}</div>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Barang Jadi</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold text-green-600">{stats.totalGood} pcs</div>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Reject</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold text-red-600">{stats.totalReject} pcs</div>
                                    </CardContent>
                                </Card>
                            </div>

                            {tabFilteredSubBatches.length === 0 ? (
                                <Alert>
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertDescription>
                                        Tidak ada sub-batch dengan status ini untuk bulan {new Date(selectedMonth + '-01').toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}.
                                    </AlertDescription>
                                </Alert>
                            ) : (
                                <>
                                    {/* Sub-Batch Selection */}
                                    {tabFilteredSubBatches.length > 1 && (
                                        <Card>
                                            <CardHeader>
                                                <CardTitle className="text-base">Pilih Sub-Batch</CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="space-y-2">
                                                    {tabFilteredSubBatches.map((sb) => (
                                                        <div
                                                            key={sb.id}
                                                            onClick={() => {
                                                                setSelectedSubBatch(sb)
                                                                setFinishingResults(sb.items.map(item => ({
                                                                    itemId: item.id,
                                                                    productSize: item.productSize,
                                                                    color: item.color,
                                                                    goodQuantity: item.goodQuantity || 0,
                                                                    rejectKotor: item.rejectKotor || 0,
                                                                    rejectSobek: item.rejectSobek || 0,
                                                                    rejectRusakJahit: item.rejectRusakJahit || 0,
                                                                })))
                                                                setNotes(sb.notes || "")
                                                            }}
                                                            className={`p-3 border rounded-lg cursor-pointer transition ${selectedSubBatch?.id === sb.id
                                                                ? 'border-primary bg-primary/5'
                                                                : 'border-input hover:border-primary'
                                                                }`}
                                                        >
                                                            <div className="flex justify-between items-start">
                                                                <div>
                                                                    <p className="font-mono font-semibold">{sb.subBatchSku}</p>
                                                                    <p className="text-sm text-muted-foreground">{sb.batch.product.name}</p>
                                                                </div>
                                                                <div className="text-right">
                                                                    <p className="text-sm"><span className="font-semibold text-green-600">{sb.finishingGoodOutput}</span> jadi</p>
                                                                    <p className="text-sm"><span className="font-semibold text-red-600">{sb.rejectKotor + sb.rejectSobek + sb.rejectRusakJahit}</span> reject</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    )}

                                    {/* Single sub-batch - auto-select */}
                                    {tabFilteredSubBatches.length === 1 && (
                                        <>
                                            {(() => {
                                                if (selectedSubBatch?.id !== tabFilteredSubBatches[0].id) {
                                                    setSelectedSubBatch(tabFilteredSubBatches[0])
                                                    if (tabFilteredSubBatches[0].items) {
                                                        setFinishingResults(tabFilteredSubBatches[0].items.map(item => ({
                                                            itemId: item.id,
                                                            productSize: item.productSize,
                                                            color: item.color,
                                                            goodQuantity: item.goodQuantity || 0,
                                                            rejectKotor: item.rejectKotor || 0,
                                                            rejectSobek: item.rejectSobek || 0,
                                                            rejectRusakJahit: item.rejectRusakJahit || 0,
                                                        })))
                                                    }
                                                    setNotes(tabFilteredSubBatches[0].notes || "")
                                                }
                                                return null
                                            })()}
                                        </>
                                    )}
                                </>
                            )}
                        </TabsContent>
                    )
                })}
            </Tabs>

            {/* Current Sub-Batch Info and Actions - shown outside tabs */}
            {currentBatchInfo && selectedSubBatch && (
                <>
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="font-mono text-lg">{currentBatchInfo.subBatchCode}</CardTitle>
                                    <CardDescription>{currentBatchInfo.product} (Batch: {currentBatchInfo.batchCode})</CardDescription>
                                </div>
                                {getStatusBadge(currentBatchInfo.status)}
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Summary Stats */}
                            <div className="grid grid-cols-3 gap-3 sm:gap-4">
                                <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                                    <p className="text-xs sm:text-sm text-muted-foreground">Barang Jadi</p>
                                    <p className="text-lg sm:text-xl font-bold text-green-600">{selectedSubBatch.finishingGoodOutput} pcs</p>
                                </div>
                                <div className="p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
                                    <p className="text-xs sm:text-sm text-muted-foreground">Kotor</p>
                                    <p className="text-lg sm:text-xl font-bold text-yellow-600">{selectedSubBatch.rejectKotor}</p>
                                </div>
                                <div className="p-3 bg-red-50 dark:bg-red-950 rounded-lg">
                                    <p className="text-xs sm:text-sm text-muted-foreground">Sobek/Rusak</p>
                                    <p className="text-lg sm:text-xl font-bold text-red-600">{selectedSubBatch.rejectSobek + selectedSubBatch.rejectRusakJahit}</p>
                                </div>
                            </div>

                            {/* Quality Check */}
                            {selectedSubBatch.status === 'CREATED' && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-base">Quality Check</CardTitle>
                                        <CardDescription>Pastikan semua checklist terpenuhi sebelum finishing</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        {qualityCheckList.map((check) => (
                                            <div key={check.id} className="flex items-center space-x-2">
                                                <Checkbox
                                                    id={check.id}
                                                    checked={qualityChecks[check.id] || false}
                                                    onCheckedChange={(checked) =>
                                                        setQualityChecks(prev => ({ ...prev, [check.id]: checked as boolean }))
                                                    }
                                                />
                                                <Label htmlFor={check.id} className="text-sm cursor-pointer">{check.label}</Label>
                                            </div>
                                        ))}
                                    </CardContent>
                                </Card>
                            )}

                            {/* Input Hasil Finishing */}
                            {(selectedSubBatch.status === 'CREATED' || selectedSubBatch.status === 'IN_PROGRESS') && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-base">Input Hasil Finishing</CardTitle>
                                        <CardDescription>Masukkan jumlah per size/warna - bagus dan jenis reject</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        {/* Table Header */}
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm">
                                                <thead>
                                                    <tr className="border-b">
                                                        <th className="text-left py-2 px-2">Size</th>
                                                        <th className="text-left py-2 px-2">Warna</th>
                                                        <th className="text-center py-2 px-2">Jadi</th>
                                                        <th className="text-center py-2 px-2">Kotor</th>
                                                        <th className="text-center py-2 px-2">Sobek</th>
                                                        <th className="text-center py-2 px-2">Rusak</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {finishingResults.map((result, idx) => (
                                                        <tr key={idx} className="border-b">
                                                            <td className="py-2 px-2 font-medium">{result.productSize}</td>
                                                            <td className="py-2 px-2">{result.color}</td>
                                                            <td className="py-2 px-2">
                                                                <Input
                                                                    type="number"
                                                                    min="0"
                                                                    value={result.goodQuantity}
                                                                    onChange={(e) => {
                                                                        const newResults = [...finishingResults]
                                                                        newResults[idx].goodQuantity = parseInt(e.target.value) || 0
                                                                        setFinishingResults(newResults)
                                                                    }}
                                                                    className="w-16 h-8 text-center"
                                                                />
                                                            </td>
                                                            <td className="py-2 px-2">
                                                                <Input
                                                                    type="number"
                                                                    min="0"
                                                                    value={result.rejectKotor}
                                                                    onChange={(e) => {
                                                                        const newResults = [...finishingResults]
                                                                        newResults[idx].rejectKotor = parseInt(e.target.value) || 0
                                                                        setFinishingResults(newResults)
                                                                    }}
                                                                    className="w-16 h-8 text-center"
                                                                />
                                                            </td>
                                                            <td className="py-2 px-2">
                                                                <Input
                                                                    type="number"
                                                                    min="0"
                                                                    value={result.rejectSobek}
                                                                    onChange={(e) => {
                                                                        const newResults = [...finishingResults]
                                                                        newResults[idx].rejectSobek = parseInt(e.target.value) || 0
                                                                        setFinishingResults(newResults)
                                                                    }}
                                                                    className="w-16 h-8 text-center"
                                                                />
                                                            </td>
                                                            <td className="py-2 px-2">
                                                                <Input
                                                                    type="number"
                                                                    min="0"
                                                                    value={result.rejectRusakJahit}
                                                                    onChange={(e) => {
                                                                        const newResults = [...finishingResults]
                                                                        newResults[idx].rejectRusakJahit = parseInt(e.target.value) || 0
                                                                        setFinishingResults(newResults)
                                                                    }}
                                                                    className="w-16 h-8 text-center"
                                                                />
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="notes" className="text-sm">Catatan</Label>
                                            <input
                                                id="notes"
                                                type="text"
                                                value={notes}
                                                onChange={(e) => setNotes(e.target.value)}
                                                placeholder="Tambahkan catatan jika ada kendala atau informasi penting"
                                                className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm"
                                            />
                                        </div>

                                        <div className="flex gap-2 flex-col-reverse sm:flex-row">
                                            <Button
                                                variant="outline"
                                                onClick={handleUpdateFinishingResults}
                                                disabled={submitting}
                                                className="w-full sm:w-auto"
                                            >
                                                {submitting ? (
                                                    <>
                                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                        Menyimpan...
                                                    </>
                                                ) : (
                                                    'Simpan Progress'
                                                )}
                                            </Button>
                                            <Button
                                                onClick={handleCompleteSubBatch}
                                                disabled={submitting}
                                                className="w-full sm:w-auto"
                                            >
                                                {submitting ? (
                                                    <>
                                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                        Selesaikan...
                                                    </>
                                                ) : (
                                                    <>
                                                        <CheckCircle className="h-4 w-4 mr-2" />
                                                        Selesaikan Finishing
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Sub-Batch Completed */}
                            {['SUBMITTED_TO_WAREHOUSE', 'WAREHOUSE_VERIFIED', 'COMPLETED'].includes(selectedSubBatch.status) && (
                                <Alert>
                                    <CheckCircle className="h-4 w-4" />
                                    <AlertDescription>
                                        Sub-batch ini sudah selesai dan telah dikirim ke gudang.
                                    </AlertDescription>
                                </Alert>
                            )}
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    )
}
