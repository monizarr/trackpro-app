"use client"

import * as React from "react"

type Theme = "dark" | "light"

type ThemeProviderProps = {
    children: React.ReactNode
    defaultTheme?: Theme
}

type ThemeProviderState = {
    theme: Theme
    setTheme: (theme: Theme) => void
    toggleTheme: () => void
}

const ThemeProviderContext = React.createContext<ThemeProviderState | undefined>(
    undefined
)

export function ThemeProvider({
    children,
    defaultTheme = "light",
    ...props
}: ThemeProviderProps) {
    const [theme, setTheme] = React.useState<Theme>(defaultTheme)

    React.useEffect(() => {
        // Load theme from localStorage on mount
        const savedTheme = localStorage.getItem("theme") as Theme | null
        if (savedTheme) {
            setTheme(savedTheme)
        }
    }, [])

    React.useEffect(() => {
        const root = window.document.documentElement
        root.classList.remove("light", "dark")
        root.classList.add(theme)
        localStorage.setItem("theme", theme)
    }, [theme])

    const toggleTheme = () => {
        setTheme((prevTheme) => (prevTheme === "light" ? "dark" : "light"))
    }

    const value = {
        theme,
        setTheme,
        toggleTheme,
    }

    return (
        <ThemeProviderContext.Provider {...props} value={value}>
            {children}
        </ThemeProviderContext.Provider>
    )
}

export const useTheme = () => {
    const context = React.useContext(ThemeProviderContext)

    if (context === undefined)
        throw new Error("useTheme must be used within a ThemeProvider")

    return context
}
