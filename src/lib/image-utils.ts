import path from "path";
import fs from "fs";

let logoPngCache: Buffer | null = null;

export async function downloadImageAsBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to download image (${res.status}): ${url}`);
  }
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function getLogoPngBuffer(): Promise<Buffer> {
  if (logoPngCache) return logoPngCache;

  const sharp = (await import("sharp")).default;
  const logoPath = path.join(process.cwd(), "assets", "logo.webp");
  const webpBuffer = fs.readFileSync(logoPath);
  logoPngCache = await sharp(webpBuffer).png().toBuffer();
  return logoPngCache;
}
