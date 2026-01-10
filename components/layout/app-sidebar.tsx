"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut, useSession } from "next-auth/react"
import { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ThemeToggle } from "@/components/theme-toggle"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

export interface NavItem {
    title: string
    href: string
    icon: LucideIcon
    badge?: string
}

export interface NavGroup {
    title?: string
    items: NavItem[]
}

interface AppSidebarProps {
    logo?: React.ReactNode
    roleTitle: string
    roleIcon: LucideIcon
    navigation: NavGroup[]
    className?: string
}

export function AppSidebar({
    logo,
    roleTitle,
    roleIcon: RoleIcon,
    navigation,
    className,
}: AppSidebarProps) {
    const pathname = usePathname()
    const { data: session } = useSession()

    const handleLogout = async () => {
        await signOut({ callbackUrl: "/login" })
    }

    return (
        <div className={cn("flex h-screen w-16 sm:w-64 flex-col border-r bg-background transition-all duration-300", className)}>
            {/* Header */}
            <div className="flex h-16 items-center justify-center sm:justify-start border-b px-2 sm:px-6">
                {logo || (
                    <Link href="/" className="flex items-center gap-2 font-semibold">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                            <span className="text-sm font-bold">T</span>
                        </div>
                        <span className="text-base hidden sm:inline">TrackPro</span>
                    </Link>
                )}
            </div>

            {/* Role Badge */}
            <div className="border-b px-2 sm:px-4 py-3">
                <Badge variant="secondary" className="w-full justify-center sm:justify-start gap-2 py-2 font-normal">
                    <RoleIcon className="h-4 w-4" />
                    <span className="text-xs hidden sm:inline">{roleTitle}</span>
                </Badge>
            </div>

            {/* Navigation */}
            <div className="flex-1 overflow-y-auto px-1 sm:px-3 py-4">
                <nav className="space-y-6">
                    {navigation.map((group, groupIndex) => (
                        <div key={groupIndex}>
                            {group.title && (
                                <h4 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden sm:block">
                                    {group.title}
                                </h4>
                            )}
                            <div className="space-y-1">
                                {group.items.map((item) => {
                                    const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
                                    const Icon = item.icon
                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            className={cn(
                                                "flex items-center justify-center sm:justify-start gap-3 rounded-lg px-2 sm:px-3 py-2 text-sm font-medium transition-all",
                                                isActive
                                                    ? "bg-primary text-primary-foreground shadow-sm"
                                                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                                            )}
                                            title={item.title}
                                        >
                                            <Icon className="h-4 w-4 shrink-0" />
                                            <span className="flex-1 hidden sm:inline">{item.title}</span>
                                            {item.badge && (
                                                <Badge variant="secondary" className="ml-auto h-5 px-1.5 text-xs hidden sm:inline-flex">
                                                    {item.badge}
                                                </Badge>
                                            )}
                                        </Link>
                                    )
                                })}
                            </div>
                        </div>
                    ))}
                </nav>
            </div>

            <Separator />

            {/* User Profile */}
            <div className="p-2 sm:p-4">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            className="w-full justify-center sm:justify-start gap-3 px-2 h-auto py-2"
                        >
                            <Avatar className="h-8 w-8">
                                <AvatarImage src="" alt={session?.user?.name || ""} />
                                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                                    {session?.user?.name?.charAt(0) || "U"}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col items-start text-left hidden sm:flex">
                                <span className="text-sm font-medium">
                                    {session?.user?.name || "User"}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                    {session?.user?.email || ""}
                                </span>
                            </div>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuLabel>Akun Saya</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                            <div className="flex items-center gap-2">
                                <ThemeToggle />
                            </div>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                            Keluar
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    )
}
