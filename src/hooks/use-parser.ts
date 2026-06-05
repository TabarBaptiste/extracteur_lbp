import { useCallback, useState } from "react";
import { parsePdfFile, type ParsedStatement } from "@/lib/lbp-parser";

export type FileStatus = "loading" | "success" | "error";

export interface ParsedFile {
  id: string;
  fileName: string;
  status: FileStatus;
  data?: ParsedStatement;
  error?: string;
}

let counter = 0;
const nextId = () => `f${Date.now()}_${counter++}`;

export function useParser() {
  const [files, setFiles] = useState<ParsedFile[]>([]);

  const parseFiles = useCallback((incoming: File[]) => {
    if (incoming.length === 0) return;

    const entries: ParsedFile[] = incoming.map((f) => ({
      id: nextId(),
      fileName: f.name,
      status: "loading" as const,
    }));
    setFiles((prev) => [...prev, ...entries]);

    incoming.forEach((file, i) => {
      const id = entries[i].id;
      void (async () => {
        try {
          if (!file.name.toLowerCase().endsWith(".pdf")) {
            throw new Error("Seuls les fichiers PDF sont acceptés.");
          }
          const data = await parsePdfFile(file);
          setFiles((prev) =>
            prev.map((e) => (e.id === id ? { ...e, status: "success", data } : e)),
          );
        } catch (err) {
          const message =
            err instanceof Error ? err.message : "Erreur inconnue lors du parsing du PDF.";
          setFiles((prev) =>
            prev.map((e) => (e.id === id ? { ...e, status: "error", error: message } : e)),
          );
        }
      })();
    });
  }, []);

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const reset = useCallback(() => setFiles([]), []);

  return { files, parseFiles, removeFile, reset };
}
