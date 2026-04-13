import PDFDocument from "pdfkit";
import { ColorDefinition } from "@/types";

const ACCENT = "#9C082D";
const BLACK = "#000000";
const PAGE_W = 612;
const PAGE_H = 792;
const MARGIN = 36;
const CONTENT_W = PAGE_W - MARGIN * 2;
const HEADER_H = 60;

interface ColorPage {
  color: ColorDefinition;
  waveTileBuffer?: Buffer;
  standingSeamBuffer?: Buffer;
}

interface PdfParams {
  originalImageBuffer: Buffer;
  colorPages: ColorPage[];
  logoBuffer: Buffer;
  clientName?: string;
}

function drawBlackHeader(
  doc: PDFKit.PDFDocument,
  logoBuffer: Buffer,
  rightText?: string
) {
  // Black banner
  doc.rect(0, 0, PAGE_W, HEADER_H).fill(BLACK);

  // Logo (white on black)
  doc.image(logoBuffer, MARGIN, 12, { height: 36 });

  // Right text if provided
  if (rightText) {
    doc
      .fontSize(14)
      .fillColor("#FFFFFF")
      .font("Helvetica-Bold")
      .text(rightText, PAGE_W / 2, 22, {
        width: PAGE_W / 2 - MARGIN,
        align: "right",
      });
  }
}

function drawFooter(doc: PDFKit.PDFDocument) {
  const y = PAGE_H - 28;
  doc
    .fontSize(7)
    .fillColor("#999999")
    .font("Helvetica")
    .text(
      "Metal Roof Montreal  |  metalroofmontreal.com  |  (514) 867-0787",
      MARGIN,
      y,
      { align: "center", width: CONTENT_W }
    );
}

export async function buildPdf(params: PdfParams): Promise<Buffer> {
  const { originalImageBuffer, colorPages, logoBuffer, clientName } = params;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "LETTER",
      margins: { top: 0, bottom: 0, left: 0, right: 0 },
      autoFirstPage: false,
    });

    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // ─── PAGE 1: COVER ───
    doc.addPage();
    drawBlackHeader(doc, logoBuffer);

    // Title block — tight spacing
    const titleY = HEADER_H + 20;
    doc
      .fontSize(26)
      .fillColor(BLACK)
      .font("Helvetica-Bold")
      .text("Votre Simulation de Toiture", MARGIN, titleY, {
        align: "center",
        width: CONTENT_W,
      });
    doc
      .fontSize(26)
      .text("Personnalisée", MARGIN, titleY + 32, {
        align: "center",
        width: CONTENT_W,
      });

    // Subtitle / Client name
    doc
      .fontSize(14)
      .fillColor(ACCENT)
      .font("Helvetica-Bold")
      .text(
        clientName
          ? `Préparée pour ${clientName}`
          : "Préparée exclusivement pour vous",
        MARGIN,
        titleY + 72,
        { align: "center", width: CONTENT_W }
      );

    // Date
    const now = new Date();
    const dateStr = now.toLocaleDateString("fr-CA", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    doc
      .fontSize(10)
      .fillColor("#666666")
      .text(dateStr, MARGIN, titleY + 92, {
        align: "center",
        width: CONTENT_W,
      });

    // Original photo — LARGE (80% width)
    const photoW = CONTENT_W * 0.85;
    const photoMaxH = 420;
    const photoX = (PAGE_W - photoW) / 2;
    const photoY = titleY + 120;

    doc.image(originalImageBuffer, photoX, photoY, {
      fit: [photoW, photoMaxH],
      align: "center",
      valign: "center",
    });

    // Label under photo
    doc
      .fontSize(9)
      .fillColor("#999999")
      .text("Photo originale de votre maison", MARGIN, photoY + photoMaxH + 8, {
        align: "center",
        width: CONTENT_W,
      });

    drawFooter(doc);

    // ─── PAGES 2-4: COLOR PAGES ───
    for (const page of colorPages) {
      doc.addPage();

      const colorLabel =
        page.color.ral !== "N/A"
          ? `${page.color.frenchName} — ${page.color.ral}`
          : page.color.frenchName;

      drawBlackHeader(doc, logoBuffer, colorLabel);

      const hasWave = !!page.waveTileBuffer;
      const hasSeam = !!page.standingSeamBuffer;
      const hasBoth = hasWave && hasSeam;

      const imgW = CONTENT_W * 0.92;
      // If only 1 style, use more vertical space
      const imgH = hasBoth ? 270 : 480;
      const imgX = (PAGE_W - imgW) / 2;
      let curY = HEADER_H + 14;

      if (hasWave) {
        doc.image(page.waveTileBuffer!, imgX, curY, {
          fit: [imgW, imgH],
          align: "center",
          valign: "center",
        });
        curY += imgH + 4;

        doc.rect(imgX, curY, 14, 14).fill(page.color.hex);
        doc
          .fontSize(9)
          .fillColor("#333333")
          .font("Helvetica-Bold")
          .text(
            `Tuile Ondulée Européenne  •  ${page.color.frenchName} (${page.color.hex})`,
            imgX + 20,
            curY + 2
          );
        curY += 24;
      }

      if (hasSeam) {
        doc.image(page.standingSeamBuffer!, imgX, curY, {
          fit: [imgW, imgH],
          align: "center",
          valign: "center",
        });
        curY += imgH + 4;

        doc.rect(imgX, curY, 14, 14).fill(page.color.hex);
        doc
          .fontSize(9)
          .fillColor("#333333")
          .font("Helvetica-Bold")
          .text(
            `Joint Debout  •  ${page.color.frenchName} (${page.color.hex})`,
            imgX + 20,
            curY + 2
          );
      }

      drawFooter(doc);
    }

    // ─── PAGE 5: CTA / CONTACT ───
    doc.addPage();
    drawBlackHeader(doc, logoBuffer);

    const ctaY = 180;
    doc
      .fontSize(28)
      .fillColor(BLACK)
      .font("Helvetica-Bold")
      .text("Prêt à transformer", MARGIN, ctaY, {
        align: "center",
        width: CONTENT_W,
      });
    doc.text("votre maison ?", MARGIN, ctaY + 36, {
      align: "center",
      width: CONTENT_W,
    });

    // Accent line
    doc
      .moveTo(PAGE_W / 2 - 40, ctaY + 80)
      .lineTo(PAGE_W / 2 + 40, ctaY + 80)
      .strokeColor(ACCENT)
      .lineWidth(3)
      .stroke();

    doc
      .fontSize(13)
      .fillColor("#333333")
      .font("Helvetica")
      .text(
        "Contactez-nous dès aujourd'hui pour obtenir\nune soumission gratuite et personnalisée.",
        MARGIN,
        ctaY + 100,
        { align: "center", width: CONTENT_W }
      );

    // Contact block
    const contactY = ctaY + 170;
    doc
      .fontSize(16)
      .fillColor(ACCENT)
      .font("Helvetica-Bold")
      .text("Metal Roof Montreal", MARGIN, contactY, {
        align: "center",
        width: CONTENT_W,
      });
    doc
      .fontSize(12)
      .fillColor("#333333")
      .font("Helvetica")
      .text("metalroofmontreal.com", MARGIN, contactY + 28, {
        align: "center",
        width: CONTENT_W,
      });
    doc.text("(514) 867-0787", MARGIN, contactY + 46, {
      align: "center",
      width: CONTENT_W,
    });

    // Disclaimer
    doc
      .fontSize(7)
      .fillColor("#AAAAAA")
      .font("Helvetica")
      .text(
        "Les images présentées dans ce document sont des simulations approximatives. Le résultat final après installation peut différer des visualisations présentées. Ces images sont fournies à titre indicatif uniquement.",
        MARGIN + 30,
        PAGE_H - 70,
        { align: "center", width: CONTENT_W - 60 }
      );

    drawFooter(doc);

    doc.end();
  });
}
