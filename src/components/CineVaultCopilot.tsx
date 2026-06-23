import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, X, Send, Loader2 } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { askCopilot } from "@/lib/copilot.functions";

type Msg = { role: "user" | "assistant"; content: string };

export function CineVaultCopilot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const ask = useServerFn(askCopilot);
  const mutation = useMutation({
    mutationFn: (prompt: string) =>
      ask({ data: { prompt, history: messages.slice(-10) } }),
    onSuccess: (res) => setMessages((m) => [...m, { role: "assistant", content: res.answer }]),
    onError: (e: unknown) =>
      setMessages((m) => [
        ...m,
        { role: "assistant", content: e instanceof Error ? e.message : "Falha." },
      ]),
  });

  function send(text: string) {
    const t = text.trim();
    if (!t || mutation.isPending) return;
    setMessages((m) => [...m, { role: "user", content: t }]);
    setInput("");
    mutation.mutate(t);
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: 1e9, behavior: "smooth" }));
  }

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
        className="fixed bottom-20 right-4 z-40 inline-flex items-center gap-2 rounded-full bg-gradient-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-glow md:bottom-5 md:right-5"
      >
        <Sparkles className="h-4 w-4" />
        <span className="hidden sm:inline">CineVault AI</span>
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
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
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
              <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
                {messages.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-primary shadow-glow">
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <p className="max-w-xs text-sm text-muted-foreground">
                      Pergunte sobre sua biblioteca, peça recomendações por humor, duração ou estilo.
                    </p>
                    <div className="grid w-full gap-2 pt-2 text-left text-xs">
                      {[
                        "Tenho 1h40 livre, sugira algo leve.",
                        "Quero um filme parecido com Interestelar.",
                        "Melhor filme da minha biblioteca que ainda não vi.",
                      ].map((q) => (
                        <button
                          key={q}
                          onClick={() => send(q)}
                          className="rounded-xl border border-border bg-surface px-3 py-2 text-left text-muted-foreground hover:border-primary/40 hover:text-foreground"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  messages.map((m, i) => (
                    <div
                      key={i}
                      className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap ${
                        m.role === "user"
                          ? "ml-auto bg-primary text-primary-foreground"
                          : "bg-elevated text-foreground"
                      }`}
                    >
                      {m.content}
                    </div>
                  ))
                )}
                {mutation.isPending && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" /> Pensando...
                  </div>
                )}
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  send(input);
                }}
                className="flex gap-2 border-t border-border p-3"
              >
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Pergunte algo..."
                  disabled={mutation.isPending}
                />
                <Button type="submit" size="icon" disabled={!input.trim() || mutation.isPending}>
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}