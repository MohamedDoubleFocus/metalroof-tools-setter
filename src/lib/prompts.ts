import { ColorDefinition } from "@/types";

export function getEnhancementPrompt(): string {
  return `Enhance this house photo for professional real estate presentation.

Preserve the exact structure of the house — walls, windows, doors, trim, fascia, soffits, gutters, and all architectural details must remain identical.

Reposition the viewpoint to show the house from a straight front-facing angle, centered and symmetrical. The facade should be fully visible.

Set the scene on a beautiful sunny summer day in Quebec: clear blue sky with a few soft white clouds, bright warm natural sunlight with soft realistic shadows, crisp clean air with excellent visibility.

Make the landscaping lush and vibrant: perfectly manicured green grass, healthy full green foliage, well-maintained hedges and decorative plants. The yard should look like peak summer with rich green tones.

Apply professional real estate photography style: ultra high-resolution, sharp details, warm vibrant magazine-quality color grading. Increase color vibrancy slightly, enhance contrast for a crisp clean look, sharpen architectural details, brighten shadows while keeping realism, make windows appear clean and reflective, ensure all materials look fresh and well-maintained.

Do not change the house design, architecture, window/door positions, number of floors, or roof shape. Do not add pools, cars, or people.`;
}

function getColorLine(color: ColorDefinition): string {
  if (color.ral === "N/A") {
    return `The color must be ${color.name} — ${color.description} (hex ${color.hex}). Match this exact tone.`;
  }
  return `The color must be ${color.name}, ${color.ral} (hex ${color.hex}). Do not approximate, shift the hue, change saturation, brighten, or darken. Strict RAL conformity required.`;
}

function getCustomInstructionsBlock(customInstructions?: string): string {
  const trimmed = customInstructions?.trim();
  if (!trimmed) return "";
  return `

ADDITIONAL CUSTOM INSTRUCTIONS — These are explicit user-provided directives that take PRIORITY over the general preservation rules above, but ONLY for the specific elements they mention. Apply them strictly and photorealistically:

${trimmed}

For any element NOT mentioned in these custom instructions, fall back to the preservation rules above (keep original color, material, and texture).`;
}

export function getWaveTilePrompt(color: ColorDefinition, customInstructions?: string): string {
  const colorLine = getColorLine(color);
  const customBlock = getCustomInstructionsBlock(customInstructions);

  return `Replace ONLY the main roof covering material on this house. The output roof area must equal the input roof area exactly — no more, no less.

Cover 100% of the original roof surface. Match the exact roof boundaries at pixel level. If the original has multiple roof sections, keep every single one — do not merge, split, add, or omit any section.

Apply a European S-curve wave tile metal roof. The material is steel with a baked enamel semi-gloss metallic finish. The profile shows a continuous S-curve wave pattern with wave rows running along the roof slope. ${colorLine}

CRITICAL COLOR LOCK — The NEW roof color applies EXCLUSIVELY to the roof slopes/panels. It must NEVER bleed onto any other element.

The following elements MUST keep their ORIGINAL color, material, texture, and finish from the input photo — pixel identical, unchanged:
- Gutters (eavestroughs) — keep the exact original color they have in the input photo, do not tint, do not recolor, do not match to the new roof color
- Soffits (under-eave panels) — keep the exact original color they have in the input photo, do not tint, do not recolor, do not match to the new roof color
- Fascia boards and trim — keep original color unchanged
- Walls, siding, brick, stone, facades — keep original color unchanged
- Windows, doors, garage doors, shutters — keep original color unchanged
- Porches, decks, railings, columns, awnings, carports — keep original color unchanged
- Any secondary small roofs over porches or bay windows if they are not the main roof — keep original unchanged

Do NOT propagate, reflect, echo, or coordinate the new roof color onto gutters or soffits. Gutters and soffits are OFF-LIMITS — treat them as a protected mask.

Do not add roofing material to any surface that is not already a roof. Do not extend the roof beyond its original edges.

Keep the full house structure unchanged. Keep the roof geometry, shape, pitch, angles, ridges, hips, valleys, and overhangs identical. Keep the environment, vegetation, sky, lighting, shadows, and season exactly as they are in the original photo.${customBlock}

The result must be photorealistic. The original roof boundaries must remain locked. The image passes validation only if the roof area is identical to the original, gutters and soffits have the exact same color as the input (unless explicitly overridden by the custom instructions above), and absolutely nothing else has changed.`;
}

export function getShingleTilePrompt(color: ColorDefinition, customInstructions?: string): string {
  const colorLine = getColorLine(color);
  const customBlock = getCustomInstructionsBlock(customInstructions);

  return `Replace ONLY the main roof covering material on this house. The output roof area must equal the input roof area exactly — no more, no less.

Cover 100% of the original roof surface. Match the exact roof boundaries at pixel level. If the original has multiple roof sections, keep every single one — do not merge, split, add, or omit any section.

Apply a traditional European Mediterranean-style stamped metal scalloped tile roof — the classic "tuile écaille" / French-Spanish-Italian fish-scale / beaver-tail tile look from villas in Provence, Tuscany, and rural Spain, executed in pressed steel panels (similar to Permanent Roof, Roser, or Tilcor stamped metal tile systems). The roof is made of long horizontal pressed-steel panels stamped with multiple individual tile units per panel — but the final visual must read as discrete tiles, not as panels.

KEY VISUAL DETAILS — critical for matching the reference style:

- TILE SHAPE: Each individual tile is roughly square-to-slightly-rectangular, with a softly rounded HALF-CIRCLE SCALLOPED BOTTOM EDGE (fish-scale / beaver-tail silhouette), and a clearly visible CONVEX 3D DOME across the tile face — moderate doming, more than a subtle pillow but less than a deep barrel ridge. Each tile catches light on its convex top and shows a gentle shaded valley near its sides.

- DEEP CRISP SHADOW GROOVES — most important: there must be PRONOUNCED, SHARP, DARK SHADOW LINES around every tile. Strong vertical dark grooves separate adjacent tiles within a row. Strong horizontal dark shadow lines run where each row's tiles meet the row below — caused by a real, visible OVERLAPPING LIP at the bottom of each tile that physically protrudes outward and casts a crisp, dark, sharp horizontal shadow line on the row below. These shadow lines are deep and well-defined (not soft or subtle) — they are what gives the roof its characteristic crisp, three-dimensional, hand-laid clay-tile appearance. The shadow grooves should read as nearly black against the tile color.

- ROW PATTERN: Tiles are arranged in horizontal rows parallel to the eave, with rows STAGGERED / OFFSET BY HALF A TILE (brick / running-bond pattern) so the rounded bottom of each tile sits centered between the rounded bottoms of the two tiles in the row above. This creates the characteristic wavy scalloped horizontal banding when viewed from a distance.

- FINISH: low-sheen MATTE to semi-matte metallic baked enamel — uniform, with very slight textured/granular surface (like fine matte powder coat), and realistic specular highlights only where direct sun catches the gentle curvature of each dome. Never glossy, never plasticky, never reflective like sheet metal.

- SCALE: moderate residential tile scale — the size of traditional European clay tiles, not oversized industrial panels. ${colorLine}

CRITICAL COLOR LOCK — The NEW roof color applies EXCLUSIVELY to the roof slopes/panels. It must NEVER bleed onto any other element.

The following elements MUST keep their ORIGINAL color, material, texture, and finish from the input photo — pixel identical, unchanged:
- Gutters (eavestroughs) — keep the exact original color they have in the input photo, do not tint, do not recolor, do not match to the new roof color
- Soffits (under-eave panels) — keep the exact original color they have in the input photo, do not tint, do not recolor, do not match to the new roof color
- Fascia boards and trim — keep original color unchanged
- Walls, siding, brick, stone, facades — keep original color unchanged
- Windows, doors, garage doors, shutters — keep original color unchanged
- Porches, decks, railings, columns, awnings, carports — keep original color unchanged
- Any secondary small roofs over porches or bay windows if they are not the main roof — keep original unchanged

Do NOT propagate, reflect, echo, or coordinate the new roof color onto gutters or soffits. Gutters and soffits are OFF-LIMITS — treat them as a protected mask.

Do not add roofing material to any surface that is not already a roof. Do not extend the roof beyond its original edges.

Keep the full house structure unchanged. Keep the roof geometry, shape, pitch, angles, ridges, hips, valleys, and overhangs identical. Keep the environment, vegetation, sky, lighting, shadows, and season exactly as they are in the original photo.${customBlock}

The result must be photorealistic. The original roof boundaries must remain locked. The image passes validation only if the roof area is identical to the original, gutters and soffits have the exact same color as the input (unless explicitly overridden by the custom instructions above), and absolutely nothing else has changed.`;
}

export function getStandingSeamPrompt(color: ColorDefinition, customInstructions?: string): string {
  const colorLine = getColorLine(color);
  const customBlock = getCustomInstructionsBlock(customInstructions);

  return `Replace ONLY the main roof covering material on this house. The output roof area must equal the input roof area exactly — no more, no less.

Cover 100% of the original roof surface. Match the exact roof boundaries at pixel level. If the original has multiple roof sections, keep every single one — do not merge, split, add, or omit any section.

Apply a Standing Seam metal roof. The material is steel or aluminum panels with a matte low-sheen metallic finish. The panels are smooth and flat with vertical raised seams spaced 14 inches apart, running from ridge to eave. ${colorLine}

CRITICAL COLOR LOCK — The NEW roof color applies EXCLUSIVELY to the roof slopes/panels. It must NEVER bleed onto any other element.

The following elements MUST keep their ORIGINAL color, material, texture, and finish from the input photo — pixel identical, unchanged:
- Gutters (eavestroughs) — keep the exact original color they have in the input photo, do not tint, do not recolor, do not match to the new roof color
- Soffits (under-eave panels) — keep the exact original color they have in the input photo, do not tint, do not recolor, do not match to the new roof color
- Fascia boards and trim — keep original color unchanged
- Walls, siding, brick, stone, facades — keep original color unchanged
- Windows, doors, garage doors, shutters — keep original color unchanged
- Porches, decks, railings, columns, awnings, carports — keep original color unchanged
- Any secondary small roofs over porches or bay windows if they are not the main roof — keep original unchanged

Do NOT propagate, reflect, echo, or coordinate the new roof color onto gutters or soffits. Gutters and soffits are OFF-LIMITS — treat them as a protected mask.

Do not add roofing material to any surface that is not already a roof. Do not extend the roof beyond its original edges.

Keep the full house structure unchanged. Keep the roof geometry, shape, pitch, angles, ridges, hips, valleys, and overhangs identical. Keep the environment, vegetation, sky, lighting, shadows, and season exactly as they are in the original photo.${customBlock}

The result must be photorealistic. The original roof boundaries must remain locked. The image passes validation only if the roof area is identical to the original, gutters and soffits have the exact same color as the input (unless explicitly overridden by the custom instructions above), and absolutely nothing else has changed.`;
}
