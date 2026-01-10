"use client"

import {
    LayoutDashboard,
    Package,
    Box,
    FileText,
    Warehouse,
    CheckCircle,
    Archive,
} from "lucide-react"
import { AppSidebar, NavGroup } from "./app-sidebar"

const navigation: NavGroup[] = [
    {
        title: "Menu Utama",
        items: [
            {
                title: "Dashboard",
                href: "/warehouse/dashboard",
                icon: LayoutDashboard,
            },
            {
                title: "Manajemen Stok",
                href: "/warehouse/stock",
                icon: Package,
            },
            {
                title: "Alokasi Bahan",
                href: "/warehouse/allocation",
                icon: Box,
            },
        ],
    },
    {
        title: "Produksi",
        items: [
            {
                title: "Verifikasi Batch",
                href: "/warehouse/verification",
                icon: CheckCircle,
            },
            {
                title: "Barang Jadi",
                href: "/warehouse/finished-goods",
                icon: Archive,
            },
        ],
    },
    {
        title: "Laporan",
        items: [
            {
                title: "Laporan Stok",
                href: "/warehouse/reports",
                icon: FileText,
            },
        ],
    },
]

export function WarehouseSidebar() {
    return (
        <AppSidebar
            roleTitle="Kepala Gudang"
            roleIcon={Warehouse}
            navigation={navigation}
        />
    )
}
