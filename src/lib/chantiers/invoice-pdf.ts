/**
 * Final invoice PDF — 1 page, simple total + thank-you note.
 *
 * Generated from a Chantier when the office triggers "Envoyer facture".
 * Same MTM visual identity as the warranty certificate.
 */

import PDFDocument from "pdfkit";
import type { Chantier } from "@/types/chantiers";

const ACCENT = "#9C082D";
const BLACK = "#000000";
const PAGE_W = 612;
const PAGE_H = 792;
const MARGIN = 60;
const CONTENT_W = PAGE_W - MARGIN * 2;

export interface BuildInvoiceParams {
  chantier: Chantier;
  logoBuffer: Buffer;
  /** Invoice number — generate via `formatInvoiceNumber(chantier, issuedAt)`. */
  invoiceNumber: string;
  /** Issuance timestamp (ms). */
  issuedAt: number;
}

export function formatInvoiceNumber(
  chantier: Chantier,
  issuedAt: number
): string {
  const year = new Date(issuedAt).getFullYear();
  // Short slug from chantier id — last 6 chars, uppercased.
  const slug = chantier.id
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(-6)
    .toUpperCase();
  return `INV-${year}-${slug}`;
}

function formatDate(ts: number): string {
  return new Intl.DateTimeFormat("fr-CA", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(ts));
}

function formatAmount(n: number): string {
  return new Intl.NumberFormat("fr-CA", {
    style: "currency",
    currency: "CAD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

export async function buildInvoicePdf(params: BuildInvoiceParams): Promise<Buffer> {
  const { chantier, logoBuffer, invoiceNumber, issuedAt } = params;

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

    doc.addPage();

    // ─── Black header ─────────────────────────────────────────────
    doc.rect(0, 0, PAGE_W, 70).fill(BLACK);
    doc.image(logoBuffer, MARGIN, 18, { height: 36 });
    doc
      .fontSize(20)
      .fillColor("#FFFFFF")
      .font("Helvetica-Bold")
      .text("FACTURE", MARGIN, 28, {
        width: CONTENT_W,
        align: "right",
      });

    // ─── Invoice meta ────────────────────────────────────────────
    let y = 110;
    doc
      .fontSize(10)
      .fillColor(BLACK)
      .font("Helvetica")
      .text(`N° de facture :  ${invoiceNumber}`, MARGIN, y, {
        width: CONTENT_W,
        align: "right",
      });
    y += 16;
    doc.text(`Date d'émission :  ${formatDate(issuedAt)}`, MARGIN, y, {
      width: CONTENT_W,
      align: "right",
    });

    // ─── Client block ────────────────────────────────────────────
    y = 110;
    doc
      .fontSize(10)
      .fillColor("#6b7280")
      .font("Helvetica-Bold")
      .text("FACTURÉ À", MARGIN, y);
    y += 14;
    doc.fontSize(11).fillColor(BLACK).font("Helvetica-Bold").text(
      chantier.clientName,
      MARGIN,
      y
    );
    y += 14;
    doc.font("Helvetica").fontSize(10).text(chantier.addressLine1, MARGIN, y);
    y += 13;
    doc.text(chantier.addressLine2, MARGIN, y);
    if (chantier.clientEmail) {
      y += 13;
      doc.fillColor("#6b7280").text(chantier.clientEmail, MARGIN, y);
    }

    // ─── Line item ───────────────────────────────────────────────
    y = 250;
    doc
      .moveTo(MARGIN, y)
      .lineTo(PAGE_W - MARGIN, y)
      .strokeColor("#e5e7eb")
      .lineWidth(1)
      .stroke();
    y += 16;

    doc
      .fontSize(10)
      .fillColor("#6b7280")
      .font("Helvetica-Bold")
      .text("DESCRIPTION", MARGIN, y);
    doc.text("MONTANT", MARGIN, y, {
      width: CONTENT_W,
      align: "right",
    });
    y += 18;

    doc
      .fontSize(11)
      .fillColor(BLACK)
      .font("Helvetica")
      .text(
        `Installation toiture métallique — ${chantier.addressLine1}`,
        MARGIN,
        y,
        { width: CONTENT_W - 100 }
      );
    doc.text(
      chantier.totalAmount != null ? formatAmount(chantier.totalAmount) : "—",
      MARGIN,
      y,
      { width: CONTENT_W, align: "right" }
    );
    y += 30;

    doc
      .moveTo(MARGIN, y)
      .lineTo(PAGE_W - MARGIN, y)
      .strokeColor("#e5e7eb")
      .lineWidth(1)
      .stroke();
    y += 24;

    // ─── Total ───────────────────────────────────────────────────
    doc
      .fontSize(12)
      .fillColor("#6b7280")
      .font("Helvetica-Bold")
      .text("TOTAL", MARGIN, y, {
        width: CONTENT_W / 2,
      });
    doc
      .fontSize(20)
      .fillColor(ACCENT)
      .font("Helvetica-Bold")
      .text(
        chantier.totalAmount != null ? formatAmount(chantier.totalAmount) : "—",
        MARGIN,
        y - 6,
        { width: CONTENT_W, align: "right" }
      );
    y += 60;

    // ─── Thank-you note ──────────────────────────────────────────
    doc
      .fontSize(10)
      .fillColor("#374151")
      .font("Helvetica")
      .text(
        "Paiement dû à réception. Merci de votre confiance.",
        MARGIN,
        y,
        { width: CONTENT_W, align: "center" }
      );

    // ─── Footer ──────────────────────────────────────────────────
    doc
      .moveTo(MARGIN, PAGE_H - 60)
      .lineTo(PAGE_W - MARGIN, PAGE_H - 60)
      .strokeColor(ACCENT)
      .lineWidth(1)
      .stroke();

    doc
      .fontSize(8)
      .fillColor("#9ca3af")
      .font("Helvetica")
      .text(
        "Toiture Métallique Montréal · www.metalroofmontreal.ca · info@metalroofmontreal.ca · 514 867 0787",
        MARGIN,
        PAGE_H - 48,
        { width: CONTENT_W, align: "center" }
      );

    doc.end();
  });
}
