"use client"

import { useState } from "react"
import { Search, Plus } from "lucide-react"
import { Header } from "@/components/layout/header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"

type StockType = "Bahan Baku" | "Produk Jadi" | "Produk Gagal"
type Unit = "Pcs" | "Roll"

interface Stock {
    id: number
    name: string
    type: StockType
    quantity: number
    unit: Unit
}

export default function StocksPage() {
    const [stocks, setStocks] = useState<Stock[]>([])
    const [searchQuery, setSearchQuery] = useState("")
    const [activeFilter, setActiveFilter] = useState<StockType | "Semua">("Semua")
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [currentPage, setCurrentPage] = useState(1)

    // Form state
    const [formData, setFormData] = useState({
        name: "",
        type: "Bahan Baku" as StockType,
        quantity: 0,
        unit: "Pcs" as Unit,
    })

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        const newStock: Stock = {
            id: stocks.length + 1,
            ...formData,
        }
        setStocks([...stocks, newStock])
        setIsDialogOpen(false)
        setFormData({
            name: "",
            type: "Bahan Baku",
            quantity: 0,
            unit: "Pcs",
        })
    }

    const filteredStocks = stocks.filter((stock) => {
        const matchesSearch = stock.name
            .toLowerCase()
            .includes(searchQuery.toLowerCase())
        const matchesFilter =
            activeFilter === "Semua" || stock.type === activeFilter
        return matchesSearch && matchesFilter
    })

    const filters: Array<StockType | "Semua"> = [
        "Semua",
        "Bahan Baku",
        "Produk Jadi",
        "Produk Gagal",
    ]

    return (
        <div className="h-full">
            <Header breadcrumbs={[{ label: "Stok" }]} />

            <div className="p-6 space-y-4">
                {/* Search and Add Button */}
                <div className="flex items-center justify-between gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            placeholder="Cari Product..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10"
                        />
                    </div>

                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="h-4 w-4 mr-2" />
                                Input Stok
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Input Stok</DialogTitle>
                                <DialogDescription>
                                    Silakan masukkan informasi stok.
                                </DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="name">Nama</Label>
                                        <Input
                                            id="name"
                                            value={formData.name}
                                            onChange={(e) =>
                                                setFormData({ ...formData, name: e.target.value })
                                            }
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="type">Tipe</Label>
                                        <Select
                                            id="type"
                                            value={formData.type}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    type: e.target.value as StockType,
                                                })
                                            }
                                        >
                                            <option value="Bahan Baku">Bahan Baku</option>
                                            <option value="Produk Jadi">Produk Jadi</option>
                                            <option value="Produk Gagal">Produk Gagal</option>
                                        </Select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="quantity">Stok Qty</Label>
                                        <Input
                                            id="quantity"
                                            type="number"
                                            value={formData.quantity}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    quantity: parseInt(e.target.value) || 0,
                                                })
                                            }
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="unit">Satuan</Label>
                                        <Select
                                            id="unit"
                                            value={formData.unit}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    unit: e.target.value as Unit,
                                                })
                                            }
                                        >
                                            <option value="Pcs">Pcs</option>
                                            <option value="Roll">Roll</option>
                                        </Select>
                                    </div>
                                </div>
                                <Button type="submit" className="w-full">
                                    Simpan
                                </Button>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>

                {/* Filters */}
                <div className="flex gap-2">
                    {filters.map((filter) => (
                        <Button
                            key={filter}
                            variant={activeFilter === filter ? "default" : "outline"}
                            onClick={() => setActiveFilter(filter)}
                            size="sm"
                        >
                            {filter}
                        </Button>
                    ))}
                </div>

                {/* Table */}
                <div className="border rounded-lg">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nama</TableHead>
                                <TableHead>Tipe</TableHead>
                                <TableHead>Stok Qty</TableHead>
                                <TableHead>Satuan</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredStocks.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                                        Tidak ada data
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredStocks.map((stock) => (
                                    <TableRow key={stock.id}>
                                        <TableCell>{stock.name}</TableCell>
                                        <TableCell>{stock.type}</TableCell>
                                        <TableCell>{stock.quantity}</TableCell>
                                        <TableCell>{stock.unit}</TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                        Halaman {currentPage} dari {Math.max(1, Math.ceil(filteredStocks.length / 10))}
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(currentPage - 1)}
                        >
                            Prev
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={
                                currentPage >= Math.max(1, Math.ceil(filteredStocks.length / 10))
                            }
                            onClick={() => setCurrentPage(currentPage + 1)}
                        >
                            Next
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}
