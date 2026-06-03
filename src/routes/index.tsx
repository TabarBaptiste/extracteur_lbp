import { createFileRoute } from "@tanstack/react-router";
import { Loader2, AlertTriangle } from "lucide-react";
import { DropZone } from "@/components/DropZone";
import { ParseResult } from "@/components/ParseResult";
import { useParser } from "@/hooks/use-parser";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Extracteur de relevés La Banque Postale" },
      {
        name: "description",
        content:
          "Convertissez vos relevés PDF La Banque Postale en JSON, CSV ou XLSX. 100% confidentiel, traitement dans votre navigateur.",
      },
      { property: "og:title", content: "Extracteur de relevés La Banque Postale" },
      {
        property: "og:description",
        content: "Convertissez vos relevés PDF LBP en JSON, CSV ou XLSX — sans rien envoyer sur Internet.",
      },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Montserrat:wght@400;600;700&display=swap",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const { state, data, error, parse, reset } = useParser();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-warm-beige bg-cream/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-full bg-terracotta-bright flex items-center justify-center text-white font-display text-lg">
              L
            </div>
            <div>
              <p className="font-display text-lg leading-tight">Extracteur LBP</p>
              <p className="label-caps text-stone-grey leading-tight">PDF → JSON · CSV · XLSX</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {state !== "success" && (
          <div className="text-center mb-8 sm:mb-12 max-w-2xl mx-auto">
            <h1 className="font-display text-3xl sm:text-5xl text-foreground mb-3 leading-tight">
              Vos relevés bancaires, <em className="text-terracotta-deep not-italic">extraits proprement.</em>
            </h1>
            <p className="text-stone-grey text-base sm:text-lg">
              Déposez un relevé PDF de La Banque Postale. Nous en extrayons toutes les opérations
              et vous les rendons en JSON, CSV ou XLSX — sans jamais quitter votre navigateur.
            </p>
          </div>
        )}

        {state === "idle" && <DropZone onFile={parse} />}

        {state === "loading" && (
          <div className="card-tt p-8 sm:p-12 flex flex-col items-center text-center">
            <Loader2 className="h-10 w-10 text-terracotta-deep animate-spin mb-4" strokeWidth={1.5} />
            <p className="font-display text-xl">Analyse en cours…</p>
            <p className="text-sm text-stone-grey mt-1">Extraction du texte et parsing des opérations.</p>
          </div>
        )}

        {state === "error" && (
          <div className="space-y-6">
            <div
              className="rounded-lg border p-5 flex gap-3"
              style={{
                borderColor: "var(--color-terracotta-bright)",
                backgroundColor: "var(--color-terracotta-pale)",
              }}
            >
              <AlertTriangle
                className="h-5 w-5 flex-shrink-0 mt-0.5 text-terracotta-deep"
                strokeWidth={1.75}
              />
              <div>
                <p className="font-semibold text-foreground mb-1">Impossible de lire ce PDF</p>
                <p className="text-sm text-stone-grey">{error}</p>
              </div>
            </div>
            <DropZone onFile={parse} />
            <div className="text-center">
              <button className="btn-outline" onClick={reset}>
                Réessayer
              </button>
            </div>
          </div>
        )}

        {state === "success" && data && <ParseResult data={data} onReset={reset} />}
      </main>

      <footer className="border-t border-warm-beige mt-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 text-center text-xs text-stone-grey">
          Aucune donnée n'est envoyée, stockée ni transmise. Le parsing s'exécute intégralement dans votre navigateur.
        </div>
      </footer>
    </div>
  );
}
