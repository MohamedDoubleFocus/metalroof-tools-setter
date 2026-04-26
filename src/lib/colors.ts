import { ColorDefinition } from "@/types";

export const COLORS: Record<string, ColorDefinition> = {
  Black: {
    name: "Black",
    frenchName: "Noir",
    ral: "RAL 9005",
    hex: "#0A0A0D",
  },
  "Slate Gray": {
    name: "Slate Gray",
    frenchName: "Gris Ardoise",
    ral: "RAL 7024",
    hex: "#474A50",
  },
  "Tile Red": {
    name: "Tile Red",
    frenchName: "Rouge Tuile",
    ral: "N/A",
    hex: "#C45A3C",
    description:
      "bright terracotta red with warm orange-red tones, like a classic clay tile color",
  },
  Burgundy: {
    name: "Burgundy",
    frenchName: "Bordeaux",
    ral: "RAL 3009",
    hex: "#6B2D2F",
  },
  Mocha: {
    name: "Mocha",
    frenchName: "Moka",
    ral: "RAL 8019",
    hex: "#403A3A",
  },
  Chocolate: {
    name: "Chocolate",
    frenchName: "Chocolat",
    ral: "RAL 8017",
    hex: "#44322D",
  },
  Terracotta: {
    name: "Terracotta",
    frenchName: "Terre Cuite",
    ral: "RAL 8004",
    hex: "#8E4B2E",
  },
  "Blue Gray": {
    name: "Blue Gray",
    frenchName: "Bleu Gris",
    ral: "RAL 7016",
    hex: "#293133",
  },
};

export const COLOR_KEYS = Object.keys(COLORS);
