import { useCallback, useState } from "react";
import { parsePdfFile, type ParsedStatement } from "@/lib/lbp-parser";

export type ParserState = "idle" | "loading" | "success" | "error";

export function useParser() {
  const [state, setState] = useState<ParserState>("idle");
  const [data, setData] = useState<ParsedStatement | null>(null);
  const [error, setError] = useState<string | null>(null);

  const parse = useCallback(async (file: File) => {
    setState("loading");
    setError(null);
    setData(null);
    try {
      if (!file.name.toLowerCase().endsWith(".pdf")) {
        throw new Error("Seuls les fichiers PDF sont acceptés.");
      }
      const result = await parsePdfFile(file);
      setData(result);
      setState("success");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue lors du parsing du PDF.");
      setState("error");
    }
  }, []);

  const reset = useCallback(() => {
    setState("idle");
    setData(null);
    setError(null);
  }, []);

  return { state, data, error, parse, reset };
}
