import type { ParsedStatement } from "@/lib/lbp-parser";
import { ExportButtons } from "./ExportButtons";
import { OperationsTable } from "./OperationsTable";
import { SavingsSection } from "./SavingsSection";

function fmt(n: number | null | undefined): string {
  if (n == null) return "—";
  return n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

/**
 * Detail view of a single statement (situation, compte courant, livrets).
 * The enclosing card (StatementCard) renders the header, coherence badge
 * and remove control; the per-statement export buttons live here at the foot.
 */
export function ParseResult({ data, index = 0 }: { data: ParsedStatement; index?: number }) {
  const cc = data.compte_courant;

  return (
    <div className="space-y-8">
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

      {/* Export de ce relevé uniquement */}
      <section className="card-tt p-5 sm:p-6">
        <h2 className="text-xl mb-1">Exporter ce relevé</h2>
        <p className="text-sm text-stone-grey mb-4">
          Téléchargez uniquement les données de ce relevé.
        </p>
        <ExportButtons data={data} index={index} />
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
