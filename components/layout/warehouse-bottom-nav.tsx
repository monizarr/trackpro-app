"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { useState } from "react"
import { useSession, signOut } from "next-auth/react"
import {
    LayoutDashboard,
    Package,
    Box,
    CheckCircle,
    User,
    LogOut,
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

const navItems = [
    {
        title: "Dashboard",
        href: "/warehouse/dashboard",
        icon: LayoutDashboard,
    },
    {
        title: "Stok",
        href: "/warehouse/stock",
        icon: Package,
    },
    {
        title: "Alokasi",
        href: "/warehouse/allocation",
        icon: Box,
    },
    {
        title: "Verifikasi",
        href: "/warehouse/verification",
        icon: CheckCircle,
    },
]

export function WarehouseBottomNav() {
    const pathname = usePathname()
    const { data: session } = useSession()
    const [isProfileOpen, setIsProfileOpen] = useState(false)

    const handleLogout = async () => {
        await signOut({ callbackUrl: "/login" })
    }

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="grid grid-cols-5 h-16">
                {navItems.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
                    const Icon = item.icon

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex flex-col items-center justify-center gap-1 text-xs transition-colors",
                                isActive
                                    ? "text-primary font-medium"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <Icon className={cn("h-5 w-5", isActive && "stroke-[2.5]")} />
                            <span className="truncate">{item.title}</span>
                        </Link>
                    )
                })}

                {/* Profile Menu */}
                <DropdownMenu open={isProfileOpen} onOpenChange={setIsProfileOpen}>
                    <DropdownMenuTrigger asChild>
                        <button
                            className={cn(
                                "flex flex-col items-center justify-center gap-1 text-xs transition-colors outline-none",
                                isProfileOpen
                                    ? "text-primary font-medium"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <User className={cn("h-5 w-5", isProfileOpen && "stroke-[2.5]")} />
                            <span className="truncate">Profil</span>
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 mb-2">
                        <DropdownMenuLabel>
                            <div className="flex flex-col space-y-1">
                                <p className="text-sm font-medium leading-none">{session?.user?.name}</p>
                                <p className="text-xs leading-none text-muted-foreground">
                                    {session?.user?.email}
                                </p>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600">
                            <LogOut className="mr-2 h-4 w-4" />
                            <span>Keluar</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </nav>
    )
}
