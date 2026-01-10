"use client"

import * as React from "react"
import { Check } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"

interface MultiSelectProps {
    options: string[]
    selected: string[]
    onChange: (selected: string[]) => void
    placeholder?: string
    disabled?: boolean
}

export function MultiSelect({
    options,
    selected,
    onChange,
    placeholder = "Pilih ukuran...",
    disabled = false,
}: MultiSelectProps) {
    const [open, setOpen] = React.useState(false)
    // Generate unique ID for this instance to avoid conflicts
    const instanceId = React.useId()

    const handleToggle = (value: string) => {
        const newSelected = selected.includes(value)
            ? selected.filter((item) => item !== value)
            : [...selected, value]
        onChange(newSelected)
    }

    const handleRemove = (value: string) => {
        onChange(selected.filter((item) => item !== value))
    }

    return (
        <div className="w-full">
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                    <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                        disabled={disabled}
                    >
                        {selected.length === 0 ? (
                            <span className="text-muted-foreground">{placeholder}</span>
                        ) : (
                            <div className="flex flex-wrap gap-1">
                                {selected.map((value) => (
                                    <Badge
                                        key={value}
                                        variant="secondary"
                                        className="mr-1"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            handleRemove(value)
                                        }}
                                    >
                                        {value}
                                        <span
                                            className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer"
                                            role="button"
                                            tabIndex={0}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter" || e.key === " ") {
                                                    e.preventDefault()
                                                    handleRemove(value)
                                                }
                                            }}
                                            onMouseDown={(e) => {
                                                e.preventDefault()
                                                e.stopPropagation()
                                            }}
                                            onClick={(e) => {
                                                e.preventDefault()
                                                e.stopPropagation()
                                                handleRemove(value)
                                            }}
                                        >
                                            ×
                                        </span>
                                    </Badge>
                                ))}
                            </div>
                        )}
                    </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Pilih Ukuran</DialogTitle>
                        <DialogDescription>
                            Pilih ukuran yang ingin diproduksi untuk warna ini
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2 py-4">
                        {options.map((option) => {
                            const checkboxId = `${instanceId}-${option}`
                            return (
                                <div
                                    key={option}
                                    className="flex items-center space-x-2 cursor-pointer hover:bg-muted p-2 rounded"
                                    onClick={() => handleToggle(option)}
                                >
                                    <Checkbox
                                        id={checkboxId}
                                        checked={selected.includes(option)}
                                        onCheckedChange={() => handleToggle(option)}
                                    />
                                    <Label
                                        htmlFor={checkboxId}
                                        className="flex-1 cursor-pointer"
                                    >
                                        {option}
                                    </Label>
                                    {selected.includes(option) && (
                                        <Check className="h-4 w-4 text-primary" />
                                    )}
                                </div>
                            )
                        })}
                    </div>
                    <DialogFooter>
                        <Button onClick={() => setOpen(false)}>Selesai</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
