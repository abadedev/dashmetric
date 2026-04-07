export const LOGO_MAX_BYTES = 2 * 1024 * 1024; // 2 MB

export const LOGO_ALLOWED_MIME = ['image/png', 'image/jpeg', 'image/webp'] as const;
export type AllowedLogoMime = (typeof LOGO_ALLOWED_MIME)[number];

export const LOGO_MIME_TO_EXT: Record<AllowedLogoMime, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};

export const LOGO_MIN_WIDTH = 120;
export const LOGO_MIN_HEIGHT = 40;
export const LOGO_MIN_RATIO = 2; // width / height >= 2
export const LOGO_MAX_RATIO = 6; // width / height <= 6

/**
 * Detect the real MIME type by inspecting magic bytes.
 * Returns null if the buffer does not match any supported format.
 */
export function detectMimeType(buf: Buffer): AllowedLogoMime | null {
  if (buf.length < 12) return null;

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 &&
    buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a
  ) return 'image/png';

  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';

  // WebP: RIFF????WEBP
  if (
    buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
    buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
  ) return 'image/webp';

  return null;
}

/**
 * Extract width × height from a buffer whose MIME type is already confirmed.
 * Returns null when dimensions cannot be read (e.g. truncated file).
 */
export function getImageDimensions(
  buf: Buffer,
  mimeType: AllowedLogoMime,
): { width: number; height: number } | null {
  try {
    if (mimeType === 'image/png') {
      if (buf.length < 24) return null;
      return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
    }

    if (mimeType === 'image/jpeg') {
      let offset = 2; // skip SOI marker
      while (offset + 4 < buf.length) {
        if (buf[offset] !== 0xff) return null;
        const marker = buf[offset + 1];
        if (marker >= 0xc0 && marker <= 0xc3) {
          // SOF0, SOF1, SOF2, SOF3 all encode height then width
          return {
            height: buf.readUInt16BE(offset + 5),
            width: buf.readUInt16BE(offset + 7),
          };
        }
        offset += 2 + buf.readUInt16BE(offset + 2);
      }
      return null;
    }

    if (mimeType === 'image/webp') {
      if (buf.length < 30) return null;
      const format = buf.toString('ascii', 12, 16);
      if (format === 'VP8 ') {
        return {
          width: (buf.readUInt16LE(26) & 0x3fff) + 1,
          height: (buf.readUInt16LE(28) & 0x3fff) + 1,
        };
      }
      if (format === 'VP8L') {
        const bits = buf.readUInt32LE(21);
        return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
      }
      if (format === 'VP8X') {
        return {
          width: (buf[24] | (buf[25] << 8) | (buf[26] << 16)) + 1,
          height: (buf[27] | (buf[28] << 8) | (buf[29] << 16)) + 1,
        };
      }
      return null;
    }
  } catch {
    return null;
  }
  return null;
}

export type LogoValidationError =
  | 'FILE_TOO_LARGE'
  | 'INVALID_TYPE'
  | 'INVALID_DIMENSIONS'
  | 'INVALID_RATIO';

/**
 * Full server-side validation pipeline.
 * Returns `{ mimeType }` on success or `{ error, message }` on failure.
 */
export function validateLogo(
  buf: Buffer,
): { mimeType: AllowedLogoMime } | { error: LogoValidationError; message: string } {
  if (buf.length > LOGO_MAX_BYTES) {
    return { error: 'FILE_TOO_LARGE', message: 'Arquivo muito grande. Máximo: 2 MB.' };
  }

  const mimeType = detectMimeType(buf);
  if (!mimeType) {
    return { error: 'INVALID_TYPE', message: 'Formato inválido. Use PNG, JPEG ou WebP.' };
  }

  const dims = getImageDimensions(buf, mimeType);
  if (!dims) {
    return { error: 'INVALID_DIMENSIONS', message: 'Não foi possível ler as dimensões da imagem.' };
  }

  if (dims.width < LOGO_MIN_WIDTH || dims.height < LOGO_MIN_HEIGHT) {
    return {
      error: 'INVALID_DIMENSIONS',
      message: `Imagem muito pequena. Mínimo: ${LOGO_MIN_WIDTH}×${LOGO_MIN_HEIGHT} px.`,
    };
  }

  const ratio = dims.width / dims.height;
  if (ratio < LOGO_MIN_RATIO || ratio > LOGO_MAX_RATIO) {
    return {
      error: 'INVALID_RATIO',
      message: 'Proporção inválida. Aceito: entre 2:1 e 6:1 (largura:altura).',
    };
  }

  return { mimeType };
}
