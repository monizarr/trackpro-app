"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeResult } from "html5-qrcode";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Camera, X, CheckCircle, AlertCircle } from "lucide-react";

interface QRCodeScannerProps {
    onScanSuccess: (decodedText: string, decodedResult: Html5QrcodeResult) => void;
    onScanError?: (error: string) => void;
}

export function QRCodeScanner({ onScanSuccess, onScanError }: QRCodeScannerProps) {
    const [isScanning, setIsScanning] = useState(false);
    const [error, setError] = useState<string>("");
    const [success, setSuccess] = useState<string>("");
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const qrCodeRegionId = "qr-reader";

    useEffect(() => {
        return () => {
            if (scannerRef.current) {
                scannerRef.current
                    .stop()
                    .then(() => {
                        scannerRef.current?.clear();
                    })
                    .catch((err) => console.error("Error stopping scanner:", err));
            }
        };
    }, []);

    const startScanning = async () => {
        try {
            setError("");
            setSuccess("");

            if (!scannerRef.current) {
                const html5QrCode = new Html5Qrcode(qrCodeRegionId);
                scannerRef.current = html5QrCode;
            }

            const config = {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0,
            };

            await scannerRef.current.start(
                { facingMode: "environment" },
                config,
                (decodedText, decodedResult) => {
                    setSuccess("QR Code berhasil di-scan!");
                    onScanSuccess(decodedText, decodedResult);

                    // Auto stop after successful scan
                    setTimeout(() => {
                        stopScanning();
                    }, 1000);
                },
                () => {
                    // Ignore errors during scanning
                }
            );

            setIsScanning(true);
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : "Gagal memulai scanner. Pastikan kamera diizinkan.";
            setError(errorMessage);
            if (onScanError) {
                onScanError(errorMessage);
            }
        }
    };

    const stopScanning = async () => {
        if (scannerRef.current && isScanning) {
            try {
                await scannerRef.current.stop();
                setIsScanning(false);
            } catch (err) {
                console.error("Error stopping scanner:", err);
            }
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Camera className="h-5 w-5" />
                    QR Code Scanner
                </CardTitle>
                <CardDescription>
                    Scan QR Code batch produksi untuk verifikasi
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {error && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                {success && (
                    <Alert>
                        <CheckCircle className="h-4 w-4" />
                        <AlertDescription>{success}</AlertDescription>
                    </Alert>
                )}

                {!isScanning && (
                    <div className="flex items-center justify-center min-h-[300px] border-2 border-dashed rounded-lg bg-muted/50">
                        <div className="text-center space-y-4">
                            <Camera className="h-12 w-12 mx-auto text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">
                                Klik tombol di bawah untuk memulai scan
                            </p>
                        </div>
                    </div>
                )}

                <div id={qrCodeRegionId} className="w-full" />

                <div className="flex gap-2">
                    {!isScanning ? (
                        <Button onClick={startScanning} className="w-full">
                            <Camera className="h-4 w-4 mr-2" />
                            Mulai Scan
                        </Button>
                    ) : (
                        <Button onClick={stopScanning} variant="destructive" className="w-full">
                            <X className="h-4 w-4 mr-2" />
                            Stop Scan
                        </Button>
                    )}
                </div>

                <div className="text-xs text-muted-foreground space-y-1">
                    <p>💡 Tips:</p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                        <li>Pastikan QR Code dalam kondisi terang dan jelas</li>
                        <li>Posisikan QR Code di tengah frame</li>
                        <li>Jaga jarak sekitar 15-20cm dari kamera</li>
                    </ul>
                </div>
            </CardContent>
        </Card>
    );
}
