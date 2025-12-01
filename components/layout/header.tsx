"use client"

import { Menu, Bell, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface HeaderProps {
    breadcrumbs?: Array<{ label: string; href?: string }>
}

export function Header({ breadcrumbs = [] }: HeaderProps) {
    return (
        <header className="h-16 bg-white border-b border-gray-200 flex items-center px-6 shadow-sm sticky top-0 z-10">
            <div className="flex items-center justify-between w-full">
                <div className="flex items-center space-x-4">
                    <Button variant="ghost" size="icon" className="lg:hidden">
                        <Menu className="h-5 w-5" />
                        <span className="sr-only">Toggle Sidebar</span>
                    </Button>

                    {breadcrumbs.length > 0 && (
                        <nav aria-label="breadcrumb" className="hidden sm:block">
                            <ol className="flex items-center space-x-2 text-sm">
                                {breadcrumbs.map((crumb, index) => (
                                    <li key={index} className="flex items-center">
                                        {index > 0 && <span className="mx-2 text-gray-400">/</span>}
                                        <span
                                            className={
                                                index === breadcrumbs.length - 1
                                                    ? "text-gray-900 font-semibold"
                                                    : "text-gray-500 hover:text-gray-700"
                                            }
                                        >
                                            {crumb.label}
                                        </span>
                                    </li>
                                ))}
                            </ol>
                        </nav>
                    )}
                </div>

                <div className="flex items-center space-x-3">
                    {/* Search Bar */}
                    <div className="relative hidden md:block">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            type="search"
                            placeholder="Search..."
                            className="w-64 pl-10 h-9 bg-gray-50 border-gray-200 focus:bg-white transition-colors"
                        />
                    </div>

                    {/* Notifications */}
                    <Button variant="ghost" size="icon" className="relative">
                        <Bell className="h-5 w-5" />
                        <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                        <span className="sr-only">Notifications</span>
                    </Button>
                </div>
            </div>
        </header>
    )
}
