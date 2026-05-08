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
  shingleTileBuffer?: Buffer;
}

interface PdfParams {
  originalImageBuffer: Buffer;
  colorPages: ColorPage[];
  // Optional back-side data
  backOriginalImageBuffer?: Buffer;
  backColorPages?: ColorPage[];
  logoBuffer: Buffer;
  clientName?: string;
}

function drawBlackHeader(
  doc: PDFKit.PDFDocument,
  logoBuffer: Buffer,
  rightText?: string
) {
  doc.rect(0, 0, PAGE_W, HEADER_H).fill(BLACK);
  doc.image(logoBuffer, MARGIN, 12, { height: 36 });

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

function drawColorPage(
  doc: PDFKit.PDFDocument,
  page: ColorPage,
  logoBuffer: Buffer,
  sideLabel?: string
) {
  doc.addPage();

  const colorLabel =
    page.color.ral !== "N/A"
      ? `${page.color.frenchName} — ${page.color.ral}`
      : page.color.frenchName;

  const headerLabel = sideLabel ? `${sideLabel} • ${colorLabel}` : colorLabel;
  drawBlackHeader(doc, logoBuffer, headerLabel);

  const hasWave = !!page.waveTileBuffer;
  const hasSeam = !!page.standingSeamBuffer;
  const hasShingle = !!page.shingleTileBuffer;
  const styleCount =
    (hasWave ? 1 : 0) + (hasSeam ? 1 : 0) + (hasShingle ? 1 : 0);

  const imgW = CONTENT_W * 0.92;
  const imgH = styleCount >= 3 ? 195 : styleCount === 2 ? 270 : 480;
  const imgX = (PAGE_W - imgW) / 2;
  let curY = HEADER_H + 14;

  const drawStyle = (buffer: Buffer, label: string) => {
    doc.image(buffer, imgX, curY, {
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
        `${label}  •  ${page.color.frenchName} (${page.color.hex})`,
        imgX + 20,
        curY + 2
      );
    curY += 24;
  };

  if (hasWave) drawStyle(page.waveTileBuffer!, "Tuile Ondulée Européenne");
  if (hasSeam) drawStyle(page.standingSeamBuffer!, "Joint Debout");
  if (hasShingle) drawStyle(page.shingleTileBuffer!, "Tuile Écaille Européenne");

  drawFooter(doc);
}

function drawSectionDivider(
  doc: PDFKit.PDFDocument,
  logoBuffer: Buffer,
  title: string,
  subtitle: string,
  imageBuffer?: Buffer
) {
  doc.addPage();
  drawBlackHeader(doc, logoBuffer);

  const titleY = HEADER_H + 80;

  doc
    .fontSize(11)
    .fillColor(ACCENT)
    .font("Helvetica-Bold")
    .text("SECTION", MARGIN, titleY, {
      align: "center",
      width: CONTENT_W,
      characterSpacing: 4,
    });

  doc
    .fontSize(36)
    .fillColor(BLACK)
    .font("Helvetica-Bold")
    .text(title, MARGIN, titleY + 24, {
      align: "center",
      width: CONTENT_W,
    });

  doc
    .moveTo(PAGE_W / 2 - 40, titleY + 78)
    .lineTo(PAGE_W / 2 + 40, titleY + 78)
    .strokeColor(ACCENT)
    .lineWidth(3)
    .stroke();

  doc
    .fontSize(13)
    .fillColor("#333333")
    .font("Helvetica")
    .text(subtitle, MARGIN, titleY + 96, {
      align: "center",
      width: CONTENT_W,
    });

  if (imageBuffer) {
    const photoW = CONTENT_W * 0.7;
    const photoMaxH = 380;
    const photoX = (PAGE_W - photoW) / 2;
    const photoY = titleY + 140;
    doc.image(imageBuffer, photoX, photoY, {
      fit: [photoW, photoMaxH],
      align: "center",
      valign: "center",
    });
  }

  drawFooter(doc);
}

export async function buildPdf(params: PdfParams): Promise<Buffer> {
  const {
    originalImageBuffer,
    colorPages,
    backOriginalImageBuffer,
    backColorPages,
    logoBuffer,
    clientName,
  } = params;

  const hasBack = !!(
    backOriginalImageBuffer &&
    backColorPages &&
    backColorPages.length > 0
  );

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

    const photoW = CONTENT_W * 0.85;
    const photoMaxH = 420;
    const photoX = (PAGE_W - photoW) / 2;
    const photoY = titleY + 120;

    doc.image(originalImageBuffer, photoX, photoY, {
      fit: [photoW, photoMaxH],
      align: "center",
      valign: "center",
    });

    doc
      .fontSize(9)
      .fillColor("#999999")
      .text(
        hasBack
          ? "Photo originale — vue avant"
          : "Photo originale de votre maison",
        MARGIN,
        photoY + photoMaxH + 8,
        { align: "center", width: CONTENT_W }
      );

    drawFooter(doc);

    // ─── FRONT COLOR PAGES ───
    for (const page of colorPages) {
      drawColorPage(doc, page, logoBuffer, hasBack ? "AVANT" : undefined);
    }

    // ─── BACK SECTION (if applicable) ───
    if (hasBack) {
      drawSectionDivider(
        doc,
        logoBuffer,
        "ARRIÈRE",
        "Simulations de la vue arrière de votre maison",
        backOriginalImageBuffer
      );

      for (const page of backColorPages!) {
        drawColorPage(doc, page, logoBuffer, "ARRIÈRE");
      }
    }

    // ─── FINAL PAGE: CTA / CONTACT ───
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
