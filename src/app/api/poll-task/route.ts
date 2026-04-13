import { NextRequest, NextResponse } from "next/server";
import { pollTaskResult } from "@/lib/kie-ai";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const { taskId } = (await request.json()) as { taskId: string };

  if (!taskId) {
    return NextResponse.json({ error: "taskId requis" }, { status: 400 });
  }

  try {
    const resultUrls = await pollTaskResult(taskId, 280000);
    return NextResponse.json({
      status: "success",
      resultUrl: resultUrls[0] || null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";

    if (message.includes("timed out")) {
      return NextResponse.json({ status: "timeout", error: message });
    }

    return NextResponse.json({ status: "error", error: message });
  }
}
