import { RotateCcw } from "lucide-react";
import type { ParsedFile } from "@/hooks/use-parser";
import type { ParsedStatement } from "@/lib/lbp-parser";
import { DropZone } from "./DropZone";
import { MultiExportBar } from "./MultiExportBar";
import { StatementCard } from "./StatementCard";

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
  const succeeded: ParsedStatement[] = files
    .filter((f) => f.status === "success" && f.data)
    .map((f) => f.data as ParsedStatement);
  const loadingCount = files.filter((f) => f.status === "loading").length;

  return (
    <div className="space-y-8">
      {/* Barre de contrôle */}
      <header className="card-tt p-5 sm:p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="label-caps text-terracotta-deep mb-1">La Banque Postale</p>
          <h1 className="font-display text-2xl sm:text-3xl text-foreground">
            {succeeded.length} relevé{succeeded.length > 1 ? "s" : ""} analysé
            {succeeded.length > 1 ? "s" : ""}
            {loadingCount > 0 && (
              <span className="text-sm text-stone-grey font-sans font-normal">
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
        {files.map((file, i) => (
          <StatementCard key={file.id} file={file} index={i} onRemove={() => onRemove(file.id)} />
        ))}
      </div>

      {/* Ajouter d'autres relevés */}
      <DropZone onFiles={onFiles} compact />
    </div>
  );
}
