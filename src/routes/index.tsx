import { createFileRoute } from "@tanstack/react-router";
import { DropZone } from "@/components/DropZone";
import { ResultsView } from "@/components/ResultsView";
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
        content:
          "Convertissez vos relevés PDF LBP en JSON, CSV ou XLSX — sans rien envoyer sur Internet.",
      },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const { files, parseFiles, removeFile, reset } = useParser();
  const hasFiles = files.length > 0;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-white/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-full bg-ink flex items-center justify-center text-white font-display text-lg">
              L
            </div>
            <div>
              <p className="font-display text-lg font-bold leading-tight">Extracteur LBP</p>
              <p className="label-caps text-muted-foreground leading-tight">PDF → JSON · CSV · XLSX</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {!hasFiles && (
          <>
            <div className="text-center mb-8 sm:mb-12 max-w-2xl mx-auto">
              <h1 className="font-display text-4xl sm:text-6xl text-ink mb-4 leading-[1.05] tracking-[-0.035em]">
                Vos relevés bancaires,{" "}
                <em className="text-brand not-italic">extraits proprement.</em>
              </h1>
            </div>
            <DropZone onFiles={parseFiles} />
          </>
        )}

        {hasFiles && (
          <ResultsView files={files} onFiles={parseFiles} onRemove={removeFile} onReset={reset} />
        )}
      </main>

    </div>
  );
}
