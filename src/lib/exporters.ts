import ExcelJS from "exceljs";
import type { ParsedStatement, Operation } from "./lbp-parser";

interface Row {
  source: string;
  compte: string;
  date: string;
  libelle: string;
  debit: number | null;
  credit: number | null;
  solde_avant: number | null;
  solde_apres: number | null;
  mois: string;
  annee: string;
}

function deriveMoisAnnee(dateEdition?: string): { mois: string; annee: string } {
  if (!dateEdition) return { mois: "", annee: "" };
  const parts = dateEdition.split(/\s+/);
  return { mois: parts[1] ?? "", annee: parts[2] ?? "" };
}

/** Base file name for a statement, derived from its source PDF or relevé number. */
export function baseName(data: ParsedStatement, index = 0): string {
  if (data._fichier_source) return data._fichier_source.replace(/\.pdf$/i, "");
  if (data.releve.numero != null) return `releve_${data.releve.numero}`;
  return `releve_lbp_${index + 1}`;
}

function rowsFor(
  source: string,
  compte: string,
  ops: Operation[],
  ancien: number | null,
  mois: string,
  annee: string,
): Row[] {
  const out: Row[] = [];
  let running = ancien;
  for (const op of ops) {
    const soldeAvant = running;
    if (running != null) {
      running = Math.round((running + (op.credit ?? 0) - (op.debit ?? 0)) * 100) / 100;
    }
    out.push({
      source,
      compte,
      date: op.date,
      libelle: op.libelle,
      debit: op.debit,
      credit: op.credit,
      solde_avant: soldeAvant,
      solde_apres: running,
      mois,
      annee,
    });
  }
  return out;
}

function buildAllRows(data: ParsedStatement, index = 0): Row[] {
  const { mois, annee } = deriveMoisAnnee(data.releve.date_edition);
  const source = baseName(data, index);
  const rows: Row[] = [];
  if (data.compte_courant) {
    rows.push(
      ...rowsFor(
        source,
        data.compte_courant.type,
        data.compte_courant.operations,
        data.compte_courant.ancien_solde?.montant ?? null,
        mois,
        annee,
      ),
    );
  }
  for (const l of data.comptes_epargne) {
    rows.push(
      ...rowsFor(source, l.type, l.operations, l.ancien_solde?.montant ?? null, mois, annee),
    );
  }
  return rows;
}

function esc(v: string | number | null): string {
  if (v == null) return "";
  const s = String(v);
  if (/[;"\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function fmtNum(n: number | null): string {
  if (n == null) return "";
  return n.toFixed(2).replace(".", ",");
}

/**
 * CSV for one or more statements. The `source` column (relevé d'origine) is
 * always included so merged exports stay traceable.
 */
export function toCsv(items: ParsedStatement[]): string {
  const rows = items.flatMap((d, i) => buildAllRows(d, i));
  const header = [
    "source",
    "compte",
    "date",
    "libelle",
    "debit",
    "credit",
    "solde_avant",
    "solde_apres",
    "mois",
    "annee",
  ].join(";");
  const lines = rows.map((r) =>
    [
      esc(r.source),
      esc(r.compte),
      esc(r.date),
      esc(r.libelle),
      fmtNum(r.debit),
      fmtNum(r.credit),
      fmtNum(r.solde_avant),
      fmtNum(r.solde_apres),
      esc(r.mois),
      esc(r.annee),
    ].join(";"),
  );
  return "﻿" + [header, ...lines].join("\r\n");
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// JSON
// ---------------------------------------------------------------------------

/** Single statement -> one JSON file. */
export function downloadJson(data: ParsedStatement, index = 0) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json;charset=utf-8",
  });
  downloadBlob(blob, `${baseName(data, index)}.json`);
}

/** Several statements -> a single JSON file containing an array. */
export function downloadJsonMerged(items: ParsedStatement[], filename = "releves_lbp.json") {
  const blob = new Blob([JSON.stringify(items, null, 2)], {
    type: "application/json;charset=utf-8",
  });
  downloadBlob(blob, filename);
}

/** Several statements -> one JSON file per statement (sequential downloads). */
export async function downloadJsonSeparate(items: ParsedStatement[]) {
  for (let i = 0; i < items.length; i++) {
    downloadJson(items[i], i);
    // Small gap so the browser reliably triggers each download.
    if (i < items.length - 1) await new Promise((r) => setTimeout(r, 300));
  }
}

// ---------------------------------------------------------------------------
// CSV
// ---------------------------------------------------------------------------

export function downloadCsv(data: ParsedStatement, index = 0) {
  const blob = new Blob([toCsv([data])], { type: "text/csv;charset=utf-8" });
  downloadBlob(blob, `${baseName(data, index)}.csv`);
}

export function downloadCsvMerged(items: ParsedStatement[], filename = "releves_lbp.csv") {
  const blob = new Blob([toCsv(items)], { type: "text/csv;charset=utf-8" });
  downloadBlob(blob, filename);
}

// ---------------------------------------------------------------------------
// XLSX
// ---------------------------------------------------------------------------

const HEADER_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFBA6905" },
};
const HEADER_FONT: Partial<ExcelJS.Font> = {
  name: "Montserrat",
  bold: true,
  color: { argb: "FFFFFFFF" },
  size: 11,
};
const DEBIT_FONT: Partial<ExcelJS.Font> = { color: { argb: "FFC00000" } };
const CREDIT_FONT: Partial<ExcelJS.Font> = { color: { argb: "FF5C6B3A" } };

async function buildWorkbookBuffer(items: ParsedStatement[]): Promise<ArrayBuffer> {
  const multi = items.length > 1;
  const wb = new ExcelJS.Workbook();
  wb.creator = "Extracteur LBP";
  wb.created = new Date();

  // ---------- Sheet 1: Opérations ----------
  const ws = wb.addWorksheet("Opérations", {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  ws.columns = [
    ...(multi ? [{ header: "Relevé", key: "source", width: 22 }] : []),
    { header: "Compte", key: "compte", width: 24 },
    { header: "Date", key: "date", width: 10 },
    { header: "Libellé", key: "libelle", width: 60 },
    { header: "Débit (€)", key: "debit", width: 12 },
    { header: "Crédit (€)", key: "credit", width: 12 },
    { header: "Solde", key: "solde", width: 14 },
  ];
  ws.getRow(1).eachCell((c) => {
    c.fill = HEADER_FILL;
    c.font = HEADER_FONT;
    c.alignment = { vertical: "middle", horizontal: "left" };
  });

  items.forEach((data, idx) => {
    const source = baseName(data, idx);
    const pushOps = (compte: string, ops: Operation[], ancien: number | null) => {
      let r = ancien;
      for (const op of ops) {
        if (r != null) r = Math.round((r + (op.credit ?? 0) - (op.debit ?? 0)) * 100) / 100;
        const row = ws.addRow({
          ...(multi ? { source } : {}),
          compte,
          date: op.date,
          libelle: op.libelle,
          debit: op.debit,
          credit: op.credit,
          solde: r,
        });
        row.getCell("debit").numFmt = "#,##0.00;[Red]-#,##0.00";
        row.getCell("credit").numFmt = "#,##0.00";
        row.getCell("solde").numFmt = "#,##0.00";
        if (op.debit != null) row.getCell("debit").font = DEBIT_FONT;
        if (op.credit != null) row.getCell("credit").font = CREDIT_FONT;
      }
    };
    if (data.compte_courant)
      pushOps(
        data.compte_courant.type,
        data.compte_courant.operations,
        data.compte_courant.ancien_solde?.montant ?? null,
      );
    for (const l of data.comptes_epargne)
      pushOps(l.type, l.operations, l.ancien_solde?.montant ?? null);
  });

  // ---------- Sheet 2: Résumé ----------
  const ws2 = wb.addWorksheet("Résumé");
  ws2.columns = [
    { header: "Élément", key: "k", width: 40 },
    { header: "Valeur", key: "v", width: 24 },
  ];
  ws2.getRow(1).eachCell((c) => {
    c.fill = HEADER_FILL;
    c.font = HEADER_FONT;
  });

  items.forEach((data, idx) => {
    if (multi) {
      ws2.addRow({});
      ws2.addRow({ k: `═══ ${baseName(data, idx)} ═══`, v: "" }).font = {
        bold: true,
        size: 12,
      };
    }

    ws2.addRow({ k: "Banque", v: data.banque });
    if (data.releve.numero != null) ws2.addRow({ k: "Relevé n°", v: data.releve.numero });
    if (data.releve.date_edition) ws2.addRow({ k: "Date d'édition", v: data.releve.date_edition });
    if (data.situation.date) ws2.addRow({ k: "Situation au", v: data.situation.date });

    ws2.addRow({});
    ws2.addRow({ k: "— Situation des comptes —", v: "" }).font = { bold: true };
    for (const c of data.situation.comptes) {
      const r = ws2.addRow({ k: c.compte, v: c.solde });
      r.getCell("v").numFmt = "#,##0.00";
    }

    const cc = data.compte_courant;
    if (cc) {
      ws2.addRow({});
      ws2.addRow({ k: "— Compte Courant Postal —", v: "" }).font = { bold: true };
      if (cc.ancien_solde) {
        const r = ws2.addRow({
          k: `Ancien solde (${cc.ancien_solde.date})`,
          v: cc.ancien_solde.montant,
        });
        r.getCell("v").numFmt = "#,##0.00";
      }
      if (cc.total_debit != null) {
        const r = ws2.addRow({ k: "Total débit", v: cc.total_debit });
        r.getCell("v").numFmt = "#,##0.00";
        r.getCell("v").font = DEBIT_FONT;
      }
      if (cc.total_credit != null) {
        const r = ws2.addRow({ k: "Total crédit", v: cc.total_credit });
        r.getCell("v").numFmt = "#,##0.00";
        r.getCell("v").font = CREDIT_FONT;
      }
      if (cc.nouveau_solde) {
        const r = ws2.addRow({
          k: `Nouveau solde (${cc.nouveau_solde.date})`,
          v: cc.nouveau_solde.montant,
        });
        r.getCell("v").numFmt = "#,##0.00";
      }
    }

    const co = data.controle_coherence;
    if (co.coherent != null) {
      ws2.addRow({});
      ws2.addRow({
        k: "Contrôle de cohérence",
        v: co.coherent ? "✓ Cohérent" : `⚠ Écart ${co.ecart} €`,
      });
    }
  });

  return wb.xlsx.writeBuffer();
}

export async function downloadXlsx(data: ParsedStatement, index = 0) {
  const buf = await buildWorkbookBuffer([data]);
  downloadBlob(
    new Blob([buf], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    `${baseName(data, index)}.xlsx`,
  );
}

export async function downloadXlsxMerged(items: ParsedStatement[], filename = "releves_lbp.xlsx") {
  const buf = await buildWorkbookBuffer(items);
  downloadBlob(
    new Blob([buf], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    filename,
  );
}
