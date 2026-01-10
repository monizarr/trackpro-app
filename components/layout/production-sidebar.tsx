"use client"

import {
    LayoutDashboard,
    Package,
    ClipboardCheck,
    Factory,
    QrCode,
} from "lucide-react"
import { AppSidebar, NavGroup } from "./app-sidebar"

const navigation: NavGroup[] = [
    {
        title: "Menu Utama",
        items: [
            {
                title: "Dashboard",
                href: "/production/dashboard",
                icon: LayoutDashboard,
            },
            {
                title: "Manajemen Batch",
                href: "/production/batch",
                icon: Package,
            },
            {
                title: "QR Scanner",
                href: "/production/qr-scanner",
                icon: QrCode,
            },
            {
                title: "Kontrol Kualitas",
                href: "/production/quality",
                icon: ClipboardCheck,
            },
        ],
    },
]

export function ProductionSidebar() {
    return (
        <AppSidebar
            roleTitle="Kepala Produksi"
            roleIcon={Factory}
            navigation={navigation}
        />
    )
}
