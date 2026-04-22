import { NextRequest, NextResponse } from "next/server";
import { COLORS } from "@/lib/colors";
import {
  getEnhancementPrompt,
  getWaveTilePrompt,
  getStandingSeamPrompt,
} from "@/lib/prompts";
import { createTask } from "@/lib/kie-ai";
import type { RoofStyle } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 60;

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

    // Only create the task, return taskId immediately
    const taskId = await createTask(prompt, imageUrl);

    return NextResponse.json({
      status: "created",
      taskId,
    });
  } catch (err) {
    return NextResponse.json({
      status: "error",
      error: err instanceof Error ? err.message : "Erreur inconnue",
    });
  }
}
