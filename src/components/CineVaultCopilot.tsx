import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CineVaultCopilot() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("myvault:open-copilot", handler);
    return () => window.removeEventListener("myvault:open-copilot", handler);
  }, []);

  return (
    <>
      <motion.button
        type="button"
        onClick={() => setOpen(true)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-5 right-5 z-50 inline-flex items-center gap-2 rounded-full bg-gradient-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-glow"
      >
        <Sparkles className="h-4 w-4" />
        <span className="hidden sm:inline">MyVault AI</span>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-end bg-background/60 backdrop-blur-sm sm:items-center sm:p-6"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ x: 40, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 40, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="flex h-[80vh] w-full max-w-md flex-col rounded-t-3xl border border-border bg-card shadow-elevated sm:h-[640px] sm:rounded-3xl"
            >
              <header className="flex items-center justify-between border-b border-border p-4">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary shadow-glow">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold">MyVault AI</div>
                    <div className="text-xs text-muted-foreground">Copiloto da sua biblioteca</div>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </header>
              <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-primary shadow-glow">
                  <Sparkles className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold">Em breve na Fase 3</h3>
                <p className="max-w-xs text-sm text-muted-foreground">
                  O copiloto vai conhecer toda sua biblioteca e recomendar filmes baseados no seu humor,
                  tempo dispon\u00edvel, favoritos e hist\u00f3rico — usando linguagem natural.
                </p>
                <div className="grid w-full gap-2 pt-2 text-left text-xs text-muted-foreground">
                  {[
                    "\u201cTenho 1h40 livre, sugira algo leve.\u201d",
                    "\u201cQuero um filme parecido com Interestelar.\u201d",
                    "\u201cMelhor filme da minha biblioteca que ainda n\u00e3o vi.\u201d",
                  ].map((q) => (
                    <div key={q} className="rounded-xl border border-border bg-surface px-3 py-2">{q}</div>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}