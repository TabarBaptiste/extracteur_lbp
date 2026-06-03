import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { Livret } from "@/lib/lbp-parser";
import { OperationsTable } from "./OperationsTable";

function fmt(n: number | null | undefined): string {
  if (n == null) return "—";
  return n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

export function SavingsSection({ livrets }: { livrets: Livret[] }) {
  if (livrets.length === 0) return null;
  return (
    <section>
      <h2 className="text-2xl mb-4">Comptes d'épargne</h2>
      <div className="space-y-3">
        {livrets.map((l, i) => (
          <LivretCard key={i} livret={l} defaultOpen={i === 0} />
        ))}
      </div>
    </section>
  );
}

function LivretCard({ livret, defaultOpen }: { livret: Livret; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="card-tt overflow-hidden">
      <button
        type="button"
        className="w-full flex items-center justify-between px-5 py-4 text-left"
        onClick={() => setOpen((o) => !o)}
      >
        <div>
          <h3 className="font-display text-xl text-foreground">{livret.type}</h3>
          <p className="text-xs text-stone-grey mt-0.5 label-caps">
            Solde {fmt(livret.nouveau_solde?.montant)} · {livret.operations.length} op.
          </p>
        </div>
        <ChevronDown
          className={`h-5 w-5 text-terracotta-deep transition-transform ${open ? "rotate-180" : ""}`}
          strokeWidth={1.5}
        />
      </button>
      {open && (
        <div className="px-5 pb-5 space-y-3">
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-stone-grey">
            {livret.ancien_solde && (
              <span>
                Ancien solde ({livret.ancien_solde.date}) :{" "}
                <strong className="text-foreground">{fmt(livret.ancien_solde.montant)}</strong>
              </span>
            )}
            {livret.nouveau_solde && (
              <span>
                Nouveau solde ({livret.nouveau_solde.date}) :{" "}
                <strong className="text-foreground">{fmt(livret.nouveau_solde.montant)}</strong>
              </span>
            )}
          </div>
          <OperationsTable
            operations={livret.operations}
            ancienSolde={livret.ancien_solde?.montant ?? null}
          />
        </div>
      )}
    </div>
  );
}
