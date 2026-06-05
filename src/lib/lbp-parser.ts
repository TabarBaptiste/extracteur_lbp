// TypeScript port of lbp_parser.py — runs entirely in the browser via pdfjs-dist.
// Reconstructs a fixed-width text layout from PDF text items, then applies the
// same regex-driven parsing logic as the Python module.

import * as pdfjsLib from "pdfjs-dist";
// Vite-friendly worker import
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

export interface Operation {
  date: string;
  libelle: string;
  debit: number | null;
  credit: number | null;
}

export interface Solde {
  date: string;
  montant: number | null;
}

export interface CompteCourant {
  type: "Compte Courant Postal";
  ancien_solde: Solde | null;
  operations: Operation[];
  total_debit: number | null;
  total_credit: number | null;
  nouveau_solde: Solde | null;
}

export interface Livret {
  type: string;
  ancien_solde: Solde | null;
  operations: Operation[];
  nouveau_solde: Solde | null;
}

export interface SituationCompte {
  compte: string;
  solde: number;
}

export interface Situation {
  date: string | null;
  comptes: SituationCompte[];
}

export interface Releve {
  numero?: number;
  date_edition?: string;
}

export interface Coherence {
  coherent: boolean | null;
  ecart: number | null;
}

export interface ParsedStatement {
  banque: string;
  releve: Releve;
  situation: Situation;
  compte_courant: CompteCourant | null;
  comptes_epargne: Livret[];
  controle_coherence: Coherence;
  _fichier_source?: string;
}

// -------- PDF -> fixed-width text layout (mimics pdftotext -layout) --------

async function extractPagesText(file: File): Promise<string[]> {
  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  const pages: string[] = [];

  // Character cell size in PDF points. ~5pt per column reproduces the
  // pdftotext -layout column density well enough for LBP statements.
  const COL = 5.0;
  const ROW = 3.0;

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const viewport = page.getViewport({ scale: 1 });
    const pageHeight = viewport.height;

    // Group items by row
    const rows = new Map<number, Array<{ x: number; text: string }>>();
    for (const item of content.items as Array<{
      str: string;
      transform: number[];
      width: number;
    }>) {
      if (!item.str) continue;
      const x = item.transform[4];
      const y = pageHeight - item.transform[5];
      const rowKey = Math.round(y / ROW);
      const arr = rows.get(rowKey) ?? [];
      arr.push({ x, text: item.str });
      rows.set(rowKey, arr);
    }

    const sortedKeys = [...rows.keys()].sort((a, b) => a - b);
    const lines: string[] = [];
    for (const k of sortedKeys) {
      const row = rows.get(k)!.sort((a, b) => a.x - b.x);
      let buf = "";
      for (const { x, text } of row) {
        let col = Math.max(0, Math.round(x / COL));
        if (col <= buf.length) col = buf.length + 1;
        buf = buf.padEnd(col, " ") + text;
      }
      lines.push(buf);
    }
    pages.push(lines.join("\n"));
  }

  return pages;
}

// -------- Helpers ported from Python --------

const AMOUNT_RE = /\d{1,3}(?:[ \u202f\xa0]\d{3})*,\d{2}/g;
const AMOUNT_RE_SINGLE = /\d{1,3}(?:[ \u202f\xa0]\d{3})*,\d{2}/;
const DATE_LINE_RE = /^\s*(\d{2}\/\d{2})\s+(.*)$/;
const IBAN_RE = /\bFR\d{2}[0-9A-Z ]+/gi;
const COMPTE_IBAN_RE = /\bCOMPTE\s+[A-Z]{2}\d[0-9A-Z]*/g;
const ACCOUNT_NAMES =
  "Compte Courant Postal|Livret Jeune Swing|Livret A|Livret d.Épargne Populaire|Livret d.Epargne Populaire";
const COMPTE_HEADER_RE = new RegExp(`^\\s*(${ACCOUNT_NAMES})\\s+n[°º]`);

const NOISE_MARKERS = ["REF :", "IDENT :", "MANDAT :", "REFERENCE :", "RUM"];

function parseAmount(s: string): number {
  s = s.replace(/\u202f/g, " ").replace(/\xa0/g, " ");
  s = s.replace(/ /g, "").replace(/,/g, ".");
  return Math.round(parseFloat(s) * 100) / 100;
}

interface AmountMatch {
  value: string;
  start: number;
  end: number;
}

function allAmountsAtWordStart(line: string): AmountMatch[] {
  const out: AmountMatch[] = [];
  const re = new RegExp(AMOUNT_RE.source, "g");
  let m: RegExpExecArray | null;
  while ((m = re.exec(line)) !== null) {
    if (m.index === 0 || line[m.index - 1] === " ") {
      out.push({ value: m[0], start: m.index, end: m.index + m[0].length });
    }
  }
  return out;
}

function rightmostAmount(line: string): AmountMatch | null {
  const all = allAmountsAtWordStart(line);
  return all.length ? all[all.length - 1] : null;
}

function cleanLabel(parts: string[]): string {
  let text = parts
    .map((p) => p.trim())
    .filter(Boolean)
    .join(" ");
  let cut = text.length;
  for (const mk of NOISE_MARKERS) {
    const i = text.indexOf(mk);
    if (i !== -1) cut = Math.min(cut, i);
  }
  text = text.slice(0, cut);
  text = text.replace(COMPTE_IBAN_RE, "");
  text = text.replace(IBAN_RE, "");
  text = text.replace(/DATE DE VALEUR[\d  ]*/g, "");
  // Strip long alphanumeric refs (must contain both letter and digit)
  text = text.replace(/\b[0-9A-Z/-]{8,}\b/g, (tok) => {
    const hasDigit = /\d/.test(tok);
    const hasAlpha = /[A-Z]/.test(tok);
    return hasDigit && hasAlpha ? "" : tok;
  });
  text = text.replace(/\b\d{8,}\b/g, "");
  text = text.replace(/\s{2,}/g, " ").replace(/^[\s-]+|[\s-]+$/g, "");
  return text;
}

function findSplitColumn(pageText: string): number | null {
  for (const line of pageText.split("\n")) {
    if (line.includes("Débit") && line.includes("Crédit")) {
      const dEnd = line.indexOf("Débit") + "Débit (¤)".length;
      const cStart = line.indexOf("Crédit");
      return Math.floor((dEnd + cStart) / 2);
    }
  }
  return null;
}

function amountSide(
  line: string,
  splitCol: number,
): { side: "debit" | "credit"; value: number } | null {
  const m = rightmostAmount(line);
  if (!m) return null;
  const value = parseAmount(m.value);
  const side: "debit" | "credit" = m.end > splitCol ? "credit" : "debit";
  return { side, value };
}

type TaggedLine = [string, number];

function parseOperations(tagged: TaggedLine[]): Operation[] {
  const ops: Operation[] = [];
  let current: (Operation & { _frag: string[] }) | null = null;

  const flush = () => {
    if (current) {
      current.libelle = cleanLabel(current._frag);
      const { _frag, ...rest } = current;
      void _frag;
      ops.push(rest);
      current = null;
    }
  };

  for (const [line, splitCol] of tagged) {
    if (!line.trim()) continue;
    if (
      line.includes("Total des opérations") ||
      line.includes("Nouveau solde") ||
      line.includes("Ancien solde")
    )
      continue;

    const m = DATE_LINE_RE.exec(line);
    if (m) {
      flush();
      const date = m[1];
      let rest = m[2];
      current = { date, libelle: "", debit: null, credit: null, _frag: [] };
      const side = amountSide(line, splitCol);
      if (side) {
        current[side.side] = side.value;
        const am = rightmostAmount(line);
        if (am) {
          const stripped = line.slice(0, am.start) + line.slice(am.end);
          const mm = DATE_LINE_RE.exec(stripped);
          rest = mm ? mm[2] : "";
        }
      }
      current._frag.push(rest);
    } else if (current) {
      current._frag.push(line);
    }
  }
  flush();
  return ops;
}

function normCompte(name: string): string {
  return name.replace(/Epargne/g, "Épargne").trim();
}

function parseSituation(page1: string): Situation {
  const situation: Situation = { date: null, comptes: [] };
  const accountRe = new RegExp(`^\\s*(${ACCOUNT_NAMES})\\b`);
  for (const line of page1.split("\n")) {
    const m = /Situation de vos comptes\s+au\s+(\d{2} \S+ \d{4})/.exec(line);
    if (m) situation.date = m[1];
    const cm = accountRe.exec(line);
    if (cm && AMOUNT_RE_SINGLE.test(line)) {
      const am = AMOUNT_RE_SINGLE.exec(line)!;
      const neg = new RegExp(`[-–]\\s*${am[0].replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`).test(line);
      situation.comptes.push({
        compte: normCompte(cm[1]),
        solde: (neg ? -1 : 1) * parseAmount(am[0]),
      });
    }
  }
  return situation;
}

function soldeFromLine(line: string): Solde | null {
  const m = /(?:Ancien|Nouveau) solde au\s+(\d{2}\/\d{2}\/\d{4})/.exec(line);
  if (!m) return null;
  const am = AMOUNT_RE_SINGLE.exec(line);
  return { date: m[1], montant: am ? parseAmount(am[0]) : null };
}

function parseCcp(tagged: TaggedLine[]): CompteCourant {
  let idx = tagged.findIndex(([l]) => l.includes("Comptes d'Épargne"));
  if (idx === -1) idx = tagged.length;
  const zone = tagged.slice(0, idx);

  const ccp: CompteCourant = {
    type: "Compte Courant Postal",
    ancien_solde: null,
    operations: [],
    total_debit: null,
    total_credit: null,
    nouveau_solde: null,
  };

  for (const [line] of zone) {
    if (line.includes("Ancien solde au")) {
      ccp.ancien_solde = soldeFromLine(line);
      break;
    }
  }

  let start = zone.findIndex(([l]) => l.includes("Ancien solde au"));
  if (start === -1) start = 0;
  let end = zone.findIndex(([l]) => l.includes("Total des opérations"));
  if (end === -1) end = zone.length;
  ccp.operations = parseOperations(zone.slice(start + 1, end));

  for (const [line, sc] of zone) {
    if (line.includes("Total des opérations")) {
      const amts = allAmountsAtWordStart(line);
      if (amts.length >= 2) {
        ccp.total_debit = parseAmount(amts[amts.length - 2].value);
        ccp.total_credit = parseAmount(amts[amts.length - 1].value);
      } else if (amts.length === 1) {
        const side = amountSide(line, sc);
        if (side) {
          if (side.side === "debit") ccp.total_debit = side.value;
          else ccp.total_credit = side.value;
        }
      }
    }
    if (line.includes("Nouveau solde au")) {
      ccp.nouveau_solde = soldeFromLine(line);
    }
  }
  return ccp;
}

function parseEpargne(tagged: TaggedLine[]): Livret[] {
  const idx = tagged.findIndex(([l]) => l.includes("Comptes d'Épargne"));
  if (idx === -1) return [];
  let zone = tagged.slice(idx);
  let cut = zone.findIndex(([l]) => l.includes("Pour faire opposition"));
  if (cut === -1) cut = zone.length;
  zone = zone.slice(0, cut);

  const headerIdx: number[] = [];
  zone.forEach(([l], i) => {
    if (COMPTE_HEADER_RE.test(l)) headerIdx.push(i);
  });

  const livrets: Livret[] = [];
  for (let k = 0; k < headerIdx.length; k++) {
    const hi = headerIdx[k];
    const segEnd = k + 1 < headerIdx.length ? headerIdx[k + 1] : zone.length;
    const seg = zone.slice(hi, segEnd);
    const headerMatch = COMPTE_HEADER_RE.exec(seg[0][0])!;
    const name = normCompte(headerMatch[1]);
    const livret: Livret = {
      type: name,
      ancien_solde: null,
      operations: [],
      nouveau_solde: null,
    };
    for (const [line] of seg) {
      if (line.includes("Ancien solde au")) livret.ancien_solde = soldeFromLine(line);
      if (line.includes("Nouveau solde au")) livret.nouveau_solde = soldeFromLine(line);
    }
    let s = seg.findIndex(([l]) => l.includes("Ancien solde au"));
    if (s === -1) s = 0;
    let e = seg.findIndex(([l]) => l.includes("Nouveau solde au"));
    if (e === -1) e = seg.length;
    livret.operations = parseOperations(seg.slice(s + 1, e));
    livrets.push(livret);
  }
  return livrets;
}

export function parseStatement(pages: string[]): ParsedStatement {
  const pageSplits: number[] = [];
  let last = 140;
  for (const p of pages) {
    const c = findSplitColumn(p);
    if (c !== null) last = c;
    pageSplits.push(last);
  }

  const tagged: TaggedLine[] = [];
  pages.forEach((p, i) => {
    for (const line of p.split("\n")) tagged.push([line, pageSplits[i]]);
  });

  const full = pages.join("\n");
  const result: ParsedStatement = {
    banque: "La Banque Postale",
    releve: {},
    situation: parseSituation(pages[0] ?? ""),
    compte_courant: null,
    comptes_epargne: [],
    controle_coherence: { coherent: null, ecart: null },
  };

  const rm = /Relevé de vos comptes\s*-\s*n[°º]\s*(\d+)/.exec(full);
  const dm = /Relevé édité le\s+(\d{2} \S+ \d{4})/.exec(full);
  if (rm) result.releve.numero = parseInt(rm[1], 10);
  if (dm) result.releve.date_edition = dm[1];

  result.compte_courant = parseCcp(tagged);
  result.comptes_epargne = parseEpargne(tagged);

  const cc = result.compte_courant;
  try {
    if (cc?.ancien_solde?.montant != null && cc.nouveau_solde?.montant != null) {
      const attendu =
        Math.round(
          (cc.ancien_solde.montant + (cc.total_credit ?? 0) - (cc.total_debit ?? 0)) * 100,
        ) / 100;
      const ecart = Math.round((attendu - cc.nouveau_solde.montant) * 100) / 100;
      result.controle_coherence = { coherent: Math.abs(ecart) < 0.01, ecart };
    }
  } catch {
    // leave defaults
  }

  return result;
}

export async function parsePdfFile(file: File): Promise<ParsedStatement> {
  const pages = await extractPagesText(file);
  const data = parseStatement(pages);
  data._fichier_source = file.name;
  return data;
}
