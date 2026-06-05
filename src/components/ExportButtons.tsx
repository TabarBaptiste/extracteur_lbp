import { FileJson, FileSpreadsheet, FileText } from "lucide-react";
import type { ParsedStatement } from "@/lib/lbp-parser";
import { downloadCsv, downloadJson, downloadXlsx } from "@/lib/exporters";

export function ExportButtons({ data, index = 0 }: { data: ParsedStatement; index?: number }) {
  return (
    <div className="flex flex-wrap gap-3">
      <button className="btn-cta" onClick={() => downloadXlsx(data, index)}>
        <FileSpreadsheet className="h-4 w-4" strokeWidth={1.75} />
        XLSX
      </button>
      <button className="btn-outline" onClick={() => downloadCsv(data, index)}>
        <FileText className="h-4 w-4" strokeWidth={1.75} />
        CSV
      </button>
      <button className="btn-outline" onClick={() => downloadJson(data, index)}>
        <FileJson className="h-4 w-4" strokeWidth={1.75} />
        JSON
      </button>
    </div>
  );
}
