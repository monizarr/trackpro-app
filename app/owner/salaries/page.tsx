import { Header } from "@/components/layout/header"
import { Wallet } from "lucide-react"

export default function SalariesPage() {
    return (
        <div className="h-full">
            <Header breadcrumbs={[{ label: "Gaji" }]} />

            <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] p-6">
                <Wallet className="h-24 w-24 text-gray-300 mb-4" />
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                    Salary Management
                </h2>
                <p className="text-gray-500 text-center max-w-md">
                    Halaman manajemen gaji sedang dalam pengembangan. Fitur ini akan
                    memungkinkan Anda untuk mengelola pembayaran gaji karyawan dan histori penggajian.
                </p>
            </div>
        </div>
    )
}
