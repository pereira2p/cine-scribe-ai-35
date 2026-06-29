import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { tmdbImg } from "./tmdb-detail.server";

type AssetKind = Database["public"]["Enums"]["movie_asset_kind"];

interface AssetSpec {
  kind: AssetKind;
  path: string;
  size: "w200" | "w342" | "w500" | "w780" | "original";
}

/**
 * Records TMDB asset URLs in `movie_assets`. Best-effort R2 caching: if R2
 * credentials are present we try to mirror the file; otherwise we fall back
 * to the TMDB CDN URL so the UI always has a working image.
 */
export async function cacheMovieAssets(
  supabase: SupabaseClient<Database>,
  userId: string,
  movieId: string,
  specs: AssetSpec[],
): Promise<{ saved: number; cached: number }> {
  let saved = 0;
  let cached = 0;
  const r2Available = !!(
    process.env.R2_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_BUCKET
  );
  for (const spec of specs) {
    if (!spec.path) continue;
    const tmdbUrl = tmdbImg(spec.path, spec.size)!;
    let finalUrl = tmdbUrl;
    let source: "tmdb" | "r2" = "tmdb";
    if (r2Available) {
      try {
        const mirrored = await mirrorToR2(tmdbUrl, `assets/${movieId}/${spec.kind}${spec.path}`);
        if (mirrored) {
          finalUrl = mirrored;
          source = "r2";
          cached++;
        }
      } catch {
        // fall through to TMDB url
      }
    }
    await supabase
      .from("movie_assets")
      .delete()
      .eq("movie_id", movieId)
      .eq("kind", spec.kind);
    const { error } = await supabase.from("movie_assets").insert({
      user_id: userId,
      movie_id: movieId,
      kind: spec.kind,
      url: finalUrl,
      source,
      is_default: true,
    });
    if (!error) saved++;
  }
  return { saved, cached };
}

async function mirrorToR2(sourceUrl: string, key: string): Promise<string | null> {
  const res = await fetch(sourceUrl);
  if (!res.ok) return null;
  const contentType = res.headers.get("content-type") ?? "image/jpeg";
  const buf = new Uint8Array(await res.arrayBuffer());
  const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
  const accountId = process.env.R2_ACCOUNT_ID!;
  const client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
  await client.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET!,
      Key: key,
      Body: buf,
      ContentType: contentType,
    }),
  );
  const base = process.env.R2_PUBLIC_BASE_URL;
  if (base) return `${base.replace(/\/$/, "")}/${key}`;
  return null;
}