import { useState, useRef, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Sparkles, Search as SearchIcon, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UniversalImportDialog } from "@/components/UniversalImportDialog";

const PLACEHOLDERS = [
  "Interestelar",
  "Christopher Nolan",
  "Quero um filme de ficção científica",
  "https://archive.org/details/...",
  "Algo parecido com Duna",
  "Filmes curtos para hoje",
];

export function UniversalSearchBar({ autoFocus = false }: { autoFocus?: boolean }) {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  useEffect(() => {
    const id = setInterval(() => setPlaceholderIdx((i) => (i + 1) % PLACEHOLDERS.length), 3200);
    return () => clearInterval(id);
  }, []);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const value = q.trim();
    if (!value) return;
    navigate({ to: "/search", search: { q: value } });
  }

  return (
    <>
      <div className="mx-auto w-full max-w-2xl space-y-4">
        <form onSubmit={submit} className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-primary">
            <Sparkles className="h-5 w-5" />
          </div>
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={PLACEHOLDERS[placeholderIdx]}
            className="h-16 w-full rounded-2xl border border-border bg-surface/80 pl-12 pr-32 text-base shadow-elevated outline-none ring-0 backdrop-blur-xl transition-all placeholder:text-muted-foreground/70 focus:border-primary/60 focus:bg-surface focus:shadow-glow sm:text-lg"
            aria-label="O que você quer assistir hoje?"
          />
          <Button
            type="submit"
            size="sm"
            disabled={!q.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 gap-1 bg-gradient-primary text-primary-foreground shadow-glow"
          >
            <SearchIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Buscar</span>
          </Button>
        </form>
        <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground">
          <span className="hidden sm:inline">Pesquisa em: biblioteca, TMDB, Internet Archive, URL.</span>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/50 px-3 py-1.5 transition-colors hover:border-primary/40 hover:text-foreground"
          >
            <Plus className="h-3.5 w-3.5" /> Adicionar filme
          </button>
        </div>
      </div>
      <UniversalImportDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
