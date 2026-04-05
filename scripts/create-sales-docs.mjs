#!/usr/bin/env node
// Creates RxDesk sales one-pager (.docx) and pitch deck (.pptx)

import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, AlignmentType, BorderStyle, WidthType, ShadingType, HeadingLevel, LevelFormat, PageBreak } from "docx";
import PptxGenJS from "pptxgenjs";
import fs from "fs";
import path from "path";

const BLUE = "0071E3";
const DARK = "1D1D1F";
const MUTED = "6B7280";
const WHITE = "FFFFFF";
const LIGHT_BG = "F5F5F7";
const GREEN = "22C55E";
const outDir = path.resolve("docs");

// ─── WORD DOCUMENT ──────────────────────────────────────────────

async function createDocx() {
  const border = { style: BorderStyle.NONE, size: 0, color: WHITE };
  const noBorders = { top: border, bottom: border, left: border, right: border };
  const thinBorder = { style: BorderStyle.SINGLE, size: 1, color: "E5E5E5" };
  const cellBorders = { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder };

  const doc = new Document({
    styles: {
      default: { document: { run: { font: "Helvetica Neue", size: 22, color: DARK } } },
      paragraphStyles: [
        { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
          run: { size: 36, bold: true, font: "Helvetica Neue", color: DARK },
          paragraph: { spacing: { before: 120, after: 120 } } },
        { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
          run: { size: 28, bold: true, font: "Helvetica Neue", color: BLUE },
          paragraph: { spacing: { before: 200, after: 100 } } },
      ],
    },
    numbering: {
      config: [{
        reference: "bullets",
        levels: [{ level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 540, hanging: 270 } } } }],
      }],
    },
    sections: [
      // PAGE 1
      {
        properties: {
          page: {
            size: { width: 12240, height: 15840 },
            margin: { top: 720, right: 1080, bottom: 720, left: 1080 },
          },
        },
        children: [
          // Hero
          new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 }, children: [
            new TextRun({ text: "Rx", font: "Helvetica Neue", size: 48, bold: true, color: WHITE }),
          ], shading: { type: ShadingType.CLEAR, fill: BLUE }, }),

          new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 200, after: 40 }, children: [
            new TextRun({ text: "RxDesk", size: 56, bold: true, color: DARK }),
          ] }),
          new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 }, children: [
            new TextRun({ text: "Know your prescribers. Grow your scripts. Protect your revenue.", size: 26, italics: true, color: MUTED }),
          ] }),
          new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [
            new TextRun({ text: "The prescriber relationship platform built for independent pharmacies.", size: 22, color: MUTED }),
          ] }),

          // Divider
          new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: BLUE, space: 1 } }, spacing: { after: 200 }, children: [] }),

          // Modules
          new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("Platform Modules")] }),

          // Module table
          new Table({
            width: { size: 10080, type: WidthType.DXA },
            columnWidths: [3360, 3360, 3360],
            rows: [
              makeModuleRow([
                { title: "Provider Directory", desc: "Search NPI registry, import providers, track prescriber relationships with analytics" },
                { title: "Prescription Analytics", desc: "Upload Rx data, trend analysis, new/dormant alerts, concentration risk, payer mix" },
                { title: "Drug Rep Tracker", desc: "Log visits, track drugs promoted, correlate with Rx volume changes per provider" },
              ]),
              makeModuleRow([
                { title: "Time Tracking", desc: "Clock in/out, scheduling, PTO, overtime, planned vs actual comparison" },
                { title: "Reports & Analytics", desc: "12 built-in reports with CSV export: Rx trends, provider scorecards, labor costs" },
                { title: "Pharmacy Integrations", desc: "PMS webhooks, RxNorm drug lookup, patient SMS notifications, payroll export" },
              ]),
            ],
          }),

          new Paragraph({ spacing: { before: 200 }, children: [] }),

          // Why RxDesk
          new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("Why RxDesk?")] }),
          makeBullet("Only affordable prescriber CRM for pharmacies \u2014 competitors charge $1,815/month"),
          makeBullet("Drug rep visit tracking from the pharmacy's perspective \u2014 no other tool exists"),
          makeBullet("Prescription trend analysis by provider with declining/growing alerts"),
          makeBullet("Built-in scheduling ported from PharmShift \u2014 visual timeline, conflict detection"),
          makeBullet("Multi-location support with per-user permissions and role-based access"),
          makeBullet("HIPAA-conscious \u2014 no patient health information stored, only aggregate Rx counts by NPI"),
        ],
      },
      // PAGE 2
      {
        properties: {
          page: {
            size: { width: 12240, height: 15840 },
            margin: { top: 720, right: 1080, bottom: 720, left: 1080 },
          },
        },
        children: [
          // Pricing
          new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("Simple, Transparent Pricing")] }),

          new Table({
            width: { size: 10080, type: WidthType.DXA },
            columnWidths: [3360, 3360, 3360],
            rows: [
              // Header
              new TableRow({ children: [
                makePricingHeader("Starter", "$99/mo"),
                makePricingHeader("Growth", "$199/mo"),
                makePricingHeader("Pro", "$299/mo"),
              ] }),
              // Features
              new TableRow({ children: [
                makePricingCell(["1 location", "50 providers", "3 team members", "Basic analytics", "1 CSV upload/mo"]),
                makePricingCell(["3 locations", "Unlimited providers", "15 team members", "Full analytics + alerts", "Unlimited uploads"]),
                makePricingCell(["Unlimited locations", "Unlimited everything", "API access", "Custom branding", "Priority support"]),
              ] }),
            ],
          }),

          new Paragraph({ spacing: { before: 60, after: 200 }, alignment: AlignmentType.CENTER, children: [
            new TextRun({ text: "14-day free trial on all plans. No credit card required.", size: 20, color: MUTED }),
          ] }),

          // Comparison
          new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("RxDesk vs. the Competition")] }),

          new Table({
            width: { size: 10080, type: WidthType.DXA },
            columnWidths: [3360, 3360, 3360],
            rows: [
              new TableRow({ children: [
                makeCompCell("Feature", true), makeCompCell("RxDesk", true), makeCompCell("Dotti (Atrium24)", true),
              ] }),
              makeCompRow("Price", "$99\u2013$299/mo", "$1,815/mo"),
              makeCompRow("Prescriber CRM", "\u2713 Yes", "\u2713 Yes"),
              makeCompRow("Drug rep tracking", "\u2713 Yes", "\u2717 No"),
              makeCompRow("Rx trend analytics", "\u2713 Deep analytics", "Limited"),
              makeCompRow("Prescriber alerts", "\u2713 New + dormant", "\u2717 No"),
              makeCompRow("Time tracking", "\u2713 Built-in", "\u2717 No"),
              makeCompRow("Multi-location", "\u2713 Yes", "$995/mo per location"),
              makeCompRow("PMS integration", "\u2713 Webhooks + CSV", "PioneerRx only"),
            ],
          }),

          new Paragraph({ spacing: { before: 300 }, children: [] }),

          // CTA
          new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 200 }, shading: { type: ShadingType.CLEAR, fill: BLUE },
            children: [
              new TextRun({ text: "Start your free trial today", size: 28, bold: true, color: WHITE }),
            ],
          }),
          new Paragraph({ alignment: AlignmentType.CENTER, shading: { type: ShadingType.CLEAR, fill: BLUE },
            children: [
              new TextRun({ text: "rxdesk.darkknightmedia.me", size: 22, color: WHITE }),
            ],
          }),
          new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 }, shading: { type: ShadingType.CLEAR, fill: BLUE },
            children: [
              new TextRun({ text: " ", size: 10 }),
            ],
          }),

          // Footer
          new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 200 }, children: [
            new TextRun({ text: "\u00A9 2026 RxDesk. All rights reserved.", size: 18, color: MUTED }),
          ] }),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(path.join(outDir, "rxdesk-one-pager.docx"), buffer);
  console.log("Created: docs/rxdesk-one-pager.docx");

  function makeBullet(text) {
    return new Paragraph({
      numbering: { reference: "bullets", level: 0 },
      spacing: { before: 40, after: 40 },
      children: [new TextRun({ text, size: 21 })],
    });
  }

  function makeModuleRow(modules) {
    return new TableRow({
      children: modules.map(m =>
        new TableCell({
          borders: noBorders,
          width: { size: 3360, type: WidthType.DXA },
          margins: { top: 80, bottom: 120, left: 120, right: 120 },
          shading: { type: ShadingType.CLEAR, fill: LIGHT_BG },
          children: [
            new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: m.title, bold: true, size: 22, color: BLUE })] }),
            new Paragraph({ children: [new TextRun({ text: m.desc, size: 18, color: MUTED })] }),
          ],
        })
      ),
    });
  }

  function makePricingHeader(name, price) {
    return new TableCell({
      borders: cellBorders,
      width: { size: 3360, type: WidthType.DXA },
      margins: { top: 120, bottom: 120, left: 120, right: 120 },
      shading: { type: ShadingType.CLEAR, fill: BLUE },
      children: [
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: name, bold: true, size: 24, color: WHITE })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: price, size: 32, bold: true, color: WHITE })] }),
      ],
    });
  }

  function makePricingCell(features) {
    return new TableCell({
      borders: cellBorders,
      width: { size: 3360, type: WidthType.DXA },
      margins: { top: 80, bottom: 80, left: 120, right: 120 },
      children: features.map(f =>
        new Paragraph({ spacing: { before: 30, after: 30 }, children: [new TextRun({ text: `\u2022 ${f}`, size: 18, color: DARK })] })
      ),
    });
  }

  function makeCompCell(text, header = false) {
    return new TableCell({
      borders: cellBorders,
      width: { size: 3360, type: WidthType.DXA },
      margins: { top: 60, bottom: 60, left: 100, right: 100 },
      shading: header ? { type: ShadingType.CLEAR, fill: LIGHT_BG } : undefined,
      children: [new Paragraph({ children: [new TextRun({ text, bold: header, size: 20, color: DARK })] })],
    });
  }

  function makeCompRow(feature, rxdesk, competitor) {
    return new TableRow({ children: [makeCompCell(feature, true), makeCompCell(rxdesk), makeCompCell(competitor)] });
  }
}

// ─── POWERPOINT PRESENTATION ────────────────────────────────────

function createPptx() {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "RxDesk";
  pptx.company = "RxDesk";
  pptx.subject = "RxDesk Product Overview";

  const titleOpts = { fontSize: 36, bold: true, color: DARK, fontFace: "Helvetica Neue" };
  const subtitleOpts = { fontSize: 18, color: MUTED, fontFace: "Helvetica Neue" };
  const bodyOpts = { fontSize: 14, color: DARK, fontFace: "Helvetica Neue" };
  const bulletOpts = { fontSize: 13, color: DARK, fontFace: "Helvetica Neue", bullet: true };

  // Slide 1: Title
  let slide = pptx.addSlide();
  slide.background = { color: "000000" };
  slide.addText("Rx", { x: 5.5, y: 1.0, w: 2.3, h: 1.0, fontSize: 48, bold: true, color: WHITE, align: "center",
    shape: pptx.ShapeType.roundRect, fill: { color: BLUE }, rectRadius: 0.15 });
  slide.addText("RxDesk", { x: 2.5, y: 2.3, w: 8.3, h: 1.0, fontSize: 48, bold: true, color: WHITE, align: "center" });
  slide.addText("Know your prescribers. Grow your scripts.\nProtect your revenue.", { x: 2.5, y: 3.3, w: 8.3, h: 1.0, fontSize: 20, color: "AAAAAA", align: "center", italic: true });
  slide.addText("The prescriber relationship platform built for independent pharmacies", { x: 2.5, y: 4.5, w: 8.3, h: 0.5, fontSize: 14, color: "888888", align: "center" });

  // Slide 2: The Problem
  slide = pptx.addSlide();
  slide.background = { color: LIGHT_BG };
  slide.addText("The Problem", { x: 0.8, y: 0.5, w: 11.5, ...titleOpts });
  slide.addText([
    { text: "19,000 independent pharmacies", options: { bold: true } },
    { text: " in the US have zero affordable tools for:", options: {} },
  ], { x: 0.8, y: 1.3, w: 11.5, ...bodyOpts });
  const problems = [
    "Prescriber relationship management (only option: Dotti at $1,815/mo)",
    "Drug rep visit tracking from the pharmacy's perspective (no tool exists)",
    "Prescription volume analytics by provider (IQVIA charges $50K+/yr)",
    "Staff scheduling designed for pharmacy workflows",
  ];
  slide.addText(problems.map(p => ({ text: p, options: { ...bulletOpts, bullet: true, indentLevel: 0 } })),
    { x: 0.8, y: 2.0, w: 11.5, h: 3.0 });
  slide.addText("RxDesk fills every one of these gaps at $99\u2013$299/month.", { x: 0.8, y: 5.2, w: 11.5, fontSize: 16, bold: true, color: BLUE });

  // Slide 3: Platform Overview
  slide = pptx.addSlide();
  slide.background = { color: WHITE };
  slide.addText("Platform Overview", { x: 0.8, y: 0.5, w: 11.5, ...titleOpts });

  const modules = [
    { name: "Provider Directory", desc: "NPI search, import, prescriber profiles with Rx analytics", color: "3B82F6" },
    { name: "Prescription Analytics", desc: "CSV upload, trends, alerts, concentration risk, payer mix", color: "22C55E" },
    { name: "Drug Rep Tracker", desc: "Visit logging, provider linking, Rx correlation analysis", color: "F59E0B" },
    { name: "Time Tracking", desc: "Clock in/out, scheduling, PTO, planned vs actual", color: "8B5CF6" },
    { name: "Reports & Analytics", desc: "12 reports with CSV export, provider scorecards", color: "EF4444" },
    { name: "Integrations", desc: "PMS webhooks, RxNorm, patient SMS, payroll export", color: "06B6D4" },
  ];

  modules.forEach((m, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = 0.8 + col * 3.9;
    const y = 1.5 + row * 2.2;
    slide.addShape(pptx.ShapeType.roundRect, { x, y, w: 3.5, h: 1.8, fill: { color: LIGHT_BG }, rectRadius: 0.1 });
    slide.addText(m.name, { x: x + 0.2, y: y + 0.2, w: 3.1, h: 0.4, fontSize: 16, bold: true, color: m.color });
    slide.addText(m.desc, { x: x + 0.2, y: y + 0.7, w: 3.1, h: 0.9, fontSize: 11, color: MUTED });
  });

  // Slide 4: Key Features
  slide = pptx.addSlide();
  slide.background = { color: "000000" };
  slide.addText("Key Differentiators", { x: 0.8, y: 0.5, w: 11.5, fontSize: 36, bold: true, color: WHITE });

  const features = [
    { stat: "6\u201318x", label: "cheaper than Dotti ($1,815/mo)" },
    { stat: "Only tool", label: "for drug rep tracking from pharmacy side" },
    { stat: "10", label: "Rx trend indicators per provider" },
    { stat: "551+", label: "automated tests, production-ready" },
    { stat: "45", label: "API endpoints for integrations" },
    { stat: "36", label: "database models, enterprise architecture" },
  ];

  features.forEach((f, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = 0.8 + col * 3.9;
    const y = 1.5 + row * 2.2;
    slide.addText(f.stat, { x, y, w: 3.5, h: 0.8, fontSize: 40, bold: true, color: BLUE, align: "center" });
    slide.addText(f.label, { x, y: y + 0.9, w: 3.5, h: 0.6, fontSize: 13, color: "AAAAAA", align: "center" });
  });

  // Slide 5: Pricing
  slide = pptx.addSlide();
  slide.background = { color: LIGHT_BG };
  slide.addText("Simple Pricing", { x: 0.8, y: 0.5, w: 11.5, ...titleOpts });
  slide.addText("14-day free trial. No credit card required.", { x: 0.8, y: 1.1, w: 11.5, ...subtitleOpts });

  const plans = [
    { name: "Starter", price: "$99", features: ["1 location", "50 providers", "3 team members", "Basic analytics"] },
    { name: "Growth", price: "$199", features: ["3 locations", "Unlimited providers", "15 team members", "Full analytics + alerts"] },
    { name: "Pro", price: "$299", features: ["Unlimited everything", "API access", "Custom branding", "Priority support"] },
  ];

  plans.forEach((p, i) => {
    const x = 0.8 + i * 3.9;
    slide.addShape(pptx.ShapeType.roundRect, { x, y: 1.8, w: 3.5, h: 3.5, fill: { color: WHITE }, rectRadius: 0.1, shadow: { type: "outer", blur: 6, offset: 2, opacity: 0.15, color: "000000" } });
    slide.addText(p.name, { x, y: 2.0, w: 3.5, h: 0.4, fontSize: 18, bold: true, color: BLUE, align: "center" });
    slide.addText(p.price + "/mo", { x, y: 2.4, w: 3.5, h: 0.6, fontSize: 32, bold: true, color: DARK, align: "center" });
    slide.addText(p.features.map(f => ({ text: f, options: { fontSize: 12, color: MUTED, bullet: true } })),
      { x: x + 0.3, y: 3.2, w: 2.9, h: 2.0 });
  });

  // Slide 6: CTA
  slide = pptx.addSlide();
  slide.background = { color: BLUE };
  slide.addText("Ready to grow your pharmacy?", { x: 1, y: 1.5, w: 11.3, h: 1.0, fontSize: 40, bold: true, color: WHITE, align: "center" });
  slide.addText("Start your free trial at", { x: 1, y: 2.8, w: 11.3, h: 0.5, fontSize: 20, color: WHITE, align: "center" });
  slide.addText("rxdesk.darkknightmedia.me", { x: 2.5, y: 3.5, w: 8.3, h: 0.8, fontSize: 28, bold: true, color: WHITE, align: "center",
    shape: pptx.ShapeType.roundRect, fill: { color: "005BB5" }, rectRadius: 0.1 });
  slide.addText("\u00A9 2026 RxDesk. All rights reserved.", { x: 1, y: 5.0, w: 11.3, h: 0.3, fontSize: 10, color: "AACCEE", align: "center" });

  pptx.writeFile({ fileName: path.join(outDir, "rxdesk-pitch-deck.pptx") })
    .then(() => console.log("Created: docs/rxdesk-pitch-deck.pptx"));
}

// ─── Run both ───────────────────────────────────────────────────

await createDocx();
createPptx();
