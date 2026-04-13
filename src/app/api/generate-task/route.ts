import { NextRequest, NextResponse } from "next/server";
import { COLORS } from "@/lib/colors";
import {
  getEnhancementPrompt,
  getWaveTilePrompt,
  getStandingSeamPrompt,
} from "@/lib/prompts";
import { createTask, pollTaskResult } from "@/lib/kie-ai";
import type { RoofStyle } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const { imageUrl, taskType, colorKey, roofStyle } = (await request.json()) as {
    imageUrl: string;
    taskType: "enhancement" | "roof";
    colorKey?: string;
    roofStyle?: RoofStyle;
  };

  if (!imageUrl) {
    return NextResponse.json({ error: "imageUrl requis" }, { status: 400 });
  }

  try {
    let prompt: string;

    if (taskType === "enhancement") {
      prompt = getEnhancementPrompt();
    } else {
      if (!colorKey || !roofStyle || !COLORS[colorKey]) {
        return NextResponse.json({ error: "Parametres invalides" }, { status: 400 });
      }
      const color = COLORS[colorKey];
      prompt =
        roofStyle === "wave_tile"
          ? getWaveTilePrompt(color)
          : getStandingSeamPrompt(color);
    }

    // Create task
    const taskId = await createTask(prompt, imageUrl);

    // Poll with 280s timeout (leave margin for Vercel's 300s limit)
    const resultUrls = await pollTaskResult(taskId, 280000);
    const resultUrl = resultUrls[0] || null;

    return NextResponse.json({
      status: "success",
      taskId,
      resultUrl,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";

    // If it's a timeout, return the taskId so client can retry polling
    if (message.includes("timed out")) {
      return NextResponse.json({
        status: "timeout",
        error: message,
      });
    }

    return NextResponse.json({
      status: "error",
      error: message,
    });
  }
}
