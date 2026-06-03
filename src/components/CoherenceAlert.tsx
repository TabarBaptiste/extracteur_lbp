import { Check, AlertTriangle } from "lucide-react";
import type { Coherence } from "@/lib/lbp-parser";

export function CoherenceAlert({ coherence }: { coherence: Coherence }) {
  if (coherence.coherent == null) return null;
  const ok = coherence.coherent;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full label-caps text-white"
      style={{
        backgroundColor: ok ? "var(--color-moss-green)" : "var(--color-terracotta-bright)",
      }}
    >
      {ok ? (
        <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
      ) : (
        <AlertTriangle className="h-3.5 w-3.5" strokeWidth={2.5} />
      )}
      {ok ? "Solde cohérent" : `Écart ${coherence.ecart} €`}
    </span>
  );
}
