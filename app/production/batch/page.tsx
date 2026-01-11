"use client"

import { Plus, Search, Eye, CheckCircle, AlertCircle, Package, UserPlus, Scissors, Clock, Users, TrendingUp, ChevronDown, ChevronRight } from "lucide-react"
import { Fragment } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useEffect, useState } from "react"
import { toast } from "@/lib/toast"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useRouter } from "next/navigation"
import { CreateBatchDialog } from "@/components/create-batch-dialog"
import { CreateSubBatchDialog } from "@/components/create-sub-batch-dialog"
import { SpinnerCustom } from "@/components/ui/spinner"

interface Material {
    id: string
    code: string
    name: string
    unit: string
    currentStock?: number
}

interface MaterialColorVariant {
    id: string
    materialId: string
    colorName: string
    colorCode?: string
    stock: number
    minimumStock: number
    material: Material
}

interface MaterialColorAllocation {
    id: string
    materialColorVariantId: string
    rollQuantity: number
    allocatedQty: number
    meterPerRoll: number
    materialColorVariant: MaterialColorVariant
}

interface ProductMaterial {
    materialId: string
    quantity: number
    material: Material
}

interface Product {
    id: string
    sku: string
    name: string
    materials: ProductMaterial[]
}

interface Batch {
    id: string
    batchSku: string
    status: string
    totalRolls: number
    actualQuantity: number | null
    rejectQuantity: number
    createdAt: string
    product: Product
    materialAllocations?: MaterialAllocation[]
    materialColorAllocations?: MaterialColorAllocation[]
    sizeColorRequests?: Array<{
        id: string
        productSize: string
        color: string
        requestedPieces: number
    }>
    cuttingResults?: Array<{
        id: string
        productSize: string
        color: string
        actualPieces: number
        isConfirmed: boolean
        confirmedBy?: {
            name: string
            role: string
        }
    }>
    subBatches?: SubBatch[]
}

interface MaterialAllocation {
    materialId: string
    materialName: string
    color: string
    rollQuantity: number
    requestedQty: number
    unit: string
    availableStock: number
    material: Material
}

interface Cutter {
    id: string
    name: string
    email: string
    _count: {
        cuttingTasks: number
    }
}

interface CuttingTask {
    id: string
    batchId: string
    assignedToId: string
    materialReceived: number
    piecesCompleted: number
    rejectPieces: number
    wasteQty: number | null
    status: string
    notes: string | null
    startedAt: string | null
    completedAt: string | null
    assignedTo: {
        name: string
    }
}

interface Sewer {
    id: string
    name: string
    email: string
    _count: {
        sewingTasks: number
    }
}

interface SewingTask {
    id: string
    batchId: string
    assignedToId: string
    piecesReceived: number
    piecesCompleted: number
    rejectPieces: number
    status: string
    notes: string | null
    startedAt: string | null
    completedAt: string | null
    assignedTo: {
        name: string
    }
}

interface Finisher {
    id: string
    name: string
    email: string
    _count: {
        finishingTasks: number
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
    piecesAssigned: number
    sewingOutput: number
    sewingReject: number
    finishingOutput: number
    finishingReject: number
    status: string
    createdAt: string
    assignedSewer?: {
        id: string
        name: string
        username: string
    }
    assignedFinisher?: {
        id: string
        name: string
        username: string
    }
    items: SubBatchItem[]
}

export default function BatchManagementPage() {
    const router = useRouter()
    const [batches, setBatches] = useState<Batch[]>([])
    const [products, setProducts] = useState<Product[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")
    const [activeTab, setActiveTab] = useState("PENDING")
    const [expandedBatches, setExpandedBatches] = useState<Set<string>>(new Set())
    const [loadingSubBatches, setLoadingSubBatches] = useState<Set<string>>(new Set())
    const [showCreateDialog, setShowCreateDialog] = useState(false)
    const [showConfirmDialog, setShowConfirmDialog] = useState(false)
    const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null)
    const [confirming, setConfirming] = useState(false)
    const [showAssignDialog, setShowAssignDialog] = useState(false)
    const [assignBatch, setAssignBatch] = useState<Batch | null>(null)
    const [cutters, setCutters] = useState<Cutter[]>([])
    const [selectedCutterId, setSelectedCutterId] = useState("")
    const [assignNotes, setAssignNotes] = useState("")
    const [assigning, setAssigning] = useState(false)
    const [showVerifyDialog, setShowVerifyDialog] = useState(false)
    const [verifyBatch, setVerifyBatch] = useState<Batch | null>(null)
    const [cuttingTask, setCuttingTask] = useState<CuttingTask | null>(null)
    const [verifyAction, setVerifyAction] = useState<"approve" | "reject">("approve")
    const [verifyNotes, setVerifyNotes] = useState("")
    const [verifying, setVerifying] = useState(false)
    const [showAssignSewerDialog, setShowAssignSewerDialog] = useState(false)
    const [assignSewerBatch, setAssignSewerBatch] = useState<Batch | null>(null)
    const [sewers, setSewers] = useState<Sewer[]>([])
    const [selectedSewerId, setSelectedSewerId] = useState("")
    const [assignSewerNotes, setAssignSewerNotes] = useState("")
    const [assigningSewer, setAssigningSewer] = useState(false)
    const [showVerifySewingDialog, setShowVerifySewingDialog] = useState(false)
    const [verifySewingBatch, setVerifySewingBatch] = useState<Batch | null>(null)
    const [sewingTask, setSewingTask] = useState<SewingTask | null>(null)
    const [verifySewingAction, setVerifySewingAction] = useState<"approve" | "reject">("approve")
    const [verifySewingNotes, setVerifySewingNotes] = useState("")
    const [verifyingSewing, setVerifyingSewing] = useState(false)
    const [showAssignFinisherDialog, setShowAssignFinisherDialog] = useState(false)
    const [assignFinisherBatch, setAssignFinisherBatch] = useState<Batch | null>(null)
    const [finishers, setFinishers] = useState<Finisher[]>([])
    const [selectedFinisherId, setSelectedFinisherId] = useState("")
    // Sub-batch state
    const [showSubBatchDialog, setShowSubBatchDialog] = useState(false)
    const [subBatchBatch, setSubBatchBatch] = useState<Batch | null>(null)
    const [assignFinisherNotes, setAssignFinisherNotes] = useState("")
    const [assigningFinisher, setAssigningFinisher] = useState(false)
    const [showInputCuttingDialog, setShowInputCuttingDialog] = useState(false)
    const [inputCuttingBatch, setInputCuttingBatch] = useState<Batch | null>(null)
    const [cuttingResults, setCuttingResults] = useState<Array<{
        productSize: string
        color: string
        actualPieces: number
    }>>([])
    const [cuttingNotes, setCuttingNotes] = useState("")
    const [submittingCutting, setSubmittingCutting] = useState(false)

    // Form state - handled by CreateBatchDialog component

    useEffect(() => {
        fetchBatches()
        fetchProducts()
    }, [])

    const fetchBatches = async () => {
        try {
            const response = await fetch("/api/production-batches")
            const result = await response.json()

            if (result.success) {
                setBatches(result.data)
            }
        } catch (error) {
            console.error("Error fetching batches:", error)
        } finally {
            setLoading(false)
        }
    }

    const fetchProducts = async () => {
        try {
            const response = await fetch("/api/products")
            const result = await response.json()

            if (result.success) {
                setProducts(result.data)
            }
        } catch (error) {
            console.error("Error fetching products:", error)
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

    const getSubBatchStatusBadge = (status: string) => {
        const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
            ASSIGNED_TO_SEWER: { label: "Di-assign ke Penjahit", variant: "secondary" },
            SEWING_IN_PROGRESS: { label: "Proses Jahit", variant: "outline" },
            SEWING_COMPLETED: { label: "Jahitan Selesai", variant: "default" },
            SEWING_CONFIRMED: { label: "Jahitan Dikonfirmasi", variant: "default" },
            ASSIGNED_TO_FINISHER: { label: "Di-assign ke Finisher", variant: "secondary" },
            FINISHING_IN_PROGRESS: { label: "Proses Finishing", variant: "outline" },
            FINISHING_COMPLETED: { label: "Finishing Selesai", variant: "default" },
            FINISHING_CONFIRMED: { label: "Finishing Dikonfirmasi", variant: "default" },
            SUBMITTED_TO_WAREHOUSE: { label: "Ke Gudang", variant: "default" },
            WAREHOUSE_VERIFIED: { label: "Terverifikasi", variant: "default" },
        }

        const config = statusConfig[status] || { label: status, variant: "secondary" }

        return (
            <Badge variant={config.variant} className="text-xs">
                {config.label}
            </Badge>
        )
    }

    // Batch creation handled by CreateBatchDialog component

    const handleConfirmBatch = async () => {
        console.log(selectedBatch)
        if (!selectedBatch) return

        setConfirming(true)
        try {
            const response = await fetch(`/api/production-batches/${selectedBatch.id}/confirm`, {
                method: "POST",
            })

            if (!response.ok) {
                const text = await response.text()
                let errorMessage = "Gagal mengkonfirmasi batch"
                try {
                    const result = JSON.parse(text)
                    errorMessage = result.error || errorMessage
                } catch {
                    errorMessage = `Server error: ${response.status} ${response.statusText}`
                }
                toast.error("Error", errorMessage)
                return
            }

            const result = await response.json()

            if (result.success) {
                toast.success("Berhasil", result.message || "Batch berhasil dikonfirmasi")
                setShowConfirmDialog(false)
                setSelectedBatch(null)
                fetchBatches()
            } else {
                toast.error("Error", result.error || "Gagal mengkonfirmasi batch")
            }
        } catch (error) {
            console.error("Error confirming batch:", error)
            toast.error("Error", "Terjadi kesalahan saat mengkonfirmasi batch")
        } finally {
            setConfirming(false)
        }
    }

    const openConfirmDialog = async (batch: Batch) => {
        // Fetch full batch details including material allocations
        try {
            const response = await fetch(`/api/production-batches/${batch.id}`)
            const result = await response.json()

            if (result.success) {
                setSelectedBatch(result.data)
                setShowConfirmDialog(true)
            }
        } catch (error) {
            console.error("Error fetching batch details:", error)
            toast.error("Error", "Gagal memuat detail batch")
        }
    }

    const openAssignDialog = async (batch: Batch) => {
        setSelectedCutterId("")
        setAssignNotes("")

        // Fetch full batch details including material allocations
        try {
            const batchResponse = await fetch(`/api/production-batches/${batch.id}`)
            const batchResult = await batchResponse.json()

            if (batchResult.success) {
                setAssignBatch(batchResult.data)
            } else {
                toast.error("Error", "Gagal memuat detail batch")
                return
            }
        } catch (error) {
            console.error("Error fetching batch details:", error)
            toast.error("Error", "Gagal memuat detail batch")
            return
        }

        // Fetch cutters
        try {
            const response = await fetch("/api/users/cutters")
            const result = await response.json()

            if (result.success) {
                setCutters(result.data)
                setShowAssignDialog(true)
            }
        } catch (error) {
            console.error("Error fetching cutters:", error)
            toast.error("Error", "Gagal memuat daftar pemotong")
        }
    }

    const handleAssignToCutter = async () => {
        if (!assignBatch || !selectedCutterId) {
            toast.error("Error", "Pilih pemotong terlebih dahulu")
            return
        }

        // Hitung total material yang akan diterima pemotong
        const totalMaterialReceived = assignBatch.materialAllocations?.reduce(
            (sum, allocation) => sum + Number(allocation.requestedQty),
            0
        ) || 0

        setAssigning(true)
        try {
            const response = await fetch(`/api/production-batches/${assignBatch.id}/assign-cutter`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    assignedToId: selectedCutterId,
                    notes: assignNotes,
                    materialReceived: totalMaterialReceived,
                    materialAllocations: assignBatch.materialAllocations?.map(allocation => ({
                        materialId: allocation.materialId,
                        materialName: allocation.materialName,
                        quantity: allocation.requestedQty,
                        unit: allocation.unit
                    }))
                }),
            })

            const result = await response.json()

            if (result.success) {
                toast.success("Berhasil", result.message || "Batch berhasil di-assign ke pemotong")
                setShowAssignDialog(false)
                setAssignBatch(null)
                setSelectedCutterId("")
                setAssignNotes("")
                fetchBatches()
            } else {
                toast.error("Error", result.error || "Gagal assign batch")
            }
        } catch (error) {
            console.error("Error assigning batch:", error)
            toast.error("Error", "Terjadi kesalahan saat assign batch")
        } finally {
            setAssigning(false)
        }
    }

    const openVerifyDialog = async (batch: Batch) => {
        setVerifyAction("approve")
        setVerifyNotes("")

        // Fetch full batch details including cutting results
        try {
            const batchResponse = await fetch(`/api/production-batches/${batch.id}`)
            const batchResult = await batchResponse.json()

            if (batchResult.success) {
                setVerifyBatch(batchResult.data)
            } else {
                toast.error("Error", "Gagal memuat detail batch")
                return
            }
        } catch (error) {
            console.error("Error fetching batch details:", error)
            toast.error("Error", "Gagal memuat detail batch")
            return
        }

        // Fetch cutting task details
        try {
            const response = await fetch(`/api/production-batches/${batch.id}/cutting-task`)
            const result = await response.json()

            if (result.success && result.data) {
                setCuttingTask(result.data)
                setShowVerifyDialog(true)
            } else {
                toast.error("Error", "Gagal memuat detail cutting task")
            }
        } catch (error) {
            console.error("Error fetching cutting task:", error)
            toast.error("Error", "Gagal memuat detail cutting task")
        }
    }

    const handleVerifyCutting = async () => {
        if (!cuttingTask) return

        setVerifying(true)
        try {
            const response = await fetch(`/api/cutting-tasks/${cuttingTask.id}/verify`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    action: verifyAction,
                    notes: verifyNotes,
                }),
            })

            const result = await response.json()

            if (result.success) {
                toast.success("Berhasil", result.message || "Verifikasi berhasil")
                setShowVerifyDialog(false)
                setVerifyBatch(null)
                setCuttingTask(null)
                setVerifyNotes("")
                fetchBatches()
            } else {
                toast.error("Error", result.error || "Gagal verifikasi")
            }
        } catch (error) {
            console.error("Error verifying cutting:", error)
            toast.error("Error", "Terjadi kesalahan saat verifikasi")
        } finally {
            setVerifying(false)
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const openAssignSewerDialog = async (batch: Batch) => {
        setAssignSewerBatch(batch)
        setSelectedSewerId("")
        setAssignSewerNotes("")

        // Fetch sewers
        try {
            const response = await fetch("/api/users/sewers")
            const result = await response.json()

            if (result.success) {
                setSewers(result.data)
                setShowAssignSewerDialog(true)
            }
        } catch (error) {
            console.error("Error fetching sewers:", error)
            toast.error("Error", "Gagal memuat daftar penjahit")
        }
    }

    // Open sub-batch dialog (for assigning to multiple sewers)
    const openSubBatchDialog = async (batch: Batch) => {
        try {
            const response = await fetch(`/api/production-batches/${batch.id}`)
            const result = await response.json()

            if (result.success) {
                setSubBatchBatch(result.data)
                setShowSubBatchDialog(true)
            } else {
                toast.error("Error", "Gagal memuat detail batch")
            }
        } catch (error) {
            console.error("Error fetching batch details:", error)
            toast.error("Error", "Gagal memuat detail batch")
        }
    }

    const handleAssignToSewer = async () => {
        if (!assignSewerBatch || !selectedSewerId) {
            toast.error("Error", "Pilih penjahit terlebih dahulu")
            return
        }

        setAssigningSewer(true)
        try {
            const response = await fetch(`/api/production-batches/${assignSewerBatch.id}/assign-sewer`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    assignedToId: selectedSewerId,
                    notes: assignSewerNotes,
                }),
            })

            const result = await response.json()

            if (result.success) {
                toast.success("Berhasil", result.message || "Batch berhasil di-assign ke penjahit")
                setShowAssignSewerDialog(false)
                setAssignSewerBatch(null)
                setSelectedSewerId("")
                setAssignSewerNotes("")
                fetchBatches()
            } else {
                toast.error("Error", result.error || "Gagal assign batch")
            }
        } catch (error) {
            console.error("Error assigning batch to sewer:", error)
            toast.error("Error", "Terjadi kesalahan saat assign batch")
        } finally {
            setAssigningSewer(false)
        }
    }

    const openVerifySewingDialog = async (batch: Batch) => {
        setVerifySewingBatch(batch)
        setVerifySewingAction("approve")
        setVerifySewingNotes("")

        // Fetch sewing task details
        try {
            const response = await fetch(`/api/production-batches/${batch.id}/sewing-task`)
            const result = await response.json()

            if (result.success && result.data) {
                setSewingTask(result.data)
                setShowVerifySewingDialog(true)
            } else {
                toast.error("Error", "Gagal memuat detail sewing task")
            }
        } catch (error) {
            console.error("Error fetching sewing task:", error)
            toast.error("Error", "Gagal memuat detail sewing task")
        }
    }

    const handleVerifySewing = async () => {
        if (!sewingTask) return

        setVerifyingSewing(true)
        try {
            const response = await fetch(`/api/sewing-tasks/${sewingTask.id}/verify`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    action: verifySewingAction,
                    notes: verifySewingNotes,
                }),
            })

            const result = await response.json()

            if (result.success) {
                toast.success("Berhasil", result.message || "Verifikasi berhasil")
                setShowVerifySewingDialog(false)
                setVerifySewingBatch(null)
                setSewingTask(null)
                setVerifySewingNotes("")
                fetchBatches()
            } else {
                toast.error("Error", result.error || "Gagal verifikasi")
            }
        } catch (error) {
            console.error("Error verifying sewing:", error)
            toast.error("Error", "Terjadi kesalahan saat verifikasi")
        } finally {
            setVerifyingSewing(false)
        }
    }

    const openAssignFinisherDialog = async (batch: Batch) => {
        setAssignFinisherBatch(batch)
        setSelectedFinisherId("")
        setAssignFinisherNotes("")

        // Fetch finishers
        try {
            const response = await fetch("/api/users/finishers")
            const result = await response.json()

            if (result.success) {
                setFinishers(result.data)
                setShowAssignFinisherDialog(true)
            }
        } catch (error) {
            console.error("Error fetching finishers:", error)
            toast.error("Error", "Gagal memuat daftar finisher")
        }
    }

    const openInputCuttingDialog = async (batch: Batch) => {
        // Fetch full batch details
        try {
            const response = await fetch(`/api/production-batches/${batch.id}`)
            const result = await response.json()

            if (result.success) {
                setInputCuttingBatch(result.data)

                // Initialize cutting results from sizeColorRequests
                if (result.data.sizeColorRequests) {
                    setCuttingResults(result.data.sizeColorRequests.map((req: { productSize: string; color: string; requestedPieces: number }) => ({
                        productSize: req.productSize,
                        color: req.color,
                        actualPieces: req.requestedPieces // Default to requested
                    })))
                }

                setCuttingNotes("")
                setShowInputCuttingDialog(true)
            }
        } catch (error) {
            console.error("Error fetching batch details:", error)
            toast.error("Error", "Gagal memuat detail batch")
        }
    }

    const handleSubmitCuttingResults = async () => {
        if (!inputCuttingBatch) return

        // Validation
        const totalActual = cuttingResults.reduce((sum, r) => sum + r.actualPieces, 0)
        if (totalActual === 0) {
            toast.error("Error", "Total actual pieces harus lebih dari 0")
            return
        }

        setSubmittingCutting(true)
        try {
            const response = await fetch(`/api/production-batches/${inputCuttingBatch.id}/input-cutting-results`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    cuttingResults,
                    notes: cuttingNotes,
                }),
            })

            const result = await response.json()

            if (result.success) {
                toast.success("Berhasil", result.message || "Hasil potongan berhasil disimpan")
                setShowInputCuttingDialog(false)
                setInputCuttingBatch(null)
                setCuttingResults([])
                setCuttingNotes("")
                fetchBatches()
            } else {
                toast.error("Error", result.error || "Gagal menyimpan hasil potongan")
            }
        } catch (error) {
            console.error("Error submitting cutting results:", error)
            toast.error("Error", "Terjadi kesalahan saat menyimpan hasil potongan")
        } finally {
            setSubmittingCutting(false)
        }
    }

    const handleAssignToFinisher = async () => {
        if (!assignFinisherBatch || !selectedFinisherId) {
            toast.error("Error", "Pilih finisher terlebih dahulu")
            return
        }

        setAssigningFinisher(true)
        try {
            const response = await fetch(`/api/production-batches/${assignFinisherBatch.id}/assign-finisher`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    assignedToId: selectedFinisherId,
                    notes: assignFinisherNotes,
                }),
            })

            const result = await response.json()

            if (result.success) {
                toast.success("Berhasil", result.message || "Batch berhasil di-assign ke finisher")
                setShowAssignFinisherDialog(false)
                setAssignFinisherBatch(null)
                setSelectedFinisherId("")
                setAssignFinisherNotes("")
                fetchBatches()
            } else {
                toast.error("Error", result.error || "Gagal assign batch")
            }
        } catch (error) {
            console.error("Error assigning batch to finisher:", error)
            toast.error("Error", "Terjadi kesalahan saat assign batch")
        } finally {
            setAssigningFinisher(false)
        }
    }

    const getStatusLabel = (status: string) => {
        const statusMap: Record<string, string> = {
            PENDING: "Menunggu",
            MATERIAL_REQUESTED: "Material Diminta",
            MATERIAL_ALLOCATED: "Material Dialokasi",
            ASSIGNED_TO_CUTTER: "Di-assign ke Pemotong",
            IN_CUTTING: "Proses Pemotongan",
            CUTTING_COMPLETED: "Pemotongan Selesai",
            CUTTING_VERIFIED: "Potongan Terverifikasi",
            ASSIGNED_TO_SEWER: "Di-assign ke Penjahit",
            IN_SEWING: "Proses Penjahitan",
            SEWING_COMPLETED: "Penjahitan Selesai",
            SEWING_VERIFIED: "Jahitan Terverifikasi",
            IN_FINISHING: "Proses Finishing",
            FINISHING_COMPLETED: "Finishing Selesai",
            WAREHOUSE_VERIFIED: "Terverifikasi Gudang",
            COMPLETED: "Selesai",
            CANCELLED: "Dibatalkan",
        }
        return statusMap[status] || status
    }

    const formatDate = (dateString: string) => {
        const date = new Date(dateString)
        return date.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })
    }

    // Status groups for tabs
    const STATUS_GROUPS = {
        PENDING: {
            label: "Menunggu",
            statuses: ["PENDING", "MATERIAL_REQUESTED", "MATERIAL_ALLOCATED"],
            icon: Clock,
            color: "text-yellow-600"
        },
        CUTTING: {
            label: "Pemotongan",
            statuses: ["ASSIGNED_TO_CUTTER", "CUTTING_IN_PROGRESS", "CUTTING_COMPLETED"],
            icon: Scissors,
            color: "text-blue-600"
        },
        SEWING: {
            label: "Penjahitan",
            statuses: ["ASSIGNED_TO_SEWER", "SEWING_IN_PROGRESS", "SEWING_COMPLETED", "CUTTING_VERIFIED"],
            icon: Users,
            color: "text-purple-600"
        },
        FINISHING: {
            label: "Finishing",
            statuses: ["ASSIGNED_TO_FINISHING", "FINISHING_IN_PROGRESS", "FINISHING_COMPLETED", "SEWING_VERIFIED"],
            icon: CheckCircle,
            color: "text-green-600"
        },
        COMPLETED: {
            label: "Selesai",
            statuses: ["VERIFIED_READY", "COMPLETED", "WAREHOUSE_VERIFIED"],
            icon: CheckCircle,
            color: "text-green-600"
        }
    }

    const filterBatches = (groupStatuses: string[]) => {
        return batches.filter(batch => {
            const matchesStatus = groupStatuses.includes(batch.status)
            const matchesSearch = search.trim() === "" ||
                batch.batchSku.toLowerCase().includes(search.toLowerCase()) ||
                batch.product.name.toLowerCase().includes(search.toLowerCase()) ||
                batch.product.sku.toLowerCase().includes(search.toLowerCase())

            return matchesStatus && matchesSearch
        })
    }

    const getGroupStats = (groupStatuses: string[]) => {
        const groupBatches = batches.filter(b => groupStatuses.includes(b.status))
        return {
            total: groupBatches.length,
            totalRolls: groupBatches.reduce((sum, b) => sum + b.totalRolls, 0),
            totalPieces: groupBatches.reduce((sum, b) => sum + (b.actualQuantity || 0), 0),
        }
    }

    if (loading) {
        return (
            <div className="flex-1 space-y-4 p-8 pt-6">
                <SpinnerCustom />
                <div className="text-center">Loading...</div>
            </div>
        )
    }

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Manajemen Batch</h2>
                    <p className="text-muted-foreground text-sm md:text-base">
                        Kelola batch produksi dan penjadwalan
                    </p>
                </div>
                <Button onClick={() => setShowCreateDialog(true)} className="w-full sm:w-auto">
                    <Plus className="h-4 w-4 mr-2" />
                    Mulai Produksi
                </Button>
            </div>

            {/* Create Batch Dialog */}
            <CreateBatchDialog
                open={showCreateDialog}
                onOpenChange={setShowCreateDialog}
                products={products}
                onSuccess={fetchBatches}
            />

            {/* Create Sub-Batch Dialog (Assign to multiple sewers) */}
            {subBatchBatch && (
                <CreateSubBatchDialog
                    open={showSubBatchDialog}
                    onOpenChange={setShowSubBatchDialog}
                    batchId={subBatchBatch.id}
                    batchSku={subBatchBatch.batchSku}
                    cuttingResults={subBatchBatch.cuttingResults || []}
                    onSuccess={() => {
                        fetchBatches()
                        setSubBatchBatch(null)
                    }}
                />
            )}

            {/* Confirm Batch Dialog */}
            <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Konfirmasi Batch Produksi</DialogTitle>
                        <DialogDescription>
                            Konfirmasi batch ini untuk mengalokasikan material dan memulai proses produksi
                        </DialogDescription>
                    </DialogHeader>

                    {selectedBatch && (
                        <div className="space-y-4 py-4">
                            {/* Batch Info */}
                            <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg">
                                <div>
                                    <Label className="text-muted-foreground">Kode Batch</Label>
                                    <p className="font-mono font-medium">{selectedBatch.batchSku}</p>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground">Produk</Label>
                                    <p className="font-medium">{selectedBatch.product.name}</p>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground">Total Roll Bahan</Label>
                                    <p className="font-medium">{selectedBatch.totalRolls} roll</p>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground">Status</Label>
                                    <Badge>{getStatusLabel(selectedBatch.status)}</Badge>
                                </div>
                            </div>

                            {/* Material Allocations */}
                            <div className="space-y-2">
                                <Label>Material yang Dibutuhkan</Label>
                                {selectedBatch.materialColorAllocations && selectedBatch.materialColorAllocations.length > 0 ? (
                                    <div className="rounded-md border">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Material</TableHead>
                                                    <TableHead>Warna</TableHead>
                                                    <TableHead className="text-right">Roll</TableHead>
                                                    <TableHead className="text-right">Kebutuhan</TableHead>
                                                    <TableHead className="text-right">Stok</TableHead>
                                                    <TableHead className="text-center">Status</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {selectedBatch.materialColorAllocations.map((allocation, idx) => {
                                                    const available = Number(allocation.materialColorVariant.stock)
                                                    const needed = Number(allocation.allocatedQty)
                                                    const sufficient = available >= needed

                                                    return (
                                                        <TableRow key={idx}>
                                                            <TableCell>
                                                                <div>
                                                                    <p className="font-medium">{allocation.materialColorVariant.material.name}</p>
                                                                    <p className="text-sm text-muted-foreground">
                                                                        {allocation.materialColorVariant.material.code}
                                                                    </p>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell>
                                                                <Badge variant="outline">{allocation.materialColorVariant.colorName}</Badge>
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                {allocation.rollQuantity}
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                ~ {needed} m
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                {available} {allocation.materialColorVariant.material.unit}
                                                            </TableCell>
                                                            <TableCell className="text-center">
                                                                {sufficient ? (
                                                                    <Badge className="bg-green-500">
                                                                        <CheckCircle className="h-3 w-3 mr-1" />
                                                                        Cukup
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
                                ) : selectedBatch.materialAllocations && selectedBatch.materialAllocations.length > 0 ? (
                                    <div className="rounded-md border">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Material</TableHead>
                                                    <TableHead>Warna</TableHead>
                                                    <TableHead className="text-right">Roll</TableHead>
                                                    <TableHead className="text-right">Kebutuhan</TableHead>
                                                    <TableHead className="text-right">Stok</TableHead>
                                                    <TableHead className="text-center">Status</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {selectedBatch.materialAllocations.map((allocation, idx) => {
                                                    const available = Number(allocation.material?.currentStock) || 0
                                                    const needed = Number(allocation.requestedQty)
                                                    const sufficient = available >= needed

                                                    return (
                                                        <TableRow key={idx}>
                                                            <TableCell>
                                                                <div>
                                                                    <p className="font-medium">{allocation.material?.name || allocation.materialName}</p>
                                                                    <p className="text-sm text-muted-foreground">
                                                                        {allocation.material?.code}
                                                                    </p>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell>
                                                                <Badge variant="outline">{allocation.color}</Badge>
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                {allocation.rollQuantity}
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                {needed.toFixed(2)} {allocation.unit}
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                {available.toFixed(2)} {allocation.unit}
                                                            </TableCell>
                                                            <TableCell className="text-center">
                                                                {sufficient ? (
                                                                    <Badge className="bg-green-500">
                                                                        <CheckCircle className="h-3 w-3 mr-1" />
                                                                        Cukup
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
                                ) : (
                                    <Alert>
                                        <Package className="h-4 w-4" />
                                        <AlertDescription>
                                            Tidak ada material yang diperlukan untuk batch ini
                                        </AlertDescription>
                                    </Alert>
                                )}
                            </div>

                            {/* Warning if insufficient stock */}
                            {selectedBatch.materialColorAllocations?.some(
                                (a) => Number(a.materialColorVariant.stock) < Number(a.allocatedQty)
                            ) && (
                                    <Alert variant="destructive">
                                        <AlertCircle className="h-4 w-4" />
                                        <AlertDescription>
                                            <strong>Peringatan:</strong> Beberapa material tidak mencukupi.
                                            Silakan tambah stok material terlebih dahulu sebelum konfirmasi.
                                        </AlertDescription>
                                    </Alert>
                                )}

                            {/* Confirmation Info */}
                            <Alert>
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>
                                    Dengan mengkonfirmasi batch ini, material akan dialokasikan dan stok akan
                                    dikurangi secara otomatis. Batch akan siap untuk memulai proses produksi.
                                </AlertDescription>
                            </Alert>
                        </div>
                    )}

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setShowConfirmDialog(false)
                                setSelectedBatch(null)
                            }}
                            disabled={confirming}
                        >
                            Batal
                        </Button>
                        <Button
                            onClick={handleConfirmBatch}
                            disabled={
                                confirming ||
                                selectedBatch?.materialColorAllocations?.some(
                                    (a) => Number(a.materialColorVariant.stock) < Number(a.allocatedQty)
                                ) ||
                                false
                            }
                        >
                            {confirming ? "Mengkonfirmasi..." : "Konfirmasi Batch"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Assign to Cutter Dialog */}
            <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" >
                    <DialogHeader>
                        <DialogTitle>Assign ke Pemotong</DialogTitle>
                        <DialogDescription>
                            Pilih pemotong untuk mengerjakan batch ini
                        </DialogDescription>
                    </DialogHeader>
                    {assignBatch && (
                        <div className="space-y-4 py-4">
                            {/* Batch Info */}
                            <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg bg-muted/50">
                                <div>
                                    <Label className="text-muted-foreground">Kode Batch</Label>
                                    <p className="font-mono font-medium">{assignBatch.batchSku}</p>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground">Produk</Label>
                                    <p className="font-medium">{assignBatch.product.name}</p>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground">Total Roll Bahan</Label>
                                    <p className="font-medium">{assignBatch.totalRolls} roll</p>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground">Status</Label>
                                    <Badge>{getStatusLabel(assignBatch.status)}</Badge>
                                </div>
                            </div>

                            {/* Material yang Sudah Dialokasikan */}
                            {((assignBatch.materialColorAllocations && assignBatch.materialColorAllocations.length > 0) ||
                                (assignBatch.materialAllocations && assignBatch.materialAllocations.length > 0)) && (
                                    <div className="space-y-2">
                                        <Label>Bahan Baku untuk Pemotongan</Label>
                                        <p className="text-sm text-muted-foreground">
                                            Material yang sudah dialokasikan dan siap diteruskan ke pemotong
                                        </p>
                                        <div className="rounded-md border">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>Material</TableHead>
                                                        <TableHead>Warna</TableHead>
                                                        <TableHead className="text-right">Roll</TableHead>
                                                        <TableHead className="text-right">Total</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {assignBatch.materialColorAllocations && assignBatch.materialColorAllocations.length > 0 ? (
                                                        assignBatch.materialColorAllocations.map((allocation, idx) => (
                                                            <TableRow key={idx}>
                                                                <TableCell className="font-medium">
                                                                    {allocation.materialColorVariant.material.name}
                                                                </TableCell>
                                                                <TableCell>
                                                                    <Badge variant="outline">{allocation.materialColorVariant.colorName}</Badge>
                                                                </TableCell>
                                                                <TableCell className="text-right">
                                                                    {allocation.rollQuantity}
                                                                </TableCell>
                                                                <TableCell className="text-right">
                                                                    {Number(allocation.allocatedQty).toFixed(2)} m
                                                                </TableCell>
                                                            </TableRow>
                                                        ))
                                                    ) : (
                                                        assignBatch.materialAllocations?.map((allocation, idx) => (
                                                            <TableRow key={idx}>
                                                                <TableCell className="font-medium">
                                                                    {allocation.material?.name || allocation.materialName}
                                                                </TableCell>
                                                                <TableCell>
                                                                    <Badge variant="outline">{allocation.color}</Badge>
                                                                </TableCell>
                                                                <TableCell className="text-right">
                                                                    {allocation.rollQuantity}
                                                                </TableCell>
                                                                <TableCell className="text-right">
                                                                    {Number(allocation.requestedQty).toFixed(2)} {allocation.unit}
                                                                </TableCell>
                                                            </TableRow>
                                                        ))
                                                    )}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </div>
                                )}

                            {/* Size & Color Requests */}
                            {assignBatch.sizeColorRequests && assignBatch.sizeColorRequests.length > 0 && (
                                <div className="space-y-2">
                                    <Label>Request Ukuran & Warna</Label>
                                    <p className="text-sm text-muted-foreground">
                                        Target potongan yang diinginkan untuk setiap ukuran dan warna
                                    </p>
                                    <div className="rounded-md border">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Ukuran</TableHead>
                                                    <TableHead>Warna</TableHead>
                                                    <TableHead className="text-right">Target Pcs</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {assignBatch.sizeColorRequests.map((request) => (
                                                    <TableRow key={request.id}>
                                                        <TableCell className="font-medium">
                                                            {request.productSize}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline">{request.color}</Badge>
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            {request.requestedPieces}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </div>
                            )}

                            {/* Cutter Selection */}
                            <div className="space-y-2">
                                <Label htmlFor="cutter">Pilih Pemotong *</Label>
                                <Select
                                    id="cutter"
                                    value={selectedCutterId}
                                    onChange={(e) => setSelectedCutterId(e.target.value)}
                                >
                                    <option value="">Pilih pemotong</option>
                                    {cutters.map((cutter) => (
                                        <option key={cutter.id} value={cutter.id}>
                                            {cutter.name} ({cutter._count.cuttingTasks} task aktif)
                                        </option>
                                    ))}
                                </Select>
                            </div>

                            {/* Notes */}
                            <div className="space-y-2">
                                <Label htmlFor="assignNotes">Catatan (Opsional)</Label>
                                <Textarea
                                    id="assignNotes"
                                    placeholder="Tambahkan catatan untuk pemotong..."
                                    value={assignNotes}
                                    onChange={(e) => setAssignNotes(e.target.value)}
                                    rows={3}
                                />
                            </div>

                            <Alert>
                                <UserPlus className="h-4 w-4" />
                                <AlertDescription>
                                    Setelah di-assign, pemotong akan menerima notifikasi dan dapat mulai mengerjakan batch ini.
                                </AlertDescription>
                            </Alert>
                        </div>
                    )}
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setShowAssignDialog(false)
                                setAssignBatch(null)
                                setSelectedCutterId("")
                                setAssignNotes("")
                            }}
                            disabled={assigning}
                        >
                            Batal
                        </Button>
                        <Button
                            onClick={handleAssignToCutter}
                            disabled={assigning || !selectedCutterId}
                        >
                            {assigning ? "Mengassign..." : "Assign ke Pemotong"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Verify Cutting Dialog */}
            <Dialog open={showVerifyDialog} onOpenChange={setShowVerifyDialog}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Verifikasi Potongan</DialogTitle>
                        <DialogDescription>
                            Periksa hasil pemotongan dan approve atau tolak
                        </DialogDescription>
                    </DialogHeader>

                    {verifyBatch && cuttingTask && (
                        <div className="space-y-4 py-4">
                            {/* Batch Info */}
                            <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg bg-muted/50">
                                <div>
                                    <Label className="text-muted-foreground">Kode Batch</Label>
                                    <p className="font-mono font-medium">{verifyBatch.batchSku}</p>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground">Produk</Label>
                                    <p className="font-medium">{verifyBatch.product.name}</p>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground">Total Roll Bahan</Label>
                                    <p className="font-medium">{verifyBatch.totalRolls} roll</p>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground">Pemotong</Label>
                                    <p className="font-medium">{cuttingTask.assignedTo.name}</p>
                                </div>
                            </div>

                            {/* Cutting Results */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Hasil Pemotongan per Size & Warna</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {/* Table of cutting results */}
                                    {verifyBatch.cuttingResults && verifyBatch.cuttingResults.length > 0 ? (
                                        <>
                                            <div className="border rounded-lg overflow-hidden">
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead>Size</TableHead>
                                                            <TableHead>Warna</TableHead>
                                                            <TableHead className="text-right">Target</TableHead>
                                                            <TableHead className="text-right">Actual Pieces</TableHead>
                                                            <TableHead className="text-right">Selisih</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {verifyBatch.cuttingResults.map((result, idx) => {
                                                            const request = verifyBatch.sizeColorRequests?.find(
                                                                r => r.productSize === result.productSize && r.color === result.color
                                                            )
                                                            const target = request?.requestedPieces || 0
                                                            const diff = result.actualPieces - target
                                                            return (
                                                                <TableRow key={idx}>
                                                                    <TableCell>
                                                                        <Badge variant="outline">{result.productSize}</Badge>
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        <Badge variant="secondary">{result.color}</Badge>
                                                                    </TableCell>
                                                                    <TableCell className="text-right font-medium">
                                                                        {target} pcs
                                                                    </TableCell>
                                                                    <TableCell className="text-right font-bold">
                                                                        {result.actualPieces} pcs
                                                                    </TableCell>
                                                                    <TableCell className="text-right">
                                                                        <span className={diff === 0 ? "text-green-600" : diff > 0 ? "text-blue-600" : "text-red-600"}>
                                                                            {diff > 0 ? '+' : ''}{diff} pcs
                                                                        </span>
                                                                    </TableCell>
                                                                </TableRow>
                                                            )
                                                        })}
                                                        <TableRow className="bg-muted/50 font-bold">
                                                            <TableCell colSpan={2}>Total</TableCell>
                                                            <TableCell className="text-right">
                                                                {verifyBatch.sizeColorRequests?.reduce((sum, r) => sum + r.requestedPieces, 0) || 0} pcs
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                {verifyBatch.cuttingResults.reduce((sum, r) => sum + r.actualPieces, 0)} pcs
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                {verifyBatch.cuttingResults.reduce((sum, r) => sum + r.actualPieces, 0) -
                                                                    (verifyBatch.sizeColorRequests?.reduce((sum, r) => sum + r.requestedPieces, 0) || 0)} pcs
                                                            </TableCell>
                                                        </TableRow>
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="text-center py-8 text-muted-foreground">
                                            Belum ada hasil potongan yang diinput
                                        </div>
                                    )}

                                    {cuttingTask.notes && (
                                        <div className="p-3 bg-muted rounded-lg">
                                            <Label className="text-xs text-muted-foreground">Catatan dari Pemotong</Label>
                                            <p className="text-sm mt-1">{cuttingTask.notes}</p>
                                        </div>
                                    )}
                                    {cuttingTask.completedAt && (
                                        <div>
                                            <Label className="text-xs text-muted-foreground">Waktu Selesai</Label>
                                            <p className="text-sm">{formatDate(cuttingTask.completedAt)}</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Verification Action */}
                            <div className="space-y-3">
                                <Label>Aksi Verifikasi *</Label>
                                <div className="flex gap-4">
                                    <label className="flex items-center space-x-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="verifyAction"
                                            value="approve"
                                            checked={verifyAction === "approve"}
                                            onChange={(e) => setVerifyAction(e.target.value as "approve" | "reject")}
                                            className="w-4 h-4"
                                        />
                                        <span className="text-sm font-medium text-green-600">✓ Approve (Setujui)</span>
                                    </label>
                                    <label className="flex items-center space-x-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="verifyAction"
                                            value="reject"
                                            checked={verifyAction === "reject"}
                                            onChange={(e) => setVerifyAction(e.target.value as "approve" | "reject")}
                                            className="w-4 h-4"
                                        />
                                        <span className="text-sm font-medium text-red-600">✗ Reject (Tolak)</span>
                                    </label>
                                </div>
                            </div>

                            {/* Notes */}
                            <div className="space-y-2">
                                <Label htmlFor="verifyNotes">
                                    Catatan Verifikasi {verifyAction === "reject" && "*"}
                                </Label>
                                <Textarea
                                    id="verifyNotes"
                                    placeholder={verifyAction === "reject"
                                        ? "Jelaskan alasan penolakan..."
                                        : "Tambahkan catatan (opsional)..."
                                    }
                                    value={verifyNotes}
                                    onChange={(e) => setVerifyNotes(e.target.value)}
                                    rows={3}
                                />
                            </div>

                            {verifyAction === "approve" ? (
                                <Alert>
                                    <CheckCircle className="h-4 w-4" />
                                    <AlertDescription>
                                        Dengan approve, batch akan berstatus CUTTING_VERIFIED dan siap untuk tahap selanjutnya (assign to tailor).
                                    </AlertDescription>
                                </Alert>
                            ) : (
                                <Alert variant="destructive">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertDescription>
                                        Dengan reject, batch akan dikembalikan ke status IN_CUTTING untuk diperbaiki oleh pemotong.
                                    </AlertDescription>
                                </Alert>
                            )}
                        </div>
                    )}

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setShowVerifyDialog(false)
                                setVerifyBatch(null)
                                setCuttingTask(null)
                                setVerifyNotes("")
                            }}
                            disabled={verifying}
                        >
                            Batal
                        </Button>
                        <Button
                            onClick={handleVerifyCutting}
                            disabled={verifying || (verifyAction === "reject" && !verifyNotes.trim())}
                            variant={verifyAction === "approve" ? "default" : "destructive"}
                        >
                            {verifying ? "Memverifikasi..." : verifyAction === "approve" ? "Approve" : "Reject"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Input Cutting Results Dialog */}
            <Dialog open={showInputCuttingDialog} onOpenChange={setShowInputCuttingDialog}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Input Hasil Potongan</DialogTitle>
                        <DialogDescription>
                            Input hasil potongan untuk batch yang sudah di-assign ke pemotong
                        </DialogDescription>
                    </DialogHeader>

                    {inputCuttingBatch && (
                        <div className="space-y-4 py-4">
                            {/* Batch Info */}
                            <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg bg-muted/50">
                                <div>
                                    <Label className="text-muted-foreground">Kode Batch</Label>
                                    <p className="font-mono font-medium">{inputCuttingBatch.batchSku}</p>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground">Produk</Label>
                                    <p className="font-medium">{inputCuttingBatch.product.name}</p>
                                </div>
                            </div>

                            {/* Cutting Results by Size & Color */}
                            <div className="space-y-3">
                                <Label>Hasil Potongan per Size & Warna *</Label>
                                <div className="border rounded-lg overflow-hidden">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Size</TableHead>
                                                <TableHead>Warna</TableHead>
                                                <TableHead>Target</TableHead>
                                                <TableHead className="text-right">Actual Pieces</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {cuttingResults.map((result, idx) => {
                                                const request = inputCuttingBatch.sizeColorRequests?.find(
                                                    r => r.productSize === result.productSize && r.color === result.color
                                                )
                                                return (
                                                    <TableRow key={idx}>
                                                        <TableCell className="font-medium">{result.productSize}</TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline">{result.color}</Badge>
                                                        </TableCell>
                                                        <TableCell>{request?.requestedPieces || 0} pcs</TableCell>
                                                        <TableCell className="text-right">
                                                            <Input
                                                                type="number"
                                                                min="0"
                                                                value={result.actualPieces}
                                                                onChange={(e) => {
                                                                    const newResults = [...cuttingResults]
                                                                    newResults[idx].actualPieces = parseInt(e.target.value) || 0
                                                                    setCuttingResults(newResults)
                                                                }}
                                                                className="w-24 text-right"
                                                            />
                                                        </TableCell>
                                                    </TableRow>
                                                )
                                            })}
                                            <TableRow className="font-bold bg-muted/50">
                                                <TableCell colSpan={2}>Total</TableCell>
                                                <TableCell>
                                                    {inputCuttingBatch.sizeColorRequests?.reduce((sum, r) => sum + r.requestedPieces, 0) || 0} pcs
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {cuttingResults.reduce((sum, r) => sum + r.actualPieces, 0)} pcs
                                                </TableCell>
                                            </TableRow>
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>

                            {/* Notes */}
                            <div className="space-y-2">
                                <Label htmlFor="cuttingNotes">Catatan</Label>
                                <Textarea
                                    id="cuttingNotes"
                                    placeholder="Tambahkan catatan hasil potongan (opsional)..."
                                    value={cuttingNotes}
                                    onChange={(e) => setCuttingNotes(e.target.value)}
                                    rows={3}
                                />
                            </div>

                            <Alert>
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>
                                    Setelah menyimpan, hasil potongan akan tercatat dan batch akan berstatus CUTTING_COMPLETED.
                                </AlertDescription>
                            </Alert>
                        </div>
                    )}

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setShowInputCuttingDialog(false)
                                setInputCuttingBatch(null)
                                setCuttingResults([])
                                setCuttingNotes("")
                            }}
                            disabled={submittingCutting}
                        >
                            Batal
                        </Button>
                        <Button
                            onClick={handleSubmitCuttingResults}
                            disabled={submittingCutting || cuttingResults.reduce((sum, r) => sum + r.actualPieces, 0) === 0}
                        >
                            {submittingCutting ? "Menyimpan..." : "Simpan Hasil Potongan"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Assign to Sewer Dialog */}
            <Dialog open={showAssignSewerDialog} onOpenChange={setShowAssignSewerDialog}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Assign ke Penjahit</DialogTitle>
                        <DialogDescription>
                            Pilih penjahit untuk mengerjakan batch ini
                        </DialogDescription>
                    </DialogHeader>

                    {assignSewerBatch && (
                        <div className="space-y-4 py-4">
                            {/* Batch Info */}
                            <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg bg-muted/50">
                                <div>
                                    <Label className="text-muted-foreground">Kode Batch</Label>
                                    <p className="font-mono font-medium">{assignSewerBatch.batchSku}</p>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground">Produk</Label>
                                    <p className="font-medium">{assignSewerBatch.product.name}</p>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground">Total Roll Bahan</Label>
                                    <p className="font-medium">{assignSewerBatch.totalRolls} roll</p>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground">Status</Label>
                                    <Badge>{getStatusLabel(assignSewerBatch.status)}</Badge>
                                </div>
                            </div>

                            {/* Sewer Selection */}
                            <div className="space-y-2">
                                <Label htmlFor="sewer">Pilih Penjahit *</Label>
                                <Select
                                    id="sewer"
                                    value={selectedSewerId}
                                    onChange={(e) => setSelectedSewerId(e.target.value)}
                                >
                                    <option value="">Pilih penjahit</option>
                                    {sewers.map((sewer) => (
                                        <option key={sewer.id} value={sewer.id}>
                                            {sewer.name} ({sewer._count.sewingTasks} task aktif)
                                        </option>
                                    ))}
                                </Select>
                            </div>

                            {/* Notes */}
                            <div className="space-y-2">
                                <Label htmlFor="assignSewerNotes">Catatan (Opsional)</Label>
                                <Textarea
                                    id="assignSewerNotes"
                                    placeholder="Tambahkan catatan untuk penjahit..."
                                    value={assignSewerNotes}
                                    onChange={(e) => setAssignSewerNotes(e.target.value)}
                                    rows={3}
                                />
                            </div>

                            <Alert>
                                <UserPlus className="h-4 w-4" />
                                <AlertDescription>
                                    Setelah di-assign, penjahit akan menerima notifikasi dan dapat mulai mengerjakan batch ini.
                                </AlertDescription>
                            </Alert>
                        </div>
                    )}

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setShowAssignSewerDialog(false)
                                setAssignSewerBatch(null)
                                setSelectedSewerId("")
                                setAssignSewerNotes("")
                            }}
                            disabled={assigningSewer}
                        >
                            Batal
                        </Button>
                        <Button
                            onClick={handleAssignToSewer}
                            disabled={assigningSewer || !selectedSewerId}
                        >
                            {assigningSewer ? "Mengassign..." : "Assign ke Penjahit"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Verify Sewing Dialog */}
            <Dialog open={showVerifySewingDialog} onOpenChange={setShowVerifySewingDialog}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Verifikasi Jahitan</DialogTitle>
                        <DialogDescription>
                            Periksa hasil penjahitan dan approve atau tolak
                        </DialogDescription>
                    </DialogHeader>

                    {verifySewingBatch && sewingTask && (
                        <div className="space-y-4 py-4">
                            {/* Batch Info */}
                            <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg bg-muted/50">
                                <div>
                                    <Label className="text-muted-foreground">Kode Batch</Label>
                                    <p className="font-mono font-medium">{verifySewingBatch.batchSku}</p>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground">Produk</Label>
                                    <p className="font-medium">{verifySewingBatch.product.name}</p>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground">Total Roll Bahan</Label>
                                    <p className="font-medium">{verifySewingBatch.totalRolls} roll</p>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground">Penjahit</Label>
                                    <p className="font-medium">{sewingTask.assignedTo.name}</p>
                                </div>
                            </div>

                            {/* Sewing Results */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Hasil Penjahitan</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <div className="grid grid-cols-3 gap-4">
                                        <div>
                                            <Label className="text-muted-foreground">Pieces Diterima</Label>
                                            <p className="text-2xl font-bold">{sewingTask.piecesReceived}</p>
                                        </div>
                                        <div>
                                            <Label className="text-muted-foreground">Pieces Completed</Label>
                                            <p className="text-2xl font-bold text-green-600">{sewingTask.piecesCompleted}</p>
                                        </div>
                                        <div>
                                            <Label className="text-muted-foreground">Reject Pieces</Label>
                                            <p className="text-2xl font-bold text-red-600">{sewingTask.rejectPieces}</p>
                                        </div>
                                    </div>
                                    {sewingTask.notes && (
                                        <div>
                                            <Label className="text-muted-foreground">Catatan dari Penjahit</Label>
                                            <p className="text-sm mt-1">{sewingTask.notes}</p>
                                        </div>
                                    )}
                                    {sewingTask.completedAt && (
                                        <div>
                                            <Label className="text-muted-foreground">Selesai pada</Label>
                                            <p className="text-sm mt-1">{formatDate(sewingTask.completedAt)}</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Verification Action */}
                            <div className="space-y-3">
                                <Label>Aksi Verifikasi *</Label>
                                <div className="flex gap-4">
                                    <label className="flex items-center space-x-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="verifySewingAction"
                                            value="approve"
                                            checked={verifySewingAction === "approve"}
                                            onChange={(e) => setVerifySewingAction(e.target.value as "approve" | "reject")}
                                            className="w-4 h-4"
                                        />
                                        <span className="text-green-600 font-medium">Approve</span>
                                    </label>
                                    <label className="flex items-center space-x-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="verifySewingAction"
                                            value="reject"
                                            checked={verifySewingAction === "reject"}
                                            onChange={(e) => setVerifySewingAction(e.target.value as "approve" | "reject")}
                                            className="w-4 h-4"
                                        />
                                        <span className="text-red-600 font-medium">Reject</span>
                                    </label>
                                </div>
                            </div>

                            {/* Notes */}
                            <div className="space-y-2">
                                <Label htmlFor="verifySewingNotes">
                                    Catatan Verifikasi {verifySewingAction === "reject" && <span className="text-red-500">*</span>}
                                </Label>
                                <Textarea
                                    id="verifySewingNotes"
                                    placeholder={verifySewingAction === "reject"
                                        ? "Jelaskan alasan penolakan..."
                                        : "Tambahkan catatan (opsional)..."
                                    }
                                    value={verifySewingNotes}
                                    onChange={(e) => setVerifySewingNotes(e.target.value)}
                                    rows={3}
                                />
                            </div>

                            {verifySewingAction === "approve" ? (
                                <Alert>
                                    <CheckCircle className="h-4 w-4" />
                                    <AlertDescription>
                                        Dengan approve, batch akan berstatus SEWING_VERIFIED dan siap untuk tahap selanjutnya (finishing).
                                    </AlertDescription>
                                </Alert>
                            ) : (
                                <Alert variant="destructive">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertDescription>
                                        Dengan reject, batch akan dikembalikan ke status IN_SEWING untuk diperbaiki oleh penjahit.
                                    </AlertDescription>
                                </Alert>
                            )}
                        </div>
                    )}

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setShowVerifySewingDialog(false)
                                setVerifySewingBatch(null)
                                setSewingTask(null)
                                setVerifySewingNotes("")
                            }}
                            disabled={verifyingSewing}
                        >
                            Batal
                        </Button>
                        <Button
                            onClick={handleVerifySewing}
                            disabled={verifyingSewing || (verifySewingAction === "reject" && !verifySewingNotes.trim())}
                            variant={verifySewingAction === "approve" ? "default" : "destructive"}
                        >
                            {verifyingSewing ? "Memverifikasi..." : verifySewingAction === "approve" ? "Approve" : "Reject"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Assign to Finisher Dialog */}
            <Dialog open={showAssignFinisherDialog} onOpenChange={setShowAssignFinisherDialog}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Assign ke Finisher</DialogTitle>
                        <DialogDescription>
                            Pilih finisher untuk mengerjakan batch ini
                        </DialogDescription>
                    </DialogHeader>

                    {assignFinisherBatch && (
                        <div className="space-y-4 py-4">
                            {/* Batch Info */}
                            <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg bg-muted/50">
                                <div>
                                    <p className="text-sm text-muted-foreground">Batch SKU</p>
                                    <p className="font-medium font-mono">{assignFinisherBatch.batchSku}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Produk</p>
                                    <p className="font-medium">{assignFinisherBatch.product.name}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Total Roll Bahan</p>
                                    <p className="font-medium">{assignFinisherBatch.totalRolls} roll</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Status</p>
                                    <p className="font-medium">{getStatusLabel(assignFinisherBatch.status)}</p>
                                </div>
                            </div>

                            {/* Finisher Selection */}
                            <div className="space-y-2">
                                <Label htmlFor="finisher">Pilih Finisher *</Label>
                                <Select
                                    id="finisher"
                                    value={selectedFinisherId}
                                    onChange={(e) => setSelectedFinisherId(e.target.value)}
                                >
                                    <option value="">Pilih finisher</option>
                                    {finishers.map((finisher) => (
                                        <option key={finisher.id} value={finisher.id}>
                                            {finisher.name} ({finisher._count.finishingTasks} active tasks)
                                        </option>
                                    ))}
                                </Select>
                            </div>

                            {/* Notes */}
                            <div className="space-y-2">
                                <Label htmlFor="assignFinisherNotes">Catatan (Opsional)</Label>
                                <Textarea
                                    id="assignFinisherNotes"
                                    placeholder="Tambahkan catatan untuk finisher..."
                                    value={assignFinisherNotes}
                                    onChange={(e) => setAssignFinisherNotes(e.target.value)}
                                    rows={3}
                                />
                            </div>

                            <Alert>
                                <UserPlus className="h-4 w-4" />
                                <AlertDescription>
                                    Setelah di-assign, finisher akan menerima notifikasi dan dapat mulai mengerjakan batch ini.
                                </AlertDescription>
                            </Alert>
                        </div>
                    )}

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setShowAssignFinisherDialog(false)
                                setAssignFinisherBatch(null)
                                setSelectedFinisherId("")
                                setAssignFinisherNotes("")
                            }}
                            disabled={assigningFinisher}
                        >
                            Batal
                        </Button>
                        <Button
                            onClick={handleAssignToFinisher}
                            disabled={assigningFinisher || !selectedFinisherId}
                        >
                            {assigningFinisher ? "Mengassign..." : "Assign ke Finisher"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

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
                <TabsList className="grid w-full grid-cols-5">
                    {Object.entries(STATUS_GROUPS).map(([key, group]) => {
                        const stats = getGroupStats(group.statuses)
                        const Icon = group.icon
                        return (
                            <TabsTrigger key={key} value={key} className="relative">
                                <Icon className={`h-4 w-4 mr-2 ${group.color}`} />
                                <span className="hidden sm:inline">{group.label}</span>
                                <span className="sm:hidden">{group.label.substring(0, 4)}</span>
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
                    const filteredGroupBatches = filterBatches(group.statuses)
                    const stats = getGroupStats(group.statuses)

                    return (
                        <TabsContent key={key} value={key} className="space-y-4">
                            {/* Stats Cards */}
                            <div className="grid gap-4 md:grid-cols-3">
                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">Total Batch</CardTitle>
                                        <Package className="h-4 w-4 text-muted-foreground" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">{stats.total}</div>
                                        <p className="text-xs text-muted-foreground">
                                            {stats.total} batch
                                        </p>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">Total Roll</CardTitle>
                                        <Package className="h-4 w-4 text-muted-foreground" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">{stats.totalRolls}</div>
                                        <p className="text-xs text-muted-foreground">
                                            Roll bahan
                                        </p>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">Total Produksi</CardTitle>
                                        <TrendingUp className="h-4 w-4 text-green-600" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold text-green-600">{stats.totalPieces}</div>
                                        <p className="text-xs text-muted-foreground">
                                            Pcs diproduksi
                                        </p>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Batches Table */}
                            <Card className="bg-accent/5">
                                <CardHeader>
                                    <CardTitle>Batch {group.label}</CardTitle>
                                    <CardDescription>
                                        {filteredGroupBatches.length} batch{filteredGroupBatches.length !== 1 ? 'es' : ''} dalam tahap {group.label.toLowerCase()}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {filteredGroupBatches.length === 0 ? (
                                        <div className="text-center py-12 text-muted-foreground">
                                            <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                            <p>Tidak ada batch dalam tahap ini</p>
                                        </div>
                                    ) : (
                                        <>
                                            {/* Desktop Table View */}
                                            <div className="hidden md:block rounded-md border">
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead>Kode Batch</TableHead>
                                                            <TableHead>Produk</TableHead>
                                                            <TableHead>Rolls/Pieces</TableHead>
                                                            <TableHead>Tanggal</TableHead>
                                                            <TableHead>Status</TableHead>
                                                            <TableHead className="text-right">Aksi</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {filteredGroupBatches.map((batch) => (
                                                            <Fragment key={batch.id}>
                                                                <TableRow>
                                                                    <TableCell>
                                                                        <div className="flex items-center gap-2">
                                                                            {["CUTTING_VERIFIED", "ASSIGNED_TO_SEWER", "SEWING_IN_PROGRESS", "SEWING_COMPLETED", "SEWING_VERIFIED", "ASSIGNED_TO_FINISHING", "FINISHING_IN_PROGRESS", "FINISHING_COMPLETED", "VERIFIED_READY", "COMPLETED"].includes(batch.status) && (
                                                                                <Button
                                                                                    variant="ghost"
                                                                                    size="sm"
                                                                                    className="h-6 w-6 p-0"
                                                                                    onClick={() => toggleBatchExpand(batch.id)}
                                                                                >
                                                                                    {expandedBatches.has(batch.id) ? (
                                                                                        <ChevronDown className="h-4 w-4" />
                                                                                    ) : (
                                                                                        <ChevronRight className="h-4 w-4" />
                                                                                    )}
                                                                                </Button>
                                                                            )}
                                                                            <span
                                                                                className="font-mono text-sm font-medium cursor-pointer hover:text-primary hover:underline"
                                                                                onClick={() => router.push(`/production/batch/${batch.id}`)}
                                                                            >
                                                                                {batch.batchSku}
                                                                            </span>
                                                                        </div>
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        {batch.product.name}
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        <div className="flex flex-col">
                                                                            <span className="font-medium">{batch.totalRolls} roll</span>
                                                                            {batch.actualQuantity !== null && batch.actualQuantity > 0 && (
                                                                                <span className="text-xs text-green-600">
                                                                                    → {batch.actualQuantity} pcs
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </TableCell>
                                                                    <TableCell className="text-sm text-muted-foreground">
                                                                        {formatDate(batch.createdAt)}
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        <Badge>{getStatusLabel(batch.status)}</Badge>
                                                                    </TableCell>
                                                                    <TableCell className="text-right">
                                                                        <div className="flex items-center justify-end gap-2">
                                                                            {["PENDING"].includes(batch.status) && (
                                                                                <Button
                                                                                    size="sm"
                                                                                    onClick={() => openConfirmDialog(batch)}
                                                                                >
                                                                                    <CheckCircle className="h-4 w-4 mr-1" />
                                                                                    Konfirmasi
                                                                                </Button>
                                                                            )}
                                                                            {batch.status === "MATERIAL_ALLOCATED" && (
                                                                                <Button
                                                                                    size="sm"
                                                                                    variant="default"
                                                                                    onClick={() => openAssignDialog(batch)}
                                                                                >
                                                                                    <UserPlus className="h-4 w-4 mr-1" />
                                                                                    Assign Pemotong
                                                                                </Button>
                                                                            )}
                                                                            {["ASSIGNED_TO_CUTTER", "CUTTING_IN_PROGRESS"].includes(batch.status) && (
                                                                                <Button
                                                                                    size="sm"
                                                                                    variant="outline"
                                                                                    onClick={() => openInputCuttingDialog(batch)}
                                                                                >
                                                                                    <Scissors className="h-4 w-4 mr-1" />
                                                                                    Input Hasil
                                                                                </Button>
                                                                            )}
                                                                            {batch.status === "CUTTING_COMPLETED" && (
                                                                                <Button
                                                                                    size="sm"
                                                                                    variant="default"
                                                                                    onClick={() => openVerifyDialog(batch)}
                                                                                >
                                                                                    <CheckCircle className="h-4 w-4 mr-1" />
                                                                                    Verifikasi
                                                                                </Button>
                                                                            )}
                                                                            {batch.status === "CUTTING_VERIFIED" && (
                                                                                <Button
                                                                                    size="sm"
                                                                                    variant="default"
                                                                                    onClick={() => openSubBatchDialog(batch)}
                                                                                >
                                                                                    <UserPlus className="h-4 w-4 mr-1" />
                                                                                    Assign Penjahit
                                                                                </Button>
                                                                            )}
                                                                            {batch.status === "SEWING_COMPLETED" && (
                                                                                <Button
                                                                                    size="sm"
                                                                                    variant="default"
                                                                                    onClick={() => openVerifySewingDialog(batch)}
                                                                                >
                                                                                    <CheckCircle className="h-4 w-4 mr-1" />
                                                                                    Verifikasi
                                                                                </Button>
                                                                            )}
                                                                            {batch.status === "SEWING_VERIFIED" && (
                                                                                <Button
                                                                                    size="sm"
                                                                                    variant="default"
                                                                                    onClick={() => openAssignFinisherDialog(batch)}
                                                                                >
                                                                                    <UserPlus className="h-4 w-4 mr-1" />
                                                                                    Assign Finisher
                                                                                </Button>
                                                                            )}
                                                                            <Button
                                                                                variant="ghost"
                                                                                size="sm"
                                                                                onClick={() => router.push(`/production/batch/${batch.id}`)}
                                                                            >
                                                                                <Eye className="h-4 w-4" />
                                                                            </Button>
                                                                        </div>
                                                                    </TableCell>
                                                                </TableRow>

                                                                {/* Sub-Batches Row */}
                                                                {expandedBatches.has(batch.id) && (
                                                                    <TableRow>
                                                                        <TableCell colSpan={6} className="bg-muted/30 p-0">
                                                                            <div className="p-4">
                                                                                <h4 className="font-semibold mb-3 flex items-center gap-2">
                                                                                    <Package className="h-4 w-4" />
                                                                                    Sub-Batch
                                                                                </h4>
                                                                                {loadingSubBatches.has(batch.id) ? (
                                                                                    <div className="text-center py-4">
                                                                                        <SpinnerCustom />
                                                                                    </div>
                                                                                ) : batch.subBatches && batch.subBatches.length > 0 ? (
                                                                                    <div className="space-y-3">
                                                                                        {batch.subBatches.map((subBatch) => (
                                                                                            <div
                                                                                                key={subBatch.id}
                                                                                                className="border rounded-lg p-3 bg-background hover:bg-accent/10 transition-colors"
                                                                                            >
                                                                                                <div className="flex items-start justify-between mb-2">
                                                                                                    <div>
                                                                                                        <p className="font-mono text-sm font-semibold text-primary">
                                                                                                            {subBatch.subBatchSku}
                                                                                                        </p>
                                                                                                        {subBatch.items && subBatch.items.length > 0 && (
                                                                                                            <p className="text-xs text-muted-foreground">
                                                                                                                {subBatch.items.map(item => `${item.productSize}-${item.color}`).join(', ')}
                                                                                                            </p>
                                                                                                        )}
                                                                                                    </div>
                                                                                                    {getSubBatchStatusBadge(subBatch.status)}
                                                                                                </div>

                                                                                                <div className="grid grid-cols-4 gap-2 text-sm">
                                                                                                    <div>
                                                                                                        <p className="text-xs text-muted-foreground">Di-assign</p>
                                                                                                        <p className="font-semibold">{subBatch.piecesAssigned} pcs</p>
                                                                                                    </div>
                                                                                                    <div>
                                                                                                        <p className="text-xs text-muted-foreground">Jahitan</p>
                                                                                                        <p className="font-semibold text-blue-600">{subBatch.sewingOutput} pcs</p>
                                                                                                    </div>
                                                                                                    <div>
                                                                                                        <p className="text-xs text-muted-foreground">Finishing</p>
                                                                                                        <p className="font-semibold text-green-600">{subBatch.finishingOutput} pcs</p>
                                                                                                    </div>
                                                                                                    <div>
                                                                                                        <p className="text-xs text-muted-foreground">Total Reject</p>
                                                                                                        <p className="font-semibold text-red-600">{subBatch.sewingReject + subBatch.finishingReject} pcs</p>
                                                                                                    </div>
                                                                                                </div>

                                                                                                {/* Assigned Workers */}
                                                                                                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                                                                                                    {subBatch.assignedSewer && (
                                                                                                        <div className="flex items-center gap-1 text-muted-foreground">
                                                                                                            <Users className="h-3 w-3" />
                                                                                                            <span>{subBatch.assignedSewer.name}</span>
                                                                                                            <Badge variant="outline" className="text-xs">Penjahit</Badge>
                                                                                                        </div>
                                                                                                    )}
                                                                                                    {subBatch.assignedFinisher && (
                                                                                                        <div className="flex items-center gap-1 text-muted-foreground">
                                                                                                            <Users className="h-3 w-3" />
                                                                                                            <span>{subBatch.assignedFinisher.name}</span>
                                                                                                            <Badge variant="outline" className="text-xs">Finisher</Badge>
                                                                                                        </div>
                                                                                                    )}
                                                                                                </div>

                                                                                                {/* Sub-Batch Items */}
                                                                                                {subBatch.items && subBatch.items.length > 0 && (
                                                                                                    <div className="mt-3 pt-3 border-t">
                                                                                                        <p className="text-xs font-semibold mb-2">Items:</p>
                                                                                                        <div className="grid grid-cols-2 gap-2">
                                                                                                            {subBatch.items.map((item) => (
                                                                                                                <div
                                                                                                                    key={item.id}
                                                                                                                    className="flex items-center justify-between text-xs bg-muted/50 rounded px-2 py-1"
                                                                                                                >
                                                                                                                    <span>{item.productSize} - {item.color}</span>
                                                                                                                    <span className="font-semibold">{item.pieces} pcs</span>
                                                                                                                </div>
                                                                                                            ))}
                                                                                                        </div>
                                                                                                    </div>
                                                                                                )}
                                                                                            </div>
                                                                                        ))}
                                                                                    </div>
                                                                                ) : (
                                                                                    <p className="text-sm text-muted-foreground text-center py-4">
                                                                                        Belum ada sub-batch
                                                                                    </p>
                                                                                )}
                                                                            </div>
                                                                        </TableCell>
                                                                    </TableRow>
                                                                )}
                                                            </Fragment>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </div>

                                            {/* Mobile Card View */}
                                            <div className="md:hidden space-y-4">
                                                {filteredGroupBatches.map((batch) => (
                                                    <Card key={batch.id} className="overflow-hidden">
                                                        <CardHeader className="pb-3">
                                                            <div className="flex items-start justify-between">
                                                                <div className="flex items-start gap-2 flex-1">
                                                                    {["CUTTING_VERIFIED", "ASSIGNED_TO_SEWER", "SEWING_IN_PROGRESS", "SEWING_COMPLETED", "SEWING_VERIFIED", "ASSIGNED_TO_FINISHING", "FINISHING_IN_PROGRESS", "FINISHING_COMPLETED", "VERIFIED_READY", "COMPLETED"].includes(batch.status) && (
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            className="h-6 w-6 p-0 mt-1"
                                                                            onClick={() => toggleBatchExpand(batch.id)}
                                                                        >
                                                                            {expandedBatches.has(batch.id) ? (
                                                                                <ChevronDown className="h-4 w-4" />
                                                                            ) : (
                                                                                <ChevronRight className="h-4 w-4" />
                                                                            )}
                                                                        </Button>
                                                                    )}
                                                                    <div className="space-y-1 flex-1">
                                                                        <CardTitle
                                                                            className="text-base font-mono cursor-pointer hover:text-primary"
                                                                            onClick={() => router.push(`/production/batch/${batch.id}`)}
                                                                        >
                                                                            {batch.batchSku}
                                                                        </CardTitle>
                                                                        <CardDescription className="text-sm">
                                                                            {batch.product.name}
                                                                        </CardDescription>
                                                                    </div>
                                                                </div>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => router.push(`/production/batch/${batch.id}`)}
                                                                >
                                                                    <Eye className="h-4 w-4" />
                                                                </Button>
                                                            </div>
                                                        </CardHeader>
                                                        <CardContent className="space-y-3">
                                                            <div className="grid grid-cols-2 gap-2 text-sm">
                                                                <div>
                                                                    <p className="text-muted-foreground text-xs">Total Roll</p>
                                                                    <p className="font-medium">{batch.totalRolls} roll</p>
                                                                </div>
                                                                <div>
                                                                    <p className="text-muted-foreground text-xs">Hasil</p>
                                                                    <p className="font-medium text-green-600">{batch.actualQuantity || 0} pcs</p>
                                                                </div>
                                                            </div>
                                                            <div className="flex flex-wrap gap-2">
                                                                <Badge>{getStatusLabel(batch.status)}</Badge>
                                                            </div>
                                                            <div className="flex flex-col gap-2 pt-2">
                                                                {["PENDING"].includes(batch.status) && (
                                                                    <Button
                                                                        size="sm"
                                                                        className="w-full"
                                                                        onClick={() => openConfirmDialog(batch)}
                                                                    >
                                                                        <CheckCircle className="h-4 w-4 mr-2" />
                                                                        Konfirmasi
                                                                    </Button>
                                                                )}
                                                                {batch.status === "MATERIAL_ALLOCATED" && (
                                                                    <Button
                                                                        size="sm"
                                                                        className="w-full"
                                                                        onClick={() => openAssignDialog(batch)}
                                                                    >
                                                                        <UserPlus className="h-4 w-4 mr-2" />
                                                                        Assign Pemotong
                                                                    </Button>
                                                                )}
                                                                {["ASSIGNED_TO_CUTTER", "CUTTING_IN_PROGRESS"].includes(batch.status) && (
                                                                    <Button
                                                                        size="sm"
                                                                        variant="outline"
                                                                        className="w-full"
                                                                        onClick={() => openInputCuttingDialog(batch)}
                                                                    >
                                                                        <Scissors className="h-4 w-4 mr-2" />
                                                                        Input Hasil Potongan
                                                                    </Button>
                                                                )}
                                                                {batch.status === "CUTTING_COMPLETED" && (
                                                                    <Button
                                                                        size="sm"
                                                                        className="w-full"
                                                                        onClick={() => openVerifyDialog(batch)}
                                                                    >
                                                                        <CheckCircle className="h-4 w-4 mr-2" />
                                                                        Verifikasi Potongan
                                                                    </Button>
                                                                )}
                                                                {batch.status === "CUTTING_VERIFIED" && (
                                                                    <Button
                                                                        size="sm"
                                                                        className="w-full"
                                                                        onClick={() => openSubBatchDialog(batch)}
                                                                    >
                                                                        <UserPlus className="h-4 w-4 mr-2" />
                                                                        Assign Penjahit
                                                                    </Button>
                                                                )}
                                                                {batch.status === "SEWING_COMPLETED" && (
                                                                    <Button
                                                                        size="sm"
                                                                        className="w-full"
                                                                        onClick={() => openVerifySewingDialog(batch)}
                                                                    >
                                                                        <CheckCircle className="h-4 w-4 mr-2" />
                                                                        Verifikasi Jahitan
                                                                    </Button>
                                                                )}
                                                                {batch.status === "SEWING_VERIFIED" && (
                                                                    <Button
                                                                        size="sm"
                                                                        className="w-full"
                                                                        onClick={() => openAssignFinisherDialog(batch)}
                                                                    >
                                                                        <UserPlus className="h-4 w-4 mr-2" />
                                                                        Assign Finisher
                                                                    </Button>
                                                                )}
                                                            </div>

                                                            {/* Sub-Batches Mobile */}
                                                            {expandedBatches.has(batch.id) && (
                                                                <div className="mt-4 pt-4 border-t">
                                                                    <h4 className="font-semibold mb-3 flex items-center gap-2 text-sm">
                                                                        <Package className="h-4 w-4" />
                                                                        Sub-Batch
                                                                    </h4>
                                                                    {loadingSubBatches.has(batch.id) ? (
                                                                        <div className="text-center py-4">
                                                                            <SpinnerCustom />
                                                                        </div>
                                                                    ) : batch.subBatches && batch.subBatches.length > 0 ? (
                                                                        <div className="space-y-3">
                                                                            {batch.subBatches.map((subBatch) => (
                                                                                <div
                                                                                    key={subBatch.id}
                                                                                    className="border rounded-lg p-3 bg-muted/20"
                                                                                >
                                                                                    <div className="flex items-start justify-between mb-2">
                                                                                        <div>
                                                                                            <p className="font-mono text-sm font-semibold text-primary">
                                                                                                {subBatch.subBatchSku}
                                                                                            </p>
                                                                                            {subBatch.items && subBatch.items.length > 0 && (
                                                                                                <p className="text-xs text-muted-foreground">
                                                                                                    {subBatch.items.map(item => `${item.productSize}-${item.color}`).join(', ')}
                                                                                                </p>
                                                                                            )}
                                                                                        </div>
                                                                                        {getSubBatchStatusBadge(subBatch.status)}
                                                                                    </div>

                                                                                    <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                                                                                        <div>
                                                                                            <p className="text-muted-foreground">Di-assign</p>
                                                                                            <p className="font-semibold">{subBatch.piecesAssigned}</p>
                                                                                        </div>
                                                                                        <div>
                                                                                            <p className="text-muted-foreground">Jahitan</p>
                                                                                            <p className="font-semibold text-blue-600">{subBatch.sewingOutput}</p>
                                                                                        </div>
                                                                                        <div>
                                                                                            <p className="text-muted-foreground">Finishing</p>
                                                                                            <p className="font-semibold text-green-600">{subBatch.finishingOutput}</p>
                                                                                        </div>
                                                                                        <div>
                                                                                            <p className="text-muted-foreground">Reject</p>
                                                                                            <p className="font-semibold text-red-600">{subBatch.sewingReject + subBatch.finishingReject}</p>
                                                                                        </div>
                                                                                    </div>

                                                                                    {/* Workers */}
                                                                                    <div className="flex flex-col gap-1 text-xs mb-2">
                                                                                        {subBatch.assignedSewer && (
                                                                                            <div className="flex items-center gap-1 text-muted-foreground">
                                                                                                <Users className="h-3 w-3" />
                                                                                                <span>{subBatch.assignedSewer.name}</span>
                                                                                                <Badge variant="outline" className="text-xs">Penjahit</Badge>
                                                                                            </div>
                                                                                        )}
                                                                                        {subBatch.assignedFinisher && (
                                                                                            <div className="flex items-center gap-1 text-muted-foreground">
                                                                                                <Users className="h-3 w-3" />
                                                                                                <span>{subBatch.assignedFinisher.name}</span>
                                                                                                <Badge variant="outline" className="text-xs">Finisher</Badge>
                                                                                            </div>
                                                                                        )}
                                                                                    </div>

                                                                                    {/* Items */}
                                                                                    {subBatch.items && subBatch.items.length > 0 && (
                                                                                        <div className="mt-2 pt-2 border-t">
                                                                                            <p className="text-xs font-semibold mb-1">Items:</p>
                                                                                            <div className="space-y-1">
                                                                                                {subBatch.items.map((item) => (
                                                                                                    <div
                                                                                                        key={item.id}
                                                                                                        className="flex items-center justify-between text-xs bg-background rounded px-2 py-1"
                                                                                                    >
                                                                                                        <span>{item.productSize} - {item.color}</span>
                                                                                                        <span className="font-semibold">{item.pieces} pcs</span>
                                                                                                    </div>
                                                                                                ))}
                                                                                            </div>
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    ) : (
                                                                        <p className="text-sm text-muted-foreground text-center py-4">
                                                                            Belum ada sub-batch
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </CardContent>
                                                    </Card>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>
                    )
                })}
            </Tabs>
        </div >
    )
}
