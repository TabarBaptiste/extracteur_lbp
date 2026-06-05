import { useState } from "react";
import { ChevronDown, Loader2, AlertTriangle, X, FileText } from "lucide-react";
import type { ParsedFile } from "@/hooks/use-parser";
import { CoherenceAlert } from "./CoherenceAlert";
import { ParseResult } from "./ParseResult";

export function StatementCard({
  file,
  index,
  onRemove,
}: {
  file: ParsedFile;
  index: number;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(true);
  const success = file.status === "success" && file.data;

  return (
    <div className="card-tt overflow-hidden">
      <div className="w-full flex items-center gap-3 px-5 py-4">
        <button
          type="button"
          className="flex items-center gap-3 text-left flex-1 min-w-0"
          onClick={() => success && setOpen((o) => !o)}
          disabled={!success}
        >
          {success ? (
            <ChevronDown
              className={`h-5 w-5 flex-shrink-0 text-terracotta-deep transition-transform ${
                open ? "rotate-180" : ""
              }`}
              strokeWidth={1.5}
            />
          ) : file.status === "loading" ? (
            <Loader2
              className="h-5 w-5 flex-shrink-0 text-terracotta-deep animate-spin"
              strokeWidth={1.75}
            />
          ) : (
            <AlertTriangle
              className="h-5 w-5 flex-shrink-0 text-terracotta-deep"
              strokeWidth={1.75}
            />
          )}

          <div className="min-w-0">
            <h3 className="font-display text-xl text-foreground truncate">
              {success && file.data
                ? `Relevé ${file.data.releve.numero ? `n°${file.data.releve.numero}` : ""}`.trim()
                : file.status === "loading"
                  ? "Analyse en cours…"
                  : "Échec de l'analyse"}
            </h3>
            <p className="text-xs text-stone-grey mt-0.5 flex items-center gap-1.5 truncate">
              <FileText className="h-3 w-3 flex-shrink-0" strokeWidth={1.75} />
              <span className="truncate">{file.fileName}</span>
              {success && file.data?.releve.date_edition && (
                <span className="hidden sm:inline">· édité le {file.data.releve.date_edition}</span>
              )}
            </p>
          </div>
        </button>

        <div className="flex items-center gap-2 flex-shrink-0">
          {success && file.data && <CoherenceAlert coherence={file.data.controle_coherence} />}
          <button
            type="button"
            className="p-1.5 rounded-md text-stone-grey hover:text-terracotta-deep hover:bg-terracotta-pale transition-colors"
            onClick={onRemove}
            title="Retirer ce relevé"
            aria-label="Retirer ce relevé"
          >
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>
      </div>

      {file.status === "error" && (
        <div className="px-5 pb-5 -mt-1">
          <p className="text-sm text-stone-grey">{file.error}</p>
        </div>
      )}

      {success && file.data && open && (
        <div className="px-5 pb-6 border-t border-warm-beige pt-6">
          <ParseResult data={file.data} index={index} />
        </div>
      )}
    </div>
  );
}
