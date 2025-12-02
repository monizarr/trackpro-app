import { Users } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function EmployeesPage() {
    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Employees</h2>
                    <p className="text-muted-foreground">
                        Manage your workforce and team members
                    </p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Employee Management</CardTitle>
                    <CardDescription>
                        This feature is under development
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <Users className="h-24 w-24 text-muted-foreground mb-4" />
                        <p className="text-muted-foreground max-w-md">
                            Halaman manajemen staff sedang dalam pengembangan. Fitur ini akan
                            memungkinkan Anda untuk mengelola data karyawan, absensi, dan performa.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
