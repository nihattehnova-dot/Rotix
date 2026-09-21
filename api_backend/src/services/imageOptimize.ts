/**
 * Fotoğrafı Vision'a göndermeden önce küçült / sıkıştır.
 * sharp yoksa base64 boyutuna göre geçiş (client zaten 1024 hedeflemeli).
 * JPEG max 1024 kenar — WebP native sharp ile.
 */

export type OptimizedImage = {
  base64: string;
  mimeType: string;
  width?: number;
  height?: number;
  bytesBefore: number;
  bytesAfter: number;
  optimized: boolean;
};

function stripDataUrl(b64: string): string {
  return b64.includes(',') ? b64.split(',').pop()! : b64;
}

/**
 * Boyut eşiği aşıldıysa ve sharp yüklüyse WebP/JPEG 1024'e indir.
 * Aksi halde orijinali döndür (client-side optimize varsayılır).
 */
export async function optimizeQuestionImage(input: {
  imageBase64: string;
  mimeType?: string;
  maxEdge?: number;
  quality?: number;
}): Promise<OptimizedImage> {
  const raw = stripDataUrl(input.imageBase64);
  const before = Buffer.from(raw, 'base64');
  const mime = input.mimeType ?? 'image/jpeg';
  const maxEdge = input.maxEdge ?? 1024;
  const quality = input.quality ?? 78;

  // Küçük görselleri olduğu gibi bırak
  if (before.length < 80_000) {
    return {
      base64: raw,
      mimeType: mime,
      bytesBefore: before.length,
      bytesAfter: before.length,
      optimized: false,
    };
  }

  try {
    // Dinamik import — sharp yoksa sessiz fallback
    const sharpMod = await import('sharp').catch(() => null);
    if (!sharpMod?.default) {
      return {
        base64: raw,
        mimeType: mime,
        bytesBefore: before.length,
        bytesAfter: before.length,
        optimized: false,
      };
    }
    const sharp = sharpMod.default;
    const pipeline = sharp(before).rotate().resize({
      width: maxEdge,
      height: maxEdge,
      fit: 'inside',
      withoutEnlargement: true,
    });

    // WebP tercih; başarısızsa JPEG
    let out: Buffer;
    let outMime: string;
    try {
      out = await pipeline.webp({ quality }).toBuffer();
      outMime = 'image/webp';
    } catch {
      out = await sharp(before)
        .rotate()
        .resize({
          width: maxEdge,
          height: maxEdge,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({ quality })
        .toBuffer();
      outMime = 'image/jpeg';
    }

    const meta = await sharp(out).metadata();
    return {
      base64: out.toString('base64'),
      mimeType: outMime,
      width: meta.width,
      height: meta.height,
      bytesBefore: before.length,
      bytesAfter: out.length,
      optimized: true,
    };
  } catch (err) {
    console.warn(
      '[imageOptimize] fallback raw:',
      err instanceof Error ? err.message : err,
    );
    return {
      base64: raw,
      mimeType: mime,
      bytesBefore: before.length,
      bytesAfter: before.length,
      optimized: false,
    };
  }
}
