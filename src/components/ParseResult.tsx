import { RotateCcw } from "lucide-react";
import type { ParsedStatement } from "@/lib/lbp-parser";
import { CoherenceAlert } from "./CoherenceAlert";
import { ExportButtons } from "./ExportButtons";
import { OperationsTable } from "./OperationsTable";
import { SavingsSection } from "./SavingsSection";

function fmt(n: number | null | undefined): string {
  if (n == null) return "—";
  return n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

export function ParseResult({
  data,
  onReset,
}: {
  data: ParsedStatement;
  onReset: () => void;
}) {
  const cc = data.compte_courant;

  return (
    <div className="space-y-8">
      {/* Header bandeau */}
      <header className="card-tt p-5 sm:p-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="label-caps text-terracotta-deep mb-1">La Banque Postale</p>
          <h1 className="font-display text-2xl sm:text-3xl text-foreground">
            Relevé {data.releve.numero ? `n°${data.releve.numero}` : ""}
          </h1>
          {data.releve.date_edition && (
            <p className="text-sm text-stone-grey mt-1">
              Édité le {data.releve.date_edition}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-3">
          <CoherenceAlert coherence={data.controle_coherence} />
          <button className="btn-outline" onClick={onReset}>
            <RotateCcw className="h-3.5 w-3.5" strokeWidth={2} />
            Nouveau relevé
          </button>
        </div>
      </header>

      {/* Situation des comptes */}
      {data.situation.comptes.length > 0 && (
        <section>
          <h2 className="text-2xl mb-4">
            Situation des comptes{" "}
            {data.situation.date && (
              <span className="text-sm text-stone-grey font-sans font-normal">
                au {data.situation.date}
              </span>
            )}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.situation.comptes.map((c, i) => (
              <div key={i} className="card-tt card-tt-hover p-4">
                <p className="label-caps text-terracotta-deep mb-2">{c.compte}</p>
                <p className="font-display text-2xl text-foreground">{fmt(c.solde)}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Compte courant */}
      {cc && (
        <section>
          <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4">
            <h2 className="text-2xl">Compte Courant Postal</h2>
            <p className="text-xs text-stone-grey">
              {cc.operations.length} opération{cc.operations.length > 1 ? "s" : ""}
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <SummaryCard label="Ancien solde" value={fmt(cc.ancien_solde?.montant)} />
            <SummaryCard
              label="Total débit"
              value={fmt(cc.total_debit)}
              color="var(--color-debit)"
            />
            <SummaryCard
              label="Total crédit"
              value={fmt(cc.total_credit)}
              color="var(--color-credit)"
            />
            <SummaryCard label="Nouveau solde" value={fmt(cc.nouveau_solde?.montant)} strong />
          </div>
          <OperationsTable
            operations={cc.operations}
            ancienSolde={cc.ancien_solde?.montant ?? null}
          />
        </section>
      )}

      <SavingsSection livrets={data.comptes_epargne} />

      {/* Exports */}
      <section className="card-tt p-5 sm:p-6">
        <h2 className="text-xl mb-1">Exporter</h2>
        <p className="text-sm text-stone-grey mb-4">
          Téléchargez les données extraites dans le format de votre choix.
        </p>
        <ExportButtons data={data} />
      </section>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  color,
  strong,
}: {
  label: string;
  value: string;
  color?: string;
  strong?: boolean;
}) {
  return (
    <div className="card-tt p-3 sm:p-4">
      <p className="label-caps text-stone-grey mb-1.5">{label}</p>
      <p
        className={`font-display ${strong ? "text-2xl" : "text-xl"}`}
        style={{ color: color ?? "var(--color-foreground)" }}
      >
        {value}
      </p>
    </div>
  );
}
