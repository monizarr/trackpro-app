"use client"

import { Menu } from "lucide-react"
import { Button } from "@/components/ui/button"

interface HeaderProps {
    breadcrumbs?: Array<{ label: string; href?: string }>
}

export function Header({ breadcrumbs = [] }: HeaderProps) {
    return (
        <header className="h-16 border-b bg-white flex items-center px-6 space-x-4">
            <Button variant="ghost" size="icon" className="lg:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle Sidebar</span>
            </Button>

            {breadcrumbs.length > 0 && (
                <nav aria-label="breadcrumb">
                    <ol className="flex items-center space-x-2 text-sm">
                        {breadcrumbs.map((crumb, index) => (
                            <li key={index} className="flex items-center">
                                {index > 0 && <span className="mx-2 text-gray-400">/</span>}
                                <span
                                    className={
                                        index === breadcrumbs.length - 1
                                            ? "text-gray-900 font-medium"
                                            : "text-gray-500"
                                    }
                                >
                                    {crumb.label}
                                </span>
                            </li>
                        ))}
                    </ol>
                </nav>
            )}
        </header>
    )
}
