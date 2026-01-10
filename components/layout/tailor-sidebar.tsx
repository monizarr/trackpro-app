"use client"

import {
    LayoutDashboard,
    Scissors,
    ListTodo,
} from "lucide-react"
import { AppSidebar, NavGroup } from "./app-sidebar"

const navigation: NavGroup[] = [
    {
        title: "Menu Utama",
        items: [
            {
                title: "Dashboard",
                href: "/tailor/dashboard",
                icon: LayoutDashboard,
            },
            {
                title: "Proses Penjahitan",
                href: "/tailor/process",
                icon: ListTodo,
            },
        ],
    },
]

export function TailorSidebar() {
    return (
        <AppSidebar
            roleTitle="Penjahit"
            roleIcon={Scissors}
            navigation={navigation}
        />
    )
}
