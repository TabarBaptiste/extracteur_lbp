import { RotateCcw } from "lucide-react";
import type { ParsedFile } from "@/hooks/use-parser";
import type { ParsedStatement } from "@/lib/lbp-parser";
import { DropZone } from "./DropZone";
import { MultiExportBar } from "./MultiExportBar";
import { StatementCard } from "./StatementCard";

const MOIS = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
];

/** Clé de tri (AAAAMMJJ) : date d'édition, sinon date de situation. Gère « 31 juillet 2026 » et « 31/07/2026 ». */
function dateKey(s: ParsedStatement | undefined): string {
  const d = (s?.releve.date_edition ?? s?.situation.date ?? "").toLowerCase();
  const num = d.match(/(\d{1,2})[/.](\d{1,2})[/.](\d{4})/);
  if (num) return `${num[3]}${num[2].padStart(2, "0")}${num[1].padStart(2, "0")}`;
  const txt = d.match(/(\d{1,2})\s+([a-zéûè]+)\.?\s+(\d{4})/);
  const month = txt ? MOIS.findIndex((m) => m.startsWith(txt[2].slice(0, 4))) : -1;
  if (txt && month >= 0) {
    return `${txt[3]}${String(month + 1).padStart(2, "0")}${txt[1].padStart(2, "0")}`;
  }
  return "";
}

/** Du plus récent au plus ancien ; les fichiers sans date (en cours, en erreur) à la fin. */
function byDateDesc(a: ParsedFile, b: ParsedFile): number {
  return dateKey(b.data).localeCompare(dateKey(a.data));
}

export function ResultsView({
  files,
  onFiles,
  onRemove,
  onReset,
}: {
  files: ParsedFile[];
  onFiles: (files: File[]) => void;
  onRemove: (id: string) => void;
  onReset: () => void;
}) {
  const sorted = [...files].sort(byDateDesc);
  const succeeded: ParsedStatement[] = sorted
    .filter((f) => f.status === "success" && f.data)
    .map((f) => f.data as ParsedStatement);
  const loadingCount = files.filter((f) => f.status === "loading").length;

  return (
    <div className="space-y-8">
      {/* Barre de contrôle */}
      <header className="card-tt p-5 sm:p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="label-caps text-brand-deep mb-1">La Banque Postale</p>
          <h1 className="font-display text-2xl sm:text-3xl text-foreground">
            {succeeded.length} relevé{succeeded.length > 1 ? "s" : ""} analysé
            {succeeded.length > 1 ? "s" : ""}
            {loadingCount > 0 && (
              <span className="text-sm text-muted-foreground font-sans font-normal">
                {" "}
                · {loadingCount} en cours…
              </span>
            )}
          </h1>
        </div>
        <button className="btn-outline" onClick={onReset}>
          <RotateCcw className="h-3.5 w-3.5" strokeWidth={2} />
          Tout effacer
        </button>
      </header>

      {/* Export global (uniquement si au moins un relevé est prêt) */}
      {succeeded.length > 0 && <MultiExportBar items={succeeded} />}

      {/* Liste des relevés */}
      <div className="space-y-4">
        {sorted.map((file, i) => (
          <StatementCard key={file.id} file={file} index={i} onRemove={() => onRemove(file.id)} />
        ))}
      </div>

      {/* Ajouter d'autres relevés */}
      <DropZone onFiles={onFiles} compact />
    </div>
  );
}
