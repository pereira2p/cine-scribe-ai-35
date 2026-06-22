import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, AlertTriangle, Loader2, XCircle, Film } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { UploadDropzone } from "@/components/UploadDropzone";

export const Route = createFileRoute("/_authenticated/uploads")({ component: Page });

function Page() {
  const { data: uploads, refetch } = useQuery({
    queryKey: ["uploads"],
    queryFn: async () => {
      const { data } = await supabase
        .from("uploads")
        .select("id, filename, size, status, bytes_uploaded, error_message, created_at, movie_id, movies(id,title,poster_path)")
        .order("created_at", { ascending: false })
        .limit(50);
      return data ?? [];
    },
  });

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-10 sm:px-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Uploads</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Envie seus arquivos para o Cloudflare R2. Para vincular a um filme já cadastrado, abra o filme e use “Enviar arquivo”.
        </p>
      </header>

      <section>
        <UploadDropzone onCompleted={() => refetch()} />
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Histórico</h2>
        {(!uploads || uploads.length === 0) && (
          <p className="rounded-xl border border-border bg-surface/40 p-6 text-center text-sm text-muted-foreground">
            Nenhum upload ainda.
          </p>
        )}
        <ul className="space-y-2">
          {(uploads ?? []).map((u) => (
            <li key={u.id} className="flex items-center gap-3 rounded-xl border border-border bg-surface/60 p-3">
              <StatusIcon status={u.status as string} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{u.filename}</p>
                <p className="text-[11px] text-muted-foreground">
                  {(Number(u.size) / 1024 / 1024).toFixed(1)} MB
                  {u.error_message ? ` • ${u.error_message}` : ""}
                </p>
              </div>
              {u.movies && (
                <Link
                  to="/movie/$movieId"
                  params={{ movieId: (u.movies as { id: string }).id }}
                  className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                >
                  <Film className="h-3.5 w-3.5" />
                  {(u.movies as { title: string }).title}
                </Link>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function StatusIcon({ status }: { status: string }) {
  if (status === "completed") return <CheckCircle2 className="h-4 w-4 text-emerald-400" />;
  if (status === "failed") return <AlertTriangle className="h-4 w-4 text-destructive" />;
  if (status === "aborted") return <XCircle className="h-4 w-4 text-muted-foreground" />;
  return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
}