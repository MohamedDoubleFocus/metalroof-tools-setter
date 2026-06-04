import { NextRequest, NextResponse } from "next/server";
import { COLORS, getColorReferenceUrl } from "@/lib/colors";
import {
  getEnhancementPrompt,
  getWaveTilePrompt,
  getStandingSeamPrompt,
  getShingleTilePrompt,
} from "@/lib/prompts";
import { createTask } from "@/lib/kie-ai";
import type { RoofStyle } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const { imageUrl, taskType, colorKey, roofStyle, customInstructions } = (await request.json()) as {
    imageUrl: string;
    taskType: "enhancement" | "roof";
    colorKey?: string;
    roofStyle?: RoofStyle;
    customInstructions?: string;
  };

  if (!imageUrl) {
    return NextResponse.json({ error: "imageUrl requis" }, { status: 400 });
  }

  try {
    let prompt: string;
    const imageUrls: string[] = [imageUrl];

    if (taskType === "enhancement") {
      prompt = getEnhancementPrompt();
    } else {
      if (!colorKey || !roofStyle || !COLORS[colorKey]) {
        return NextResponse.json({ error: "Parametres invalides" }, { status: 400 });
      }
      const color = COLORS[colorKey];
      if (roofStyle === "wave_tile") {
        prompt = getWaveTilePrompt(color, customInstructions);
      } else if (roofStyle === "standing_seam") {
        prompt = getStandingSeamPrompt(color, customInstructions);
      } else {
        prompt = getShingleTilePrompt(color, customInstructions);
      }

      // Append the color swatch reference so the model has a visual anchor
      // for the target paint color — see /color-refs in /public.
      const publicBaseUrl =
        process.env.NEXT_PUBLIC_APP_URL ||
        process.env.NEXTAUTH_URL ||
        new URL(request.url).origin;
      const refUrl = getColorReferenceUrl(color, publicBaseUrl);
      if (refUrl) imageUrls.push(refUrl);
    }

    // Only create the task, return taskId immediately
    const taskId = await createTask(prompt, imageUrls);

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
