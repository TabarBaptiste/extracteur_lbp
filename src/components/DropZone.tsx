import { useCallback, useRef, useState } from "react";
import { Upload, FileText, ShieldCheck, Plus } from "lucide-react";

interface Props {
  onFiles: (files: File[]) => void;
  disabled?: boolean;
  /** Compact variant used to add more statements once results are shown. */
  compact?: boolean;
}

export function DropZone({ onFiles, disabled, compact }: Props) {
  const [over, setOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;
      onFiles(Array.from(files));
    },
    [onFiles],
  );

  return (
    <div className="w-full">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          if (!disabled) handleFiles(e.dataTransfer.files);
        }}
        onClick={() => !disabled && inputRef.current?.click()}
        className={[
          "flex flex-col items-center justify-center text-center cursor-pointer transition-all",
          "rounded-lg",
          compact ? "px-6 py-6" : "px-6 py-12 sm:py-16 min-h-[150px] sm:min-h-[240px]",
          over
            ? "border-2 border-solid border-terracotta-bright bg-terracotta-pale"
            : "border-2 border-dashed border-warm-beige bg-cream",
          disabled ? "opacity-60 cursor-not-allowed" : "hover:border-terracotta-bright",
        ].join(" ")}
      >
        {compact ? (
          <div className="flex items-center gap-2 text-terracotta-deep">
            <Plus className="h-5 w-5" strokeWidth={1.75} />
            <span className="font-display text-lg">Ajouter d'autres relevés</span>
          </div>
        ) : (
          <>
            <div className="rounded-full bg-terracotta-pale p-4 mb-4">
              {disabled ? (
                <FileText className="h-8 w-8 text-terracotta-deep" strokeWidth={1.5} />
              ) : (
                <Upload className="h-8 w-8 text-terracotta-deep" strokeWidth={1.5} />
              )}
            </div>
            <h2 className="font-display text-2xl sm:text-3xl text-foreground mb-2">
              {disabled ? "Analyse en cours…" : "Déposez vos relevés LBP"}
            </h2>
            <p className="text-sm text-stone-grey mb-6 max-w-md">
              Glissez-déposez un ou plusieurs PDF de La Banque Postale, ou cliquez pour parcourir.
            </p>
            <button
              type="button"
              className="btn-cta"
              onClick={(e) => {
                e.stopPropagation();
                inputRef.current?.click();
              }}
              disabled={disabled}
            >
              Parcourir
            </button>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          multiple
          className="hidden"
          onChange={(e) => {
            handleFiles(e.target.files);
            // Allow re-selecting the same file(s) again.
            e.target.value = "";
          }}
        />
      </div>
      {!compact && (
        <div className="mt-4 flex items-center justify-center gap-2 text-xs text-stone-grey">
          <ShieldCheck className="h-4 w-4" strokeWidth={1.5} />
          <span>
            100 % confidentiel — Vos PDFs sont analysés dans votre navigateur, rien n'est envoyé sur
            Internet.
          </span>
        </div>
      )}
    </div>
  );
}
