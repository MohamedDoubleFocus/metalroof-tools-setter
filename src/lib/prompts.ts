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

export function getWaveTilePrompt(color: ColorDefinition): string {
  const colorLine = getColorLine(color);

  return `Replace only the main roof covering material on this house. The output roof area must equal the input roof area exactly — no more, no less.

Cover 100% of the original roof surface. Match the exact roof boundaries at pixel level. If the original has multiple roof sections, keep every single one — do not merge, split, add, or omit any section.

Apply a European S-curve wave tile metal roof. The material is steel with a baked enamel semi-gloss metallic finish. The profile shows a continuous S-curve wave pattern with wave rows running along the roof slope. ${colorLine}

Never modify walls, facades, windows, doors, gutters, soffits, trim, porches, garages, awnings, carports, or secondary roofs. Do not add roofing material to any surface that is not already a roof. Do not extend the roof beyond its original edges.

Keep the full house structure unchanged. Keep the roof geometry, shape, pitch, angles, ridges, hips, valleys, and overhangs identical. Keep the environment, vegetation, sky, lighting, shadows, and season exactly as they are in the original photo.

The result must be photorealistic. The original roof boundaries must remain locked. The image passes validation only if the roof area is identical to the original and absolutely nothing else has changed.`;
}

export function getStandingSeamPrompt(color: ColorDefinition): string {
  const colorLine = getColorLine(color);

  return `Replace only the main roof covering material on this house. The output roof area must equal the input roof area exactly — no more, no less.

Cover 100% of the original roof surface. Match the exact roof boundaries at pixel level. If the original has multiple roof sections, keep every single one — do not merge, split, add, or omit any section.

Apply a Standing Seam metal roof. The material is steel or aluminum panels with a matte low-sheen metallic finish. The panels are smooth and flat with vertical raised seams spaced 14 inches apart, running from ridge to eave. ${colorLine}

Never modify walls, facades, windows, doors, gutters, soffits, trim, porches, garages, awnings, carports, or secondary roofs. Do not add roofing material to any surface that is not already a roof. Do not extend the roof beyond its original edges.

Keep the full house structure unchanged. Keep the roof geometry, shape, pitch, angles, ridges, hips, valleys, and overhangs identical. Keep the environment, vegetation, sky, lighting, shadows, and season exactly as they are in the original photo.

The result must be photorealistic. The original roof boundaries must remain locked. The image passes validation only if the roof area is identical to the original and absolutely nothing else has changed.`;
}
