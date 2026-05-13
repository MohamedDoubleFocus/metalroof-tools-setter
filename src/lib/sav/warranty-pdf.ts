/**
 * Warranty Certificate PDF generator.
 *
 * Builds a 2-page PDF matching the official "Garantie limitée transférable
 * de 50 ans" template, with the provided buyer info on page 1 and the full
 * legal terms on page 2.
 */

import PDFDocument from "pdfkit";

const ACCENT = "#9C082D";
const BLACK = "#000000";
const PAGE_W = 612; // Letter portrait
const PAGE_H = 792;
const MARGIN = 60;
const CONTENT_W = PAGE_W - MARGIN * 2;

export interface WarrantyParams {
  /** Full buyer name including civility, e.g. "Mme Edith Villalon" */
  buyerName: string;
  /** Street part of the address, e.g. "760 Pl. des Pointeliers" */
  addressLine1: string;
  /** City + province + postal code, e.g. "Montréal, QC H1B 5W5" */
  addressLine2: string;
  /** Installation date in YYYY/MM/DD format */
  installationDate: string;
  /** Logo as a PNG buffer (already converted from webp). */
  logoBuffer: Buffer;
}

const LEGAL_TEXT = `Toiture Métallique Montréal offre une garantie limitée de 50 ans sur le substrat d'acier à compter de la date de fin des travaux, couvrant les perforations par la rouille et les fuites, les défauts de fabrication ainsi que les dommages causés par des vents allant jusqu'à 150 km/h. Le revêtement est garanti pour ne pas s'écailler, se fissurer, se décolorer ni s'effriter de manière visible à l'œil nu dans des conditions extérieures normales pendant une période de 25 ans, à condition que toutes les conditions énumérées ci-dessous aient été respectées.

Toiture Métallique Montréal garantit que : (i) les services seront exécutés de façon professionnelle et soignée, et que les défauts de main-d'œuvre attribuables uniquement aux services rendus seront corrigés par Toiture Métallique Montréal sans frais supplémentaires pendant une période de 10 ans suivant l'installation ; et (ii) le produit demeurera exempt de défauts de fabrication et ne subira aucune perforation due à la rouille pendant 50 ans à partir de la date d'installation. Par « perforation due à la rouille », on entend un trou important qui traverse complètement ou de manière significative le produit, causé par la corrosion de l'intérieur ou du dessous des panneaux, entraînant une fuite.

La garantie est annulée pour toute section de toiture ayant une pente inférieure à 1-½ / 12. Toute utilisation non autorisée du produit à des fins autres que celles prévues entraîne l'annulation automatique de cette garantie. La garantie n'inclut pas les dommages causés par la neige ou la glace tombant du toit, que ce soit sur la propriété de l'acheteur ou sur une propriété voisine ou adjacente. Toiture Métallique Montréal ne pourra être tenue responsable des dommages causés par l'humidité résultant d'une perte de chaleur provenant d'un grenier mal isolé, causant la formation de barrages de glace, l'accumulation ou la chute de cônes de glace, ou encore la condensation générale. Toiture Métallique Montréal ne sera pas non plus responsable de toute croissance ou propagation de champignons ou moisissures découlant de tels dommages causés par l'humidité.

La garantie ne s'applique pas à la détérioration du revêtement de surface, y compris la décoloration, la perte d'éclat ou les taches causées par des conditions atmosphériques anormales, qui peuvent inclure, sans s'y limiter : les rayons ultraviolets, la pollution, la grêle, l'exposition au sel, les jets d'eau à haute pression, les produits chimiques corrosifs ou nocifs (dans le sol, les liquides ou les gaz), les excréments d'animaux ou les contaminants aériens.

La garantie ne couvre pas les dommages résultant ou attribuables aux éléments suivants : zones recevant de l'eau de ruissellement provenant de solins en plomb ou en cuivre, ou en contact métallique avec ces matériaux ; zones abritées n'étant pas exposées à des nettoyages réguliers par la pluie, comme le dessous des soffites ; présence de fumées ou condensats corrosifs émis à l'intérieur de l'habitation ou du bâtiment ; défaut de drainage libre de l'eau, y compris la condensation interne ; présence de débris non enlevés sur la toiture, les chevauchements, les panneaux ou autres surfaces.

Sont également exclus : les dommages causés par des catastrophes naturelles telles que la foudre, les tornades, les ouragans, la grêle extrême, les tremblements de terre, les chutes d'objets, etc. Les conditions pouvant se développer entre le métal et le revêtement et entraîner la dégradation de ce dernier sont également exclues. Dommages divers incluant, mais sans s'y limiter, les travaux effectués par d'autres entrepreneurs, par le propriétaire lui-même, les abus, le vandalisme, les incendies, les guerres ou les mouvements/affaissements de la structure du bâtiment.

Les réclamations pour des produits défectueux doivent être faites sans délai dès leur découverte. Elles doivent être transmises par écrit, accompagnées d'une copie de la facture originale (preuve de paiement), et d'une copie du certificat de garantie.`;

export async function buildWarrantyPdf(
  params: WarrantyParams
): Promise<Buffer> {
  const { buyerName, addressLine1, addressLine2, installationDate, logoBuffer } =
    params;

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

    // ─── PAGE 1 — COVER ───────────────────────────────────────────────
    doc.addPage();

    // Logo centered, ~120px wide
    const logoW = 140;
    doc.image(logoBuffer, (PAGE_W - logoW) / 2, 110, { width: logoW });

    // Brand title under logo
    doc
      .fontSize(11)
      .fillColor(BLACK)
      .font("Helvetica-Bold")
      .text("TOITURE MÉTALLIQUE", MARGIN, 250, {
        align: "center",
        width: CONTENT_W,
        characterSpacing: 3,
      });
    doc
      .fontSize(9)
      .fillColor("#666666")
      .text("MONTRÉAL", MARGIN, 268, {
        align: "center",
        width: CONTENT_W,
        characterSpacing: 4,
      });

    // Main title
    doc
      .fontSize(22)
      .fillColor(BLACK)
      .font("Helvetica-Bold")
      .text("CERTIFICAT DE GARANTIE", MARGIN, 320, {
        align: "center",
        width: CONTENT_W,
      });

    // Subtitle
    doc
      .fontSize(14)
      .font("Helvetica-Bold")
      .text("Garantie limitée transférable de 50 ans", MARGIN, 360, {
        align: "center",
        width: CONTENT_W,
      });

    // Buyer block
    let y = 420;
    doc
      .fontSize(13)
      .font("Helvetica-Bold")
      .fillColor(BLACK)
      .text(`Acheteurs : ${buyerName}`, MARGIN, y, {
        align: "center",
        width: CONTENT_W,
      });

    y += 40;
    doc.text(`Adresse : ${addressLine1}`, MARGIN, y, {
      align: "center",
      width: CONTENT_W,
    });
    y += 20;
    doc.text(addressLine2, MARGIN, y, {
      align: "center",
      width: CONTENT_W,
    });

    y += 50;
    doc.text(`Date d'installation : ${installationDate}`, MARGIN, y, {
      align: "center",
      width: CONTENT_W,
    });

    y += 24;
    doc
      .fontSize(10)
      .fillColor("#666666")
      .font("Helvetica")
      .text("(Sous réserve des termes et conditions au verso)", MARGIN, y, {
        align: "center",
        width: CONTENT_W,
      });

    // Footer contact info
    doc
      .fontSize(9)
      .fillColor("#444444")
      .font("Helvetica")
      .text("www.metalroofmontreal.ca", MARGIN, PAGE_H - 80, {
        align: "left",
        width: CONTENT_W,
      });
    doc.text("info@metalroofmontreal.ca", MARGIN, PAGE_H - 65, {
      align: "left",
      width: CONTENT_W,
    });
    doc.text("514 867 0787", MARGIN, PAGE_H - 50, {
      align: "left",
      width: CONTENT_W,
    });

    // ─── PAGE 2 — LEGAL TERMS ─────────────────────────────────────────
    doc.addPage();

    doc
      .fontSize(9)
      .fillColor("#222222")
      .font("Helvetica")
      .text(LEGAL_TEXT, MARGIN, MARGIN + 20, {
        align: "justify",
        width: CONTENT_W,
        lineGap: 3,
      });

    // Page 2 small footer with accent line
    doc
      .moveTo(MARGIN, PAGE_H - 50)
      .lineTo(PAGE_W - MARGIN, PAGE_H - 50)
      .strokeColor(ACCENT)
      .lineWidth(1)
      .stroke();

    doc
      .fontSize(7)
      .fillColor("#999999")
      .font("Helvetica")
      .text(
        "Toiture Métallique Montréal · www.metalroofmontreal.ca · 514 867 0787",
        MARGIN,
        PAGE_H - 40,
        { align: "center", width: CONTENT_W }
      );

    doc.end();
  });
}
