import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-helpers";

// POST - Assign finishing untuk batch (DEPRECATED - use sub-batch flow)
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
          "Proses finishing wajib melalui sub-batch. Silakan assign finisher melalui sub-batch setelah penjahitan selesai.",
        hint: "Gunakan endpoint PATCH /api/production-batches/[batchId]/sub-batches/[subBatchId] dengan action 'assign-finisher'",
      },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { success: false, error: "Endpoint deprecated" },
      { status: 500 }
    );
  }
}
    await prisma.notification.create({
      data: {
        userId: assignedToId,
        type: "BATCH_ASSIGNMENT",
        title: "Finishing Task Baru",
        message: `Batch ${batch.batchSku} (${batch.product.name}) telah ditugaskan untuk finishing. Pieces: ${piecesReceived}`,
        isRead: false,
      },
    });

    return NextResponse.json(finishingTask, { status: 201 });
  } catch (error) {
    console.error("Error assigning to finishing:", error);
    return NextResponse.json(
      { error: "Failed to assign to finishing" },
      { status: 500 },
    );
  }
}
