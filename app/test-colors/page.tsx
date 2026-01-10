export default function TestColors() {
    return (
        <div className="p-8 space-y-4">
            <h1 className="text-3xl font-bold">Test Color Palette</h1>

            <div className="grid grid-cols-5 gap-4">
                <div className="space-y-2">
                    <div className="h-32 w-full bg-[#0a090c] rounded-lg"></div>
                    <p className="text-sm font-mono">#0a090c</p>
                    <p className="text-xs text-muted-foreground">Dark Base</p>
                </div>

                <div className="space-y-2">
                    <div className="h-32 w-full bg-[#f0edee] rounded-lg border"></div>
                    <p className="text-sm font-mono">#f0edee</p>
                    <p className="text-xs text-muted-foreground">Light Base</p>
                </div>

                <div className="space-y-2">
                    <div className="h-32 w-full bg-[#07393c] rounded-lg"></div>
                    <p className="text-sm font-mono">#07393c</p>
                    <p className="text-xs text-muted-foreground">Primary Dark</p>
                </div>

                <div className="space-y-2">
                    <div className="h-32 w-full bg-[#2c666e] rounded-lg"></div>
                    <p className="text-sm font-mono">#2c666e</p>
                    <p className="text-xs text-muted-foreground">Primary</p>
                </div>

                <div className="space-y-2">
                    <div className="h-32 w-full bg-[#90ddf0] rounded-lg"></div>
                    <p className="text-sm font-mono">#90ddf0</p>
                    <p className="text-xs text-muted-foreground">Accent</p>
                </div>
            </div>

            <div className="space-y-4 pt-8">
                <h2 className="text-2xl font-bold">CSS Variables Test</h2>

                <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 rounded-lg bg-primary text-primary-foreground">
                        <p className="font-semibold">Primary</p>
                        <p className="text-sm">bg-primary</p>
                    </div>

                    <div className="p-4 rounded-lg bg-secondary text-secondary-foreground">
                        <p className="font-semibold">Secondary</p>
                        <p className="text-sm">bg-secondary</p>
                    </div>

                    <div className="p-4 rounded-lg bg-accent text-accent-foreground">
                        <p className="font-semibold">Accent</p>
                        <p className="text-sm">bg-accent</p>
                    </div>
                </div>
            </div>
        </div>
    )
}
