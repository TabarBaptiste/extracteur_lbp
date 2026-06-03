import ExcelJS from "exceljs";
import type { ParsedStatement, Operation } from "./lbp-parser";

interface Row {
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

function rowsFor(
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

function buildAllRows(data: ParsedStatement): Row[] {
  const { mois, annee } = deriveMoisAnnee(data.releve.date_edition);
  const rows: Row[] = [];
  if (data.compte_courant) {
    rows.push(
      ...rowsFor(
        data.compte_courant.type,
        data.compte_courant.operations,
        data.compte_courant.ancien_solde?.montant ?? null,
        mois,
        annee,
      ),
    );
  }
  for (const l of data.comptes_epargne) {
    rows.push(...rowsFor(l.type, l.operations, l.ancien_solde?.montant ?? null, mois, annee));
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

export function toCsv(data: ParsedStatement): string {
  const rows = buildAllRows(data);
  const header = [
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
  return "\ufeff" + [header, ...lines].join("\r\n");
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

export function downloadJson(data: ParsedStatement) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json;charset=utf-8",
  });
  downloadBlob(blob, "releve_lbp.json");
}

export function downloadCsv(data: ParsedStatement) {
  const blob = new Blob([toCsv(data)], { type: "text/csv;charset=utf-8" });
  downloadBlob(blob, "releve_lbp.csv");
}

export async function downloadXlsx(data: ParsedStatement) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Extracteur LBP";
  wb.created = new Date();

  const headerFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFBA6905" },
  };
  const headerFont: Partial<ExcelJS.Font> = {
    name: "Montserrat",
    bold: true,
    color: { argb: "FFFFFFFF" },
    size: 11,
  };

  // ---------- Sheet 1: Opérations ----------
  const ws = wb.addWorksheet("Opérations", {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  ws.columns = [
    { header: "Compte", key: "compte", width: 24 },
    { header: "Date", key: "date", width: 10 },
    { header: "Libellé", key: "libelle", width: 60 },
    { header: "Débit (€)", key: "debit", width: 12 },
    { header: "Crédit (€)", key: "credit", width: 12 },
    { header: "Solde", key: "solde", width: 14 },
  ];
  ws.getRow(1).eachCell((c) => {
    c.fill = headerFill;
    c.font = headerFont;
    c.alignment = { vertical: "middle", horizontal: "left" };
  });

  const debitFont: Partial<ExcelJS.Font> = { color: { argb: "FFC00000" } };
  const creditFont: Partial<ExcelJS.Font> = { color: { argb: "FF5C6B3A" } };

  const allOps: Array<{ compte: string; op: Operation; running: number | null }> = [];
  const pushOps = (compte: string, ops: Operation[], ancien: number | null) => {
    let r = ancien;
    for (const op of ops) {
      if (r != null) r = Math.round((r + (op.credit ?? 0) - (op.debit ?? 0)) * 100) / 100;
      allOps.push({ compte, op, running: r });
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

  for (const { compte, op, running } of allOps) {
    const row = ws.addRow({
      compte,
      date: op.date,
      libelle: op.libelle,
      debit: op.debit,
      credit: op.credit,
      solde: running,
    });
    row.getCell("debit").numFmt = '#,##0.00;[Red]-#,##0.00';
    row.getCell("credit").numFmt = "#,##0.00";
    row.getCell("solde").numFmt = "#,##0.00";
    if (op.debit != null) row.getCell("debit").font = debitFont;
    if (op.credit != null) row.getCell("credit").font = creditFont;
  }

  // ---------- Sheet 2: Résumé ----------
  const ws2 = wb.addWorksheet("Résumé");
  ws2.columns = [
    { header: "Élément", key: "k", width: 36 },
    { header: "Valeur", key: "v", width: 24 },
  ];
  ws2.getRow(1).eachCell((c) => {
    c.fill = headerFill;
    c.font = headerFont;
  });

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
      const r = ws2.addRow({ k: `Ancien solde (${cc.ancien_solde.date})`, v: cc.ancien_solde.montant });
      r.getCell("v").numFmt = "#,##0.00";
    }
    if (cc.total_debit != null) {
      const r = ws2.addRow({ k: "Total débit", v: cc.total_debit });
      r.getCell("v").numFmt = "#,##0.00";
      r.getCell("v").font = debitFont;
    }
    if (cc.total_credit != null) {
      const r = ws2.addRow({ k: "Total crédit", v: cc.total_credit });
      r.getCell("v").numFmt = "#,##0.00";
      r.getCell("v").font = creditFont;
    }
    if (cc.nouveau_solde) {
      const r = ws2.addRow({ k: `Nouveau solde (${cc.nouveau_solde.date})`, v: cc.nouveau_solde.montant });
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

  const buf = await wb.xlsx.writeBuffer();
  downloadBlob(
    new Blob([buf], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    "releve_lbp.xlsx",
  );
}
