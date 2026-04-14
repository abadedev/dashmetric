import 'server-only';
import fs from 'fs/promises';
import path from 'path';
import { LOGO_MIME_TO_EXT, type AllowedLogoMime } from '@/lib/workspace-logo-rules';

export type LogoVariant = 'dark' | 'light';

/** Reject anything that isn't a plain UUID to prevent path traversal. */
function assertValidWorkspaceId(id: string): void {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    throw new Error('Invalid workspaceId');
  }
}

function uploadDir(workspaceId: string): string {
  return path.join(process.cwd(), 'public', 'uploads', 'workspaces', workspaceId);
}

function logoFilename(mimeType: AllowedLogoMime, variant: LogoVariant): string {
  return `logo-${variant}.${LOGO_MIME_TO_EXT[mimeType]}`;
}

/**
 * Persist a theme-variant logo for a workspace, replacing any previous one of the same variant.
 * Returns the public URL path (e.g. `/uploads/workspaces/{id}/logo-dark.png`).
 */
export async function saveWorkspaceLogoVariant(
  workspaceId: string,
  buffer: Buffer,
  mimeType: AllowedLogoMime,
  variant: LogoVariant,
): Promise<string> {
  assertValidWorkspaceId(workspaceId);
  const dir = uploadDir(workspaceId);
  await fs.mkdir(dir, { recursive: true });

  await deleteWorkspaceLogoVariant(workspaceId, variant);

  const filename = logoFilename(mimeType, variant);
  const filePath = path.join(dir, filename);
  console.info('[workspace-logo] writing workspaceId=%s variant=%s mime=%s path=%s bytes=%d', workspaceId, variant, mimeType, filePath, buffer.length);
  await fs.writeFile(filePath, buffer);
  const publicUrl = `/uploads/workspaces/${workspaceId}/${filename}`;
  console.info('[workspace-logo] saved publicUrl=%s', publicUrl);
  return publicUrl;
}

/**
 * Delete all logo files for a specific variant (any supported extension).
 * Safe to call even when no logo exists.
 */
export async function deleteWorkspaceLogoVariant(workspaceId: string, variant: LogoVariant): Promise<void> {
  assertValidWorkspaceId(workspaceId);
  const dir = uploadDir(workspaceId);

  let entries: string[];
  try {
    entries = await fs.readdir(dir);
  } catch {
    return;
  }

  await Promise.all(
    entries
      .filter((f) => new RegExp(`^logo-${variant}\\.(png|jpg|jpeg|webp)$`).test(f))
      .map((f) => fs.unlink(path.join(dir, f)).catch(() => void 0)),
  );
}

/** Persist the default logo file for a workspace. */
export async function saveWorkspaceLogo(
  workspaceId: string,
  buffer: Buffer,
  mimeType: AllowedLogoMime,
): Promise<string> {
  assertValidWorkspaceId(workspaceId);
  const dir = uploadDir(workspaceId);
  await fs.mkdir(dir, { recursive: true });

  await deleteWorkspaceLogo(workspaceId);

  const ext = LOGO_MIME_TO_EXT[mimeType];
  const filename = `logo.${ext}`;
  const filePath = path.join(dir, filename);
  console.info('[workspace-logo] writing workspaceId=%s mime=%s ext=%s path=%s bytes=%d', workspaceId, mimeType, ext, filePath, buffer.length);
  await fs.writeFile(filePath, buffer);
  const publicUrl = `/uploads/workspaces/${workspaceId}/${filename}`;
  console.info('[workspace-logo] saved publicUrl=%s', publicUrl);
  return publicUrl;
}

/**
 * Delete all logo files for the workspace (any supported extension).
 * Safe to call even when no logo exists.
 */
export async function deleteWorkspaceLogo(workspaceId: string): Promise<void> {
  assertValidWorkspaceId(workspaceId);
  const dir = uploadDir(workspaceId);

  let entries: string[];
  try {
    entries = await fs.readdir(dir);
  } catch {
    return;
  }

  await Promise.all(
    entries
      .filter((f) => /^logo\.(png|jpg|jpeg|webp)$/.test(f))
      .map((f) => fs.unlink(path.join(dir, f)).catch(() => void 0)),
  );
}
