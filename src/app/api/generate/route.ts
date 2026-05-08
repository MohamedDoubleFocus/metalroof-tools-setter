import { NextRequest } from "next/server";
import { COLORS } from "@/lib/colors";
import {
  getEnhancementPrompt,
  getWaveTilePrompt,
  getStandingSeamPrompt,
  getShingleTilePrompt,
} from "@/lib/prompts";
import { createTask, pollTaskResult } from "@/lib/kie-ai";
import type { RoofStyle } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 300;

interface RoofTaskDef {
  index: number;
  colorKey: string;
  roofStyle: RoofStyle;
  prompt: string;
}

export async function POST(request: NextRequest) {
  const { imageUrl, colors, styles } = await request.json();

  const validStyles: RoofStyle[] = ["wave_tile", "standing_seam", "shingle_tile"];
  const selectedStyles: RoofStyle[] = (styles || validStyles).filter(
    (s: string) => validStyles.includes(s as RoofStyle)
  );

  if (!imageUrl || !colors || colors.length === 0 || selectedStyles.length === 0) {
    return new Response(
      JSON.stringify({ error: "Paramètres invalides" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  for (const key of colors) {
    if (!COLORS[key]) {
      return new Response(
        JSON.stringify({ error: `Couleur inconnue: ${key}` }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  // Build roof tasks (index 0 = enhancement, rest = roof tasks)
  const roofTasks: RoofTaskDef[] = [];
  let idx = 1; // start at 1, index 0 is enhancement
  for (const colorKey of colors) {
    const color = COLORS[colorKey];
    if (selectedStyles.includes("wave_tile")) {
      roofTasks.push({
        index: idx++,
        colorKey,
        roofStyle: "wave_tile",
        prompt: getWaveTilePrompt(color),
      });
    }
    if (selectedStyles.includes("standing_seam")) {
      roofTasks.push({
        index: idx++,
        colorKey,
        roofStyle: "standing_seam",
        prompt: getStandingSeamPrompt(color),
      });
    }
    if (selectedStyles.includes("shingle_tile")) {
      roofTasks.push({
        index: idx++,
        colorKey,
        roofStyle: "shingle_tile",
        prompt: getShingleTilePrompt(color),
      });
    }
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function send(data: Record<string, unknown>) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
        );
      }

      // ─── STEP 1: Enhancement ───
      let enhancedImageUrl = imageUrl;

      try {
        send({
          type: "progress",
          taskIndex: 0,
          taskType: "enhancement",
          colorKey: "",
          roofStyle: "",
          status: "creating",
        });

        const enhanceTaskId = await createTask(
          getEnhancementPrompt(),
          imageUrl
        );

        send({
          type: "progress",
          taskIndex: 0,
          taskType: "enhancement",
          colorKey: "",
          roofStyle: "",
          status: "polling",
          taskId: enhanceTaskId,
        });

        const enhanceUrls = await pollTaskResult(enhanceTaskId);
        enhancedImageUrl = enhanceUrls[0] || imageUrl;

        send({
          type: "progress",
          taskIndex: 0,
          taskType: "enhancement",
          colorKey: "",
          roofStyle: "",
          status: "success",
          resultUrl: enhancedImageUrl,
        });
      } catch (err) {
        // If enhancement fails, continue with original image
        send({
          type: "error",
          taskIndex: 0,
          taskType: "enhancement",
          colorKey: "",
          roofStyle: "",
          status: "error",
          error: err instanceof Error ? err.message : "Erreur d'amélioration",
        });
      }

      // ─── STEP 2: Roof generations using enhanced image ───
      const pLimit = (await import("p-limit")).default;
      const limit = pLimit(3);

      const promises = roofTasks.map((task) =>
        limit(async () => {
          try {
            send({
              type: "progress",
              taskIndex: task.index,
              taskType: "roof",
              colorKey: task.colorKey,
              roofStyle: task.roofStyle,
              status: "creating",
            });

            const taskId = await createTask(task.prompt, enhancedImageUrl);

            send({
              type: "progress",
              taskIndex: task.index,
              taskType: "roof",
              colorKey: task.colorKey,
              roofStyle: task.roofStyle,
              status: "polling",
              taskId,
            });

            const resultUrls = await pollTaskResult(taskId);
            const resultUrl = resultUrls[0];

            send({
              type: "progress",
              taskIndex: task.index,
              taskType: "roof",
              colorKey: task.colorKey,
              roofStyle: task.roofStyle,
              status: "success",
              resultUrl,
            });
          } catch (err) {
            send({
              type: "error",
              taskIndex: task.index,
              taskType: "roof",
              colorKey: task.colorKey,
              roofStyle: task.roofStyle,
              status: "error",
              error: err instanceof Error ? err.message : "Erreur inconnue",
            });
          }
        })
      );

      await Promise.all(promises);
      send({ type: "complete" });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
