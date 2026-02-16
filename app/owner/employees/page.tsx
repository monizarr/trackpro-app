"use client"

import { useEffect, useMemo, useState } from "react"
import {
    Edit,
    Plus,
    Search,
    UserCheck,
    UserX,
    Users,
} from "lucide-react"
import { toast } from "@/lib/toast"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { SpinnerCustom } from "@/components/ui/spinner"

type UserRole =
    | "OWNER"
    | "KEPALA_GUDANG"
    | "KEPALA_PRODUKSI"
    | "PEMOTONG"
    | "PENJAHIT"
    | "FINISHING"

interface Employee {
    id: string
    name: string
    username: string
    email: string
    role: UserRole
    isActive: boolean
    createdAt: string
}

const ROLE_OPTIONS: Array<{ value: UserRole; label: string }> = [
    { value: "OWNER", label: "Owner" },
    { value: "KEPALA_PRODUKSI", label: "Kepala Produksi" },
    { value: "KEPALA_GUDANG", label: "Kepala Gudang" },
    { value: "PEMOTONG", label: "Kepala Pemotong" },
    { value: "PENJAHIT", label: "Kepala Penjahit" },
    { value: "FINISHING", label: "Kepala Finishing" },
]

export default function EmployeesPage() {
    const [employees, setEmployees] = useState<Employee[]>([])
    const [searchQuery, setSearchQuery] = useState("")
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)
    const [statusDialogOpen, setStatusDialogOpen] = useState(false)
    const [statusTarget, setStatusTarget] = useState<Employee | null>(null)
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)

    const [formData, setFormData] = useState({
        name: "",
        username: "",
        email: "",
        role: "PEMOTONG" as UserRole,
        password: "",
        isActive: true,
    })

    useEffect(() => {
        fetchEmployees()
    }, [])

    const fetchEmployees = async () => {
        try {
            setIsLoading(true)
            const response = await fetch("/api/employees")
            const data = await response.json()

            if (data.success) {
                setEmployees(data.data)
            } else {
                toast.error("Gagal", data.error || "Tidak dapat memuat data staff")
            }
        } catch (error) {
            console.error("Error fetching employees:", error)
            toast.error("Error", "Gagal memuat data staff")
        } finally {
            setIsLoading(false)
        }
    }

    const resetForm = () => {
        setFormData({
            name: "",
            username: "",
            email: "",
            role: "PEMOTONG",
            password: "",
            isActive: true,
        })
        setEditingEmployee(null)
    }

    const handleEdit = (employee: Employee) => {
        setEditingEmployee(employee)
        setFormData({
            name: employee.name,
            username: employee.username,
            email: employee.email,
            role: employee.role,
            password: "",
            isActive: employee.isActive,
        })
        setIsDialogOpen(true)
    }

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault()
        setIsSaving(true)

        try {
            const isEditing = Boolean(editingEmployee)
            const endpoint = isEditing
                ? `/api/employees/${editingEmployee?.id}`
                : "/api/employees"
            const method = isEditing ? "PATCH" : "POST"

            const payload: Record<string, unknown> = {
                name: formData.name.trim(),
                username: formData.username.trim(),
                email: formData.email.trim(),
                role: formData.role,
                isActive: formData.isActive,
            }

            if (!isEditing || formData.password.trim()) {
                payload.password = formData.password
            }

            const response = await fetch(endpoint, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            })

            const data = await response.json()

            if (data.success) {
                await fetchEmployees()
                setIsDialogOpen(false)
                resetForm()
                toast.success(
                    isEditing ? "Staff Diperbarui" : "Staff Ditambahkan",
                    isEditing
                        ? `${formData.name} berhasil diperbarui`
                        : `${formData.name} berhasil ditambahkan`
                )
            } else {
                toast.error("Gagal", data.error || "Tidak dapat menyimpan staff")
            }
        } catch (error) {
            console.error("Error saving employee:", error)
            toast.error("Error", "Gagal menyimpan staff")
        } finally {
            setIsSaving(false)
        }
    }

    const openStatusDialog = (employee: Employee) => {
        setStatusTarget(employee)
        setStatusDialogOpen(true)
    }

    const handleToggleStatus = async () => {
        if (!statusTarget) return

        setIsUpdatingStatus(true)
        try {
            const response = await fetch(`/api/employees/${statusTarget.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isActive: !statusTarget.isActive }),
            })

            const data = await response.json()

            if (data.success) {
                await fetchEmployees()
                setStatusDialogOpen(false)
                setStatusTarget(null)
                toast.success(
                    statusTarget.isActive ? "Staff Dinonaktifkan" : "Staff Diaktifkan",
                    `${statusTarget.name} berhasil diperbarui statusnya`
                )
            } else {
                toast.error("Gagal", data.error || "Tidak dapat memperbarui status staff")
            }
        } catch (error) {
            console.error("Error updating status:", error)
            toast.error("Error", "Gagal memperbarui status staff")
        } finally {
            setIsUpdatingStatus(false)
        }
    }

    const filteredEmployees = useMemo(() => {
        const query = searchQuery.toLowerCase()
        return employees.filter((employee) =>
            [employee.name, employee.username, employee.email]
                .join(" ")
                .toLowerCase()
                .includes(query)
        )
    }, [employees, searchQuery])

    const roleLabel = (role: UserRole) =>
        ROLE_OPTIONS.find((option) => option.value === role)?.label || role

    return (
        <div className="flex-1 space-y-4 p-4 sm:p-6 md:p-8 pt-4 sm:pt-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Staff</h2>
                    <p className="text-sm sm:text-base text-muted-foreground">
                        Kelola tenaga kerja dan anggota tim Anda
                    </p>
                </div>
                <Dialog
                    open={isDialogOpen}
                    onOpenChange={(open) => {
                        setIsDialogOpen(open)
                        if (!open) resetForm()
                    }}
                >
                    <DialogTrigger asChild>
                        <Button className="w-full sm:w-auto">
                            <Plus className="h-4 w-4 mr-2" />
                            Tambah Staff
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-full sm:max-w-xl max-h-[90vh] overflow-y-auto p-4 sm:p-6 rounded-lg">
                        <DialogHeader>
                            <DialogTitle>
                                {editingEmployee ? "Edit Staff" : "Tambah Staff Baru"}
                            </DialogTitle>
                            <DialogDescription>
                                {editingEmployee
                                    ? "Perbarui informasi staff."
                                    : "Tambahkan anggota tim baru ke sistem."}
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Nama</Label>
                                    <Input
                                        id="name"
                                        value={formData.name}
                                        onChange={(event) =>
                                            setFormData({
                                                ...formData,
                                                name: event.target.value,
                                            })
                                        }
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="username">Username</Label>
                                    <Input
                                        id="username"
                                        value={formData.username}
                                        onChange={(event) =>
                                            setFormData({
                                                ...formData,
                                                username: event.target.value,
                                            })
                                        }
                                        required
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={formData.email}
                                        onChange={(event) =>
                                            setFormData({
                                                ...formData,
                                                email: event.target.value,
                                            })
                                        }
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="role">Peran</Label>
                                    <Select
                                        id="role"
                                        value={formData.role}
                                        onChange={(event) =>
                                            setFormData({
                                                ...formData,
                                                role: event.target.value as UserRole,
                                            })
                                        }
                                    >
                                        {ROLE_OPTIONS.map((option) => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </Select>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="password">Password</Label>
                                    <Input
                                        id="password"
                                        type="password"
                                        value={formData.password}
                                        onChange={(event) =>
                                            setFormData({
                                                ...formData,
                                                password: event.target.value,
                                            })
                                        }
                                        placeholder={
                                            editingEmployee
                                                ? "Kosongkan jika tidak diubah"
                                                : "Masukkan password"
                                        }
                                        required={!editingEmployee}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="status">Status</Label>
                                    <Select
                                        id="status"
                                        value={formData.isActive ? "active" : "inactive"}
                                        onChange={(event) =>
                                            setFormData({
                                                ...formData,
                                                isActive: event.target.value === "active",
                                            })
                                        }
                                    >
                                        <option value="active">Aktif</option>
                                        <option value="inactive">Tidak Aktif</option>
                                    </Select>
                                </div>
                            </div>
                            <Button type="submit" className="w-full" disabled={isSaving}>
                                {isSaving
                                    ? "Menyimpan..."
                                    : editingEmployee
                                        ? "Perbarui Staff"
                                        : "Simpan Staff"}
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex flex-col gap-4">
                        <div>
                            <CardTitle>Daftar Staff</CardTitle>
                            <CardDescription>
                                Kelola akun dan peran anggota tim
                            </CardDescription>
                        </div>
                        <div className="relative w-full">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Cari staff..."
                                value={searchQuery}
                                onChange={(event) => setSearchQuery(event.target.value)}
                                className="pl-10"
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0 sm:p-6">
                    <div className="block sm:hidden">
                        {isLoading ? (
                            <div className="flex items-center justify-center gap-2 py-12">
                                <SpinnerCustom />
                                <p className="text-muted-foreground">Memuat staff...</p>
                            </div>
                        ) : filteredEmployees.length === 0 ? (
                            <div className="flex items-center justify-center py-12">
                                <p className="text-muted-foreground">Tidak ada staff ditemukan</p>
                            </div>
                        ) : (
                            <div className="space-y-3 p-4">
                                {filteredEmployees.map((employee) => (
                                    <Card key={employee.id} className="border-2">
                                        <CardContent className="p-4">
                                            <div className="space-y-3">
                                                <div className="flex items-start justify-between">
                                                    <div className="flex-1">
                                                        <p className="font-medium text-primary">
                                                            {employee.name}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground">
                                                            @{employee.username}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {employee.email}
                                                        </p>
                                                    </div>
                                                    <Badge
                                                        variant={employee.isActive ? "default" : "secondary"}
                                                    >
                                                        {employee.isActive ? "Aktif" : "Nonaktif"}
                                                    </Badge>
                                                </div>
                                                <div className="flex items-center gap-2 text-sm">
                                                    <Users className="h-3 w-3 text-muted-foreground" />
                                                    <span className="text-muted-foreground">
                                                        {roleLabel(employee.role)}
                                                    </span>
                                                </div>
                                                <div className="flex gap-2 pt-2 border-t">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleEdit(employee)}
                                                        className="flex-1"
                                                    >
                                                        <Edit className="h-3 w-3 mr-1" />
                                                        Edit
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => openStatusDialog(employee)}
                                                        className="flex-1"
                                                    >
                                                        {employee.isActive ? (
                                                            <>
                                                                <UserX className="h-3 w-3 mr-1 text-destructive" />
                                                                Nonaktifkan
                                                            </>
                                                        ) : (
                                                            <>
                                                                <UserCheck className="h-3 w-3 mr-1" />
                                                                Aktifkan
                                                            </>
                                                        )}
                                                    </Button>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="hidden sm:block">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nama</TableHead>
                                    <TableHead>Username</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Peran</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Aksi</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell
                                            colSpan={6}
                                            className="text-center text-muted-foreground h-24"
                                        >
                                            Memuat staff...
                                        </TableCell>
                                    </TableRow>
                                ) : filteredEmployees.length === 0 ? (
                                    <TableRow>
                                        <TableCell
                                            colSpan={6}
                                            className="text-center text-muted-foreground h-24"
                                        >
                                            Tidak ada staff ditemukan
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredEmployees.map((employee) => (
                                        <TableRow key={employee.id}>
                                            <TableCell className="font-medium">
                                                {employee.name}
                                            </TableCell>
                                            <TableCell>@{employee.username}</TableCell>
                                            <TableCell>{employee.email}</TableCell>
                                            <TableCell>{roleLabel(employee.role)}</TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant={employee.isActive ? "default" : "secondary"}
                                                >
                                                    {employee.isActive ? "Aktif" : "Nonaktif"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleEdit(employee)}
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => openStatusDialog(employee)}
                                                    >
                                                        {employee.isActive ? (
                                                            <UserX className="h-4 w-4 text-destructive" />
                                                        ) : (
                                                            <UserCheck className="h-4 w-4" />
                                                        )}
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <AlertDialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Konfirmasi perubahan status</AlertDialogTitle>
                        <AlertDialogDescription>
                            {statusTarget?.isActive
                                ? `Nonaktifkan akun ${statusTarget?.name}?`
                                : `Aktifkan kembali akun ${statusTarget?.name}?`}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex flex-col-reverse sm:flex-row gap-2">
                        <AlertDialogCancel disabled={isUpdatingStatus}>
                            Batal
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleToggleStatus}
                            disabled={isUpdatingStatus}
                            className={
                                statusTarget?.isActive
                                    ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    : undefined
                            }
                        >
                            {isUpdatingStatus
                                ? "Memproses..."
                                : statusTarget?.isActive
                                    ? "Nonaktifkan"
                                    : "Aktifkan"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
