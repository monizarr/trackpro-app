import { Wallet } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function SalariesPage() {
    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Penggajian</h2>
                    <p className="text-muted-foreground">
                        Kelola gaji dan pembayaran karyawan
                    </p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Manajemen Gaji</CardTitle>
                    <CardDescription>
                        Fitur ini sedang dalam pengembangan
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <Wallet className="h-24 w-24 text-muted-foreground mb-4" />
                        <p className="text-muted-foreground max-w-md">
                            Halaman manajemen gaji sedang dalam pengembangan. Fitur ini akan
                            memungkinkan Anda untuk mengelola pembayaran gaji karyawan dan histori penggajian.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
