"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, Edit, Plus, Search, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

// Types
type ProductionStatus = "in_progress" | "completed" | "cancelled";

interface Production {
    id: number;
    batch_code: string;
    created_date: string;
    finish_date: string;
    target: number;
    status: ProductionStatus;
}

// Mock data for product detail
const productData = {
    1: {
        id: 1,
        name: "Test Product",
        description: "This is a test product",
        image: "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=500",
        price: 90000,
        status: "active",
        sku: "TEST-PRODUCT-001",
        productions: [
            {
                id: 1,
                batch_code: "GAMIS-001",
                created_date: "1 Desember 2025 pukul 14.54",
                finish_date: "-",
                target: 100,
                status: "in_progress" as ProductionStatus,
            },
        ],
    },
    2: {
        id: 2,
        name: "Sample Gamis",
        description: "High quality gamis product",
        image: "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=500",
        price: 150000,
        status: "active",
        sku: "GAMIS-001",
        productions: [
            {
                id: 1,
                batch_code: "GAMIS-002",
                created_date: "15 November 2025 pukul 10.30",
                finish_date: "20 November 2025",
                target: 50,
                status: "completed" as ProductionStatus,
            },
        ],
    },
    3: {
        id: 3,
        name: "Premium Jilbab",
        description: "Premium jilbab with high quality materials",
        image: "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=500",
        price: 75000,
        status: "active",
        sku: "JILBAB-001",
        productions: [],
    },
};

export default function ProductDetailPage() {
    const params = useParams();
    const productId = Number(params.id);
    const product = productData[productId as keyof typeof productData];

    const [productions, setProductions] = useState<Production[]>(product?.productions || []);
    const [searchQuery, setSearchQuery] = useState("");
    const [sortField, setSortField] = useState<keyof Production | null>(null);
    const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [newProduction, setNewProduction] = useState({
        batch_code: "",
        target: 0,
        notes: "",
    });

    if (!product) {
        return (
            <div className="p-6">
                <div className="text-center">
                    <h1 className="text-2xl font-bold mb-4">Produk tidak ditemukan</h1>
                    <Link href="/owner/products">
                        <Button variant="outline">
                            <ChevronLeft className="h-4 w-4 mr-2" />
                            Kembali ke Daftar Produk
                        </Button>
                    </Link>
                </div>
            </div>
        );
    }

    const handleSort = (field: keyof Production) => {
        if (sortField === field) {
            setSortDirection(sortDirection === "asc" ? "desc" : "asc");
        } else {
            setSortField(field);
            setSortDirection("asc");
        }
    };

    const handleAddProduction = () => {
        const production: Production = {
            id: productions.length + 1,
            batch_code: newProduction.batch_code,
            created_date: new Date().toLocaleDateString("id-ID", {
                day: "numeric",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
            }),
            finish_date: "-",
            target: newProduction.target,
            status: "in_progress",
        };

        setProductions([...productions, production]);
        setIsAddDialogOpen(false);
        setNewProduction({ batch_code: "", target: 0, notes: "" });
    };

    const filteredProductions = productions.filter((production) =>
        production.batch_code.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const sortedProductions = [...filteredProductions].sort((a, b) => {
        if (!sortField) return 0;

        const aValue = a[sortField];
        const bValue = b[sortField];

        if (typeof aValue === "string" && typeof bValue === "string") {
            return sortDirection === "asc"
                ? aValue.localeCompare(bValue)
                : bValue.localeCompare(aValue);
        }

        if (typeof aValue === "number" && typeof bValue === "number") {
            return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
        }

        return 0;
    });

    const getStatusBadge = (status: string) => {
        const statusMap = {
            active: { label: "Active", variant: "default" as const },
            inactive: { label: "Inactive", variant: "secondary" as const },
            in_progress: { label: "In Progress", variant: "default" as const },
            completed: { label: "Completed", variant: "default" as const },
            cancelled: { label: "Cancelled", variant: "destructive" as const },
        };

        const statusInfo = statusMap[status as keyof typeof statusMap] || statusMap.active;
        return (
            <Badge variant={statusInfo.variant}>
                {statusInfo.label}
            </Badge>
        );
    };

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat("id-ID", {
            style: "currency",
            currency: "IDR",
            minimumFractionDigits: 0,
        }).format(price);
    };

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Link href="/owner/products" className="hover:text-foreground flex items-center">
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Products
                </Link>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                {/* Product Info Card */}
                <Card className="lg:col-span-3">
                    <CardHeader>
                        <div className="flex justify-between items-start">
                            <div className="space-y-1">
                                <CardTitle>{product.name}</CardTitle>
                                <CardDescription>{product.description}</CardDescription>
                            </div>
                            <Button variant="ghost" size="icon">
                                <Edit className="h-4 w-4" />
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Product Image */}
                        <div className="relative w-full aspect-3/4">
                            <Image
                                src={product.image}
                                alt={product.name}
                                fill
                                className="rounded-lg object-cover"
                            />
                        </div>

                        <Separator />

                        {/* Product Details */}
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-medium text-muted-foreground">Price</span>
                                <span className="text-xl font-bold">{formatPrice(product.price)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-medium text-muted-foreground">Status</span>
                                {getStatusBadge(product.status)}
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-medium text-muted-foreground">SKU</span>
                                <span className="font-mono text-sm font-medium">{product.sku}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Production Section */}
                <Card className="lg:col-span-4">
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <div>
                                <CardTitle>Production Batches</CardTitle>
                                <CardDescription>
                                    Manage production batches for this product
                                </CardDescription>
                            </div>
                            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button>
                                        <Plus className="h-4 w-4 mr-2" />
                                        Add Production
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Add New Production Batch</DialogTitle>
                                        <DialogDescription>
                                            Create a new production batch for this product
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4 py-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="batch_code">Batch Code</Label>
                                            <Input
                                                id="batch_code"
                                                placeholder="Enter batch code"
                                                value={newProduction.batch_code}
                                                onChange={(e) => setNewProduction({ ...newProduction, batch_code: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="target">Target (PCS)</Label>
                                            <Input
                                                id="target"
                                                type="number"
                                                placeholder="Enter production target"
                                                value={newProduction.target || ""}
                                                onChange={(e) => setNewProduction({ ...newProduction, target: Number(e.target.value) })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="notes">Notes</Label>
                                            <Textarea
                                                id="notes"
                                                placeholder="Additional notes (optional)"
                                                value={newProduction.notes}
                                                onChange={(e) => setNewProduction({ ...newProduction, notes: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div className="flex justify-end gap-2">
                                        <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                                            Cancel
                                        </Button>
                                        <Button onClick={handleAddProduction}>
                                            Save
                                        </Button>
                                    </div>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Search */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search production..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10"
                            />
                        </div>

                        {/* Production Table */}
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead
                                            className="cursor-pointer hover:bg-muted"
                                            onClick={() => handleSort("batch_code")}
                                        >
                                            <div className="flex items-center">
                                                Batch Code
                                                <ChevronsUpDown className="ml-2 h-4 w-4" />
                                            </div>
                                        </TableHead>
                                        <TableHead
                                            className="cursor-pointer hover:bg-muted"
                                            onClick={() => handleSort("created_date")}
                                        >
                                            <div className="flex items-center">
                                                Created Date
                                                <ChevronsUpDown className="ml-2 h-4 w-4" />
                                            </div>
                                        </TableHead>
                                        <TableHead>Finish Date</TableHead>
                                        <TableHead
                                            className="cursor-pointer hover:bg-muted"
                                            onClick={() => handleSort("target")}
                                        >
                                            <div className="flex items-center">
                                                Target (PCS)
                                                <ChevronsUpDown className="ml-2 h-4 w-4" />
                                            </div>
                                        </TableHead>
                                        <TableHead
                                            className="cursor-pointer hover:bg-muted"
                                            onClick={() => handleSort("status")}
                                        >
                                            <div className="flex items-center">
                                                Status
                                                <ChevronsUpDown className="ml-2 h-4 w-4" />
                                            </div>
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {sortedProductions.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                                No production data available
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        sortedProductions.map((production) => (
                                            <TableRow key={production.id}>
                                                <TableCell className="font-medium">{production.batch_code}</TableCell>
                                                <TableCell>{production.created_date}</TableCell>
                                                <TableCell>{production.finish_date}</TableCell>
                                                <TableCell>{production.target}</TableCell>
                                                <TableCell>{getStatusBadge(production.status)}</TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>

                        {/* Pagination */}
                        <div className="flex justify-between items-center">
                            <p className="text-sm text-muted-foreground">
                                Page 1 of 1
                            </p>
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" disabled>
                                    Previous
                                </Button>
                                <Button variant="outline" size="sm" disabled>
                                    Next
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
