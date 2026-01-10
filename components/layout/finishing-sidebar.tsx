"use client"

import {
    LayoutDashboard,
    Sparkles,
    ListTodo,
} from "lucide-react"
import { AppSidebar, NavGroup } from "./app-sidebar"

const navigation: NavGroup[] = [
    {
        title: "Menu Utama",
        items: [
            {
                title: "Dashboard",
                href: "/finishing/dashboard",
                icon: LayoutDashboard,
            },
            {
                title: "Proses Finishing",
                href: "/finishing/process",
                icon: ListTodo,
            },
        ],
    },
]

export function FinishingSidebar() {
    return (
        <AppSidebar
            roleTitle="Finishing"
            roleIcon={Sparkles}
            navigation={navigation}
        />
    )
}
