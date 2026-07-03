import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useLibrary } from "@/lib/library/context";
import { tmdbImage } from "@/lib/tmdb/client";
import { Skip, X, Check } from "lucide-react";

export function TmdbPickerDialog() {
  const { currentPick, pending, resolvePick, skipPick, closePicker } = useLibrary();
  if (!currentPick) return null;
  const remaining = pending.length;
  return (
    <Dialog open onOpenChange={(o) => { if (!o) closePicker(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Qual filme é este?</DialogTitle>
          <DialogDescription className="truncate">
            <span className="text-foreground">{currentPick.file.name}</span>
            <span className="ml-2 text-xs">({remaining} restante{remaining === 1 ? "" : "s"})</span>
          </DialogDescription>
        </DialogHeader>
        <div className="grid max-h-[60vh] gap-2 overflow-y-auto pr-1">
          {currentPick.candidates.map((c) => (
            <button
              key={c.id}
              onClick={() => void resolvePick(c.id)}
              className="flex items-start gap-3 rounded-lg border border-border bg-surface/50 p-2 text-left transition hover:bg-elevated"
            >
              <div className="h-24 w-16 shrink-0 overflow-hidden rounded-md bg-surface">
                {c.poster_path ? (
                  <img src={tmdbImage(c.poster_path, "w200") ?? ""} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[10px] text-muted-foreground">Sem poster</div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium">
                  {c.title}
                  {c.release_date && <span className="ml-2 text-xs text-muted-foreground">({c.release_date.slice(0, 4)})</span>}
                </p>
                {c.original_title && c.original_title !== c.title && (
                  <p className="text-xs text-muted-foreground">{c.original_title}</p>
                )}
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{c.overview || "Sem sinopse."}</p>
              </div>
              <Check className="mt-2 h-4 w-4 shrink-0 text-primary opacity-0 group-hover:opacity-100" />
            </button>
          ))}
        </div>
        <DialogFooter className="mt-2">
          <Button variant="ghost" onClick={skipPick} className="gap-1.5">
            <X className="h-4 w-4" /> Pular este arquivo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// keep unused-safe placeholder import (lucide has no Skip)
void Skip;