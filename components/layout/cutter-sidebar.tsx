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
                href: "/cutter/dashboard",
                icon: LayoutDashboard,
            },
            {
                title: "Proses Pemotongan",
                href: "/cutter/process",
                icon: ListTodo,
            },
        ],
    },
]

export function CutterSidebar() {
    return (
        <AppSidebar
            roleTitle="Pemotong"
            roleIcon={Scissors}
            navigation={navigation}
        />
    )
}
