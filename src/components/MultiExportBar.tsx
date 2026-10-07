import { FileJson, FileSpreadsheet, FileText, Files } from "lucide-react";
import type { ParsedStatement } from "@/lib/lbp-parser";
import {
  downloadCsvMerged,
  downloadJsonMerged,
  downloadJsonSeparate,
  downloadXlsxMerged,
} from "@/lib/exporters";

/**
 * Global export controls for several statements at once: a single merged file
 * (JSON / CSV / XLSX) or one JSON file per statement.
 */
export function MultiExportBar({ items }: { items: ParsedStatement[] }) {
  const count = items.length;
  if (count === 0) return null;

  return (
    <section className="card-tt p-5 sm:p-6">
      <h2 className="text-xl mb-4">
        Exporter tout{" "}
        <span className="text-sm text-muted-foreground font-sans font-normal">
          ({count} relevé{count > 1 ? "s" : ""})
        </span>
      </h2>

      <div className="space-y-4">
        <div>
          <p className="label-caps text-muted-foreground mb-2">Fichier unique groupé</p>
          <div className="flex flex-wrap gap-3">
            <button className="btn-cta" onClick={() => downloadJsonMerged(items)}>
              <FileJson className="h-4 w-4" strokeWidth={1.75} />
              JSON groupé
            </button>
            <button className="btn-outline" onClick={() => downloadCsvMerged(items)}>
              <FileText className="h-4 w-4" strokeWidth={1.75} />
              CSV groupé
            </button>
            <button className="btn-outline" onClick={() => downloadXlsxMerged(items)}>
              <FileSpreadsheet className="h-4 w-4" strokeWidth={1.75} />
              XLSX groupé
            </button>
          </div>
        </div>

        <div>
          <p className="label-caps text-muted-foreground mb-2">Un fichier par relevé</p>
          <div className="flex flex-wrap gap-3">
            <button className="btn-outline" onClick={() => downloadJsonSeparate(items)}>
              <Files className="h-4 w-4" strokeWidth={1.75} />
              JSON séparé ({count} fichier{count > 1 ? "s" : ""})
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
