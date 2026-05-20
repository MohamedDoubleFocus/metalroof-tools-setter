import path from "path";
import fs from "fs";

let logoPngCache: Buffer | null = null;
let warrantyLogoPngCache: Buffer | null = null;

export async function downloadImageAsBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to download image (${res.status}): ${url}`);
  }
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Logo used everywhere by default (simulation PDFs, etc).
 * Source: assets/logo.webp.
 */
export async function getLogoPngBuffer(): Promise<Buffer> {
  if (logoPngCache) return logoPngCache;

  const sharp = (await import("sharp")).default;
  const logoPath = path.join(process.cwd(), "assets", "logo.webp");
  const webpBuffer = fs.readFileSync(logoPath);
  logoPngCache = await sharp(webpBuffer).png().toBuffer();
  return logoPngCache;
}

/**
 * Dedicated logo for the warranty certificate PDF.
 * Source: assets/logo-warranty.png. Falls back to the default logo if the
 * dedicated file is missing — keeps the warranty flow from crashing if the
 * file hasn't been added yet.
 */
export async function getWarrantyLogoPngBuffer(): Promise<Buffer> {
  if (warrantyLogoPngCache) return warrantyLogoPngCache;

  const dedicatedPath = path.join(
    process.cwd(),
    "assets",
    "logo-warranty.png"
  );

  if (!fs.existsSync(dedicatedPath)) {
    console.warn(
      "[warranty-logo] assets/logo-warranty.png introuvable — fallback sur le logo par défaut."
    );
    return getLogoPngBuffer();
  }

  warrantyLogoPngCache = fs.readFileSync(dedicatedPath);
  return warrantyLogoPngCache;
}
