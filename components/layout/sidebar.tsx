"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
    LayoutDashboard,
    Package,
    ShoppingBag,
    Users,
    Wallet,
    BookOpen,
    Github,
    LogOut,
    Settings,
    ChevronRight,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"

const navigation = [
    { name: "Dashboard", href: "/owner/dashboard", icon: LayoutDashboard },
    { name: "Stok Bahan Baku", href: "/owner/stocks", icon: Package },
    { name: "Produk", href: "/owner/products", icon: ShoppingBag },
    { name: "Staff", href: "/owner/employees", icon: Users },
    { name: "Gaji", href: "/owner/salaries", icon: Wallet },
]

const externalLinks = [
    {
        name: "Repository",
        href: "https://github.com/monizarr/trackpro-app",
        icon: Github,
    },
    {
        name: "Documentation",
        href: "https://github.com/monizarr/trackpro-app/blob/main/README.md",
        icon: BookOpen,
    },
]

export function Sidebar() {
    const pathname = usePathname()

    return (
        <div className="flex h-screen w-64 flex-col bg-gradient-to-b from-slate-900 to-slate-800 text-white shadow-2xl">
            {/* Logo */}
            <div className="flex h-16 items-center px-6 border-b border-white/10">
                <Link href="/owner/dashboard" className="flex items-center space-x-3 group">
                    <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg transform group-hover:scale-105 transition-transform">
                        <span className="font-bold text-lg">T</span>
                    </div>
                    <span className="font-bold text-lg tracking-tight">TrackPro</span>
                </Link>
            </div>

            {/* Navigation */}
            <div className="flex-1 overflow-y-auto py-6 px-3">
                <div className="mb-6">
                    <h2 className="mb-3 px-4 text-xs font-semibold tracking-wider text-slate-400 uppercase">
                        Platform
                    </h2>
                    <div className="space-y-1">
                        {navigation.map((item) => {
                            const isActive = pathname === item.href
                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    className={cn(
                                        "group flex items-center justify-between rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 relative overflow-hidden",
                                        isActive
                                            ? "bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-white shadow-lg"
                                            : "text-slate-300 hover:bg-white/10 hover:text-white"
                                    )}
                                >
                                    {isActive && (
                                        <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-blue-500 to-purple-600 rounded-r" />
                                    )}
                                    <div className="flex items-center space-x-3">
                                        <item.icon className={cn(
                                            "h-5 w-5 transition-transform group-hover:scale-110",
                                            isActive ? "text-blue-400" : ""
                                        )} />
                                        <span>{item.name}</span>
                                    </div>
                                    {isActive && (
                                        <ChevronRight className="h-4 w-4 text-blue-400" />
                                    )}
                                </Link>
                            )
                        })}
                    </div>
                </div>

                {/* External Links */}
                <div className="px-3 mt-8 pt-6 border-t border-white/10">
                    <div className="space-y-1">
                        {externalLinks.map((link) => (
                            <a
                                key={link.name}
                                href={link.href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center space-x-3 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-400 hover:bg-white/10 hover:text-white transition-all duration-200 group"
                            >
                                <link.icon className="h-4 w-4 group-hover:scale-110 transition-transform" />
                                <span>{link.name}</span>
                            </a>
                        ))}
                    </div>
                </div>
            </div>

            {/* User Menu */}
            <div className="border-t border-white/10 p-4">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            className="w-full justify-start space-x-3 px-3 py-6 hover:bg-white/10 rounded-xl transition-all duration-200 group"
                        >
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-sm font-bold shadow-lg ring-2 ring-white/20 group-hover:ring-white/40 transition-all">
                                O
                            </div>
                            <div className="flex-1 text-left">
                                <div className="text-sm font-semibold text-white">Owner</div>
                                <div className="text-xs text-slate-400">owner@trackpro.com</div>
                            </div>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 bg-slate-800 border-slate-700 text-white">
                        <DropdownMenuLabel>
                            <div className="flex flex-col space-y-1">
                                <p className="text-sm font-medium">Owner</p>
                                <p className="text-xs text-slate-400">
                                    owner@trackpro.com
                                </p>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator className="bg-slate-700" />
                        <DropdownMenuItem className="hover:bg-slate-700 cursor-pointer">
                            <Settings className="mr-2 h-4 w-4" />
                            <span>Settings</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-slate-700" />
                        <DropdownMenuItem className="hover:bg-slate-700 cursor-pointer text-red-400 focus:text-red-400">
                            <Link href="/login" className="flex items-center w-full">
                                <LogOut className="mr-2 h-4 w-4" />
                                <span>Log out</span>
                            </Link>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    )
}
