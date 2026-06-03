import type { Operation } from "@/lib/lbp-parser";

interface Props {
  operations: Operation[];
  ancienSolde: number | null;
}

function fmt(n: number | null | undefined): string {
  if (n == null) return "";
  return n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

export function OperationsTable({ operations, ancienSolde }: Props) {
  let running = ancienSolde;
  const rows = operations.map((op) => {
    if (running != null) {
      running = Math.round((running + (op.credit ?? 0) - (op.debit ?? 0)) * 100) / 100;
    }
    return { op, solde: running };
  });

  if (operations.length === 0) {
    return <p className="text-sm text-stone-grey italic py-4">Aucune opération sur ce compte.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-warm-beige bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-terracotta-deep text-white">
            <th className="text-left px-3 py-3 label-caps">Date</th>
            <th className="text-left px-3 py-3 label-caps">Libellé</th>
            <th className="text-right px-3 py-3 label-caps hidden sm:table-cell">Débit</th>
            <th className="text-right px-3 py-3 label-caps hidden sm:table-cell">Crédit</th>
            <th className="text-right px-3 py-3 label-caps sm:hidden">Montant</th>
            <th className="text-right px-3 py-3 label-caps">Solde</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ op, solde }, i) => {
            const isDebit = op.debit != null;
            const isCredit = op.credit != null;
            const bg = isDebit
              ? "bg-[color:var(--color-debit-bg)]"
              : isCredit
              ? "bg-[color:var(--color-credit-bg)]"
              : i % 2
              ? "bg-cream"
              : "bg-white";
            return (
              <tr key={i} className={`${bg} border-t border-warm-beige`}>
                <td className="px-3 py-2.5 whitespace-nowrap font-medium">{op.date}</td>
                <td className="px-3 py-2.5">{op.libelle}</td>
                <td className="px-3 py-2.5 text-right whitespace-nowrap hidden sm:table-cell" style={{ color: "var(--color-debit)" }}>
                  {isDebit ? `−${fmt(op.debit)}` : ""}
                </td>
                <td className="px-3 py-2.5 text-right whitespace-nowrap hidden sm:table-cell" style={{ color: "var(--color-credit)" }}>
                  {isCredit ? `+${fmt(op.credit)}` : ""}
                </td>
                <td
                  className="px-3 py-2.5 text-right whitespace-nowrap sm:hidden font-semibold"
                  style={{ color: isDebit ? "var(--color-debit)" : "var(--color-credit)" }}
                >
                  {isDebit ? `−${fmt(op.debit)}` : `+${fmt(op.credit)}`}
                </td>
                <td className="px-3 py-2.5 text-right whitespace-nowrap text-stone-grey">
                  {fmt(solde)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
