import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-helpers";

// POST - Assign finisher untuk batch (DEPRECATED - use sub-batch flow)
// Proses finishing wajib melalui sub-batch
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireRole(["OWNER", "KEPALA_PRODUKSI"]);

    // Endpoint ini deprecated - proses wajib melalui sub-batch
    return NextResponse.json(
      {
        success: false,
        error:
          "Proses finishing wajib melalui sub-batch. Silakan buat sub-batch terlebih dahulu setelah cutting verified, lalu assign ke penjahit dan finisher melalui sub-batch.",
        hint: "Gunakan endpoint POST /api/production-batches/[id]/sub-batches untuk membuat sub-batch",
      },
      { status: 400 },
    );
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { success: false, error: "Endpoint deprecated" },
      { status: 500 },
    );
  }
}
