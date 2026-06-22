/**
 * Cloudflare R2 storage provider (S3-compatible).
 * Server-only — never import from client modules.
 */
import { S3Client, DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { StorageProvider, StreamSource, UploadHandle, UploadInit } from "./storage";

function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Variável de ambiente ${name} não configurada.`);
  return v;
}

let _client: S3Client | null = null;
function client(): S3Client {
  if (_client) return _client;
  const accountId = env("R2_ACCOUNT_ID");
  _client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env("R2_ACCESS_KEY_ID"),
      secretAccessKey: env("R2_SECRET_ACCESS_KEY"),
    },
  });
  return _client;
}

function bucket(): string {
  return env("R2_BUCKET");
}

function safeFilename(name: string): string {
  return name.replace(/[^\w.\-]+/g, "_").slice(0, 120);
}

export const R2StorageProvider: StorageProvider = {
  id: "r2",
  async initUpload(init: UploadInit): Promise<UploadHandle> {
    const storageKey = `videos/${Date.now()}-${crypto.randomUUID()}-${safeFilename(init.filename)}`;
    const cmd = new PutObjectCommand({
      Bucket: bucket(),
      Key: storageKey,
      ContentType: init.mimeType,
      ContentLength: init.size,
    });
    const uploadUrl = await getSignedUrl(client(), cmd, { expiresIn: 60 * 60 });
    return {
      uploadUrl,
      storageKey,
      headers: { "Content-Type": init.mimeType },
    };
  },

  async getStreamSource(storageKey: string): Promise<StreamSource> {
    const cmd = new GetObjectCommand({ Bucket: bucket(), Key: storageKey });
    const url = await getSignedUrl(client(), cmd, { expiresIn: 60 * 60 * 6 });
    const mimeType = storageKey.endsWith(".webm")
      ? "video/webm"
      : storageKey.endsWith(".mkv")
      ? "video/x-matroska"
      : "video/mp4";
    return {
      url,
      mimeType,
      protocol: "mp4",
      expiresAt: Date.now() + 1000 * 60 * 60 * 6,
    };
  },

  async generateSignedUrl(storageKey: string, expiresInSeconds = 900): Promise<string> {
    const cmd = new GetObjectCommand({ Bucket: bucket(), Key: storageKey });
    return getSignedUrl(client(), cmd, { expiresIn: expiresInSeconds });
  },

  async delete(storageKey: string): Promise<void> {
    await client().send(new DeleteObjectCommand({ Bucket: bucket(), Key: storageKey }));
  },
};