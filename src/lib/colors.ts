import { ColorDefinition } from "@/types";

/**
 * MTM commercial paint palette — exactly the 7 colors we can actually deliver.
 *
 * Each entry references a swatch photo under public/color-refs/<refSlug>.png.
 * The pipeline passes this swatch as a second image_input to nano-banana-2
 * so the model has a direct visual anchor for the color — RAL codes alone
 * are too vague for the model to nail consistently.
 */

export const COLORS: Record<string, ColorDefinition> = {
  "Colonial Red": {
    name: "Colonial Red",
    frenchName: "Rouge Colonial",
    ral: "RAL 3009",
    hex: "#6D2922",
    refSlug: "colonial-red",
  },
  "Brown Mocha": {
    name: "Brown Mocha",
    frenchName: "Brun Moka",
    ral: "RAL 8019",
    hex: "#3F3A3A",
    refSlug: "brown-mocha",
  },
  "Chocolate Brown": {
    name: "Chocolate Brown",
    frenchName: "Brun Chocolat",
    ral: "RAL 8017",
    hex: "#45322E",
    refSlug: "chocolate-brown",
  },
  "Terra Cotta": {
    name: "Terra Cotta",
    frenchName: "Terre Cuite",
    ral: "RAL 8004",
    hex: "#8E402A",
    refSlug: "terra-cotta",
  },
  "Jungle Green": {
    name: "Jungle Green",
    frenchName: "Vert Jungle",
    ral: "RAL 6020",
    hex: "#3E513A",
    refSlug: "jungle-green",
  },
  "Blue Gray": {
    name: "Blue Gray",
    frenchName: "Bleu Gris",
    ral: "RAL 7016",
    hex: "#293133",
    refSlug: "blue-gray",
  },
  Black: {
    name: "Black",
    frenchName: "Noir",
    ral: "RAL 9005",
    hex: "#0A0A0A",
    refSlug: "black",
  },
};

export const COLOR_KEYS = Object.keys(COLORS);

/**
 * Build the absolute URL of the swatch reference image for the given color.
 * Returns null if the color has no `refSlug` or no base URL is configured.
 */
export function getColorReferenceUrl(
  color: ColorDefinition,
  publicBaseUrl: string | undefined
): string | null {
  if (!color.refSlug || !publicBaseUrl) return null;
  return `${publicBaseUrl.replace(/\/$/, "")}/color-refs/${color.refSlug}.png`;
}
