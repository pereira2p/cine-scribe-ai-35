import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CineVaultCopilot() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("cinevault:open-copilot", handler);
    return () => window.removeEventListener("cinevault:open-copilot", handler);
  }, []);

  return (
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
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
            className="flex w-full max-w-md flex-col rounded-t-3xl border border-border bg-card p-6 shadow-elevated sm:rounded-3xl"
          >
            <header className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary shadow-glow">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm font-semibold">CineVault AI</div>
                  <div className="text-xs text-muted-foreground">Copiloto da sua biblioteca</div>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </header>
            <p className="text-sm text-muted-foreground">
              O copiloto inteligente será liberado na <strong className="text-foreground">Fase 4</strong>.
              Ele analisará apenas os filmes da sua biblioteca local para responder perguntas como
              <em> "quais filmes de suspense ainda não vi?"</em> ou <em>"tenho algo do Christopher Nolan?"</em>.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}