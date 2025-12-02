"use client"

import { Package2, TrendingDown, TrendingUp, AlertTriangle } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function StocksPage() {
    const rawMaterials = [
        { id: 1, name: "Kain Katun Premium", stock: 250, unit: "Roll", min: 50, status: "good" },
        { id: 2, name: "Kain Polyester", stock: 180, unit: "Roll", min: 50, status: "good" },
        { id: 3, name: "Benang Jahit", stock: 45, unit: "Pcs", min: 100, status: "low" },
        { id: 4, name: "Kancing Plastik", stock: 15, unit: "Pcs", min: 50, status: "critical" },
    ]

    const finishedProducts = [
        { id: 1, name: "Kaos Premium", stock: 120, unit: "Pcs", status: "good" },
        { id: 2, name: "Kemeja Formal", stock: 85, unit: "Pcs", status: "good" },
        { id: 3, name: "Jaket Hoodie", stock: 42, unit: "Pcs", status: "good" },
    ]

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Inventory</h2>
                    <p className="text-muted-foreground">
                        Monitor your stock levels and materials
                    </p>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Raw Materials
                        </CardTitle>
                        <Package2 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">4</div>
                        <p className="text-xs text-muted-foreground">
                            Types in inventory
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Finished Products
                        </CardTitle>
                        <Package2 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">247</div>
                        <p className="text-xs text-muted-foreground">
                            Units ready to ship
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Low Stock Items
                        </CardTitle>
                        <TrendingDown className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-500">2</div>
                        <p className="text-xs text-muted-foreground">
                            Need restock soon
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Stock Value
                        </CardTitle>
                        <TrendingUp className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">Rp 45M</div>
                        <p className="text-xs text-muted-foreground">
                            Total inventory value
                        </p>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="materials" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="materials">Raw Materials</TabsTrigger>
                    <TabsTrigger value="products">Finished Products</TabsTrigger>
                    <TabsTrigger value="failed">Failed Products</TabsTrigger>
                </TabsList>

                <TabsContent value="materials" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Raw Materials Inventory</CardTitle>
                            <CardDescription>
                                Materials available for production
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {rawMaterials.map((material) => (
                                    <div
                                        key={material.id}
                                        className="flex items-center justify-between p-4 rounded-lg border"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                                                <Package2 className="h-5 w-5 text-blue-600" />
                                            </div>
                                            <div>
                                                <p className="font-medium">{material.name}</p>
                                                <p className="text-sm text-muted-foreground">
                                                    Minimum stock: {material.min} {material.unit}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="text-right">
                                                <p className="text-2xl font-bold">
                                                    {material.stock}
                                                </p>
                                                <p className="text-sm text-muted-foreground">
                                                    {material.unit}
                                                </p>
                                            </div>
                                            {material.status === "good" && (
                                                <Badge>In Stock</Badge>
                                            )}
                                            {material.status === "low" && (
                                                <Badge variant="secondary">
                                                    <TrendingDown className="h-3 w-3 mr-1" />
                                                    Low Stock
                                                </Badge>
                                            )}
                                            {material.status === "critical" && (
                                                <Badge variant="destructive">
                                                    <AlertTriangle className="h-3 w-3 mr-1" />
                                                    Critical
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="products" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Finished Products</CardTitle>
                            <CardDescription>
                                Products ready for delivery
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {finishedProducts.map((product) => (
                                    <div
                                        key={product.id}
                                        className="flex items-center justify-between p-4 rounded-lg border"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
                                                <Package2 className="h-5 w-5 text-green-600" />
                                            </div>
                                            <div>
                                                <p className="font-medium">{product.name}</p>
                                                <p className="text-sm text-muted-foreground">
                                                    Ready to ship
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="text-right">
                                                <p className="text-2xl font-bold">
                                                    {product.stock}
                                                </p>
                                                <p className="text-sm text-muted-foreground">
                                                    {product.unit}
                                                </p>
                                            </div>
                                            <Badge>Available</Badge>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="failed" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Failed Products</CardTitle>
                            <CardDescription>
                                Products that did not pass quality control
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-col items-center justify-center py-8 text-center">
                                <Package2 className="h-12 w-12 text-muted-foreground mb-4" />
                                <p className="text-muted-foreground">
                                    No failed products recorded
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
