"use client";

import QRCode from "react-qr-code";
import { Button } from "@/components/ui/button";
import { Download, Printer } from "lucide-react";
import { useRef } from "react";

interface QRCodeGeneratorProps {
    batchSku: string;
    productName: string;
    targetQuantity: number;
    batchId: string;
}

export function QRCodeGenerator({ batchSku, productName, targetQuantity, batchId }: QRCodeGeneratorProps) {
    const qrRef = useRef<HTMLDivElement>(null);

    // Generate URL untuk direct access ke batch detail
    // User bisa scan dan langsung membuka halaman detail batch
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    const qrData = `${baseUrl}/batch/${batchId}`;

    const handleDownload = () => {
        if (!qrRef.current) return;

        const svg = qrRef.current.querySelector("svg");
        if (!svg) return;

        const svgData = new XMLSerializer().serializeToString(svg);
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const img = new Image();

        canvas.width = 300;
        canvas.height = 300;

        img.onload = () => {
            ctx?.drawImage(img, 0, 0);
            const pngFile = canvas.toDataURL("image/png");

            const downloadLink = document.createElement("a");
            downloadLink.download = `QR_${batchSku}.png`;
            downloadLink.href = pngFile;
            downloadLink.click();
        };

        img.src = "data:image/svg+xml;base64," + btoa(svgData);
    };

    const handlePrint = () => {
        const printWindow = window.open("", "_blank");
        if (!printWindow) return;

        const svg = qrRef.current?.querySelector("svg");
        if (!svg) return;

        const svgData = new XMLSerializer().serializeToString(svg);

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Print QR Code - ${batchSku}</title>
                <style>
                    @media print {
                        body {
                            margin: 0;
                            padding: 20px;
                            display: flex;
                            flex-direction: column;
                            align-items: center;
                            justify-content: center;
                        }
                    }
                    body {
                        font-family: Arial, sans-serif;
                        text-align: center;
                        padding: 20px;
                    }
                    .qr-container {
                        margin: 20px 0;
                    }
                    .info {
                        margin: 10px 0;
                        font-size: 14px;
                    }
                    .batch-sku {
                        font-size: 24px;
                        font-weight: bold;
                        margin: 10px 0;
                    }
                </style>
            </head>
            <body>
                <div>
                    <h2>Batch Produksi</h2>
                    <div class="batch-sku">${batchSku}</div>
                    <div class="info">${productName}</div>
                    <div class="info">Target: ${targetQuantity} pcs</div>
                    <div class="qr-container">
                        ${svgData}
                    </div>
                    <div class="info">Scan untuk verifikasi</div>
                </div>
            </body>
            </html>
        `);

        printWindow.document.close();
        setTimeout(() => {
            printWindow.print();
        }, 250);
    };

    return (
        <div className="space-y-4">
            <div ref={qrRef} className="flex justify-center p-4 bg-white rounded-lg">
                <QRCode
                    value={qrData}
                    size={200}
                    level="H"
                />
            </div>

            <div className="flex gap-2 justify-center">
                <Button variant="outline" size="sm" onClick={handleDownload}>
                    <Download className="h-4 w-4 mr-2" />
                    Download
                </Button>
                <Button variant="outline" size="sm" onClick={handlePrint}>
                    <Printer className="h-4 w-4 mr-2" />
                    Print Label
                </Button>
            </div>

            <div className="text-center space-y-1">
                <p className="text-sm font-medium">{batchSku}</p>
                <p className="text-xs text-muted-foreground">{productName}</p>
                <p className="text-xs text-muted-foreground">Target: {targetQuantity} pcs</p>
            </div>
        </div>
    );
}
