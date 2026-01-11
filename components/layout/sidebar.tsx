"use client"

import {
    LayoutDashboard,
    Package,
    ShoppingBag,
    Users,
    Wallet,
    Crown,
    Factory,
} from "lucide-react"
import { AppSidebar, NavGroup } from "./app-sidebar"

const navigation: NavGroup[] = [
    {
        title: "Menu Utama",
        items: [
            {
                title: "Dashboard",
                href: "/owner/dashboard",
                icon: LayoutDashboard,
            },
            {
                title: "Produk",
                href: "/owner/products",
                icon: ShoppingBag,
            },
            {
                title: "Stok Bahan Baku",
                href: "/owner/stocks",
                icon: Package,
            },
            {
                title: "Production Monitoring",
                href: "/owner/production-batches",
                icon: Factory,
            },
        ],
    },
    {
        title: "Manajemen",
        items: [
            {
                title: "Staff",
                href: "/owner/employees",
                icon: Users,
            },
            {
                title: "Gaji",
                href: "/owner/salaries",
                icon: Wallet,
            },
        ],
    },
]

export function Sidebar() {
    return (
        <AppSidebar
            roleTitle="Owner"
            roleIcon={Crown}
            navigation={navigation}
        />
    )
}
