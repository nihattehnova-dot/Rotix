import { generateGeminiJsonTurn } from './ai/geminiClient.js';
import { parseGeminiJsonObject } from './ai/parseGeminiJson.js';
import sharp from 'sharp';

export type VisionBox = {
  index: number;
  x: number;
  y: number;
  w: number;
  h: number;
};

/**
 * Sayfadaki soru kutularını bul; seçili soruyu kırp.
 * Koordinatlar 0–1000 normalize.
 */
export async function detectQuestionBoxes(input: {
  imageBase64: string;
  mimeType: string;
}): Promise<{ boxes: VisionBox[]; tokensUsed: number }> {
  const { text, tokensUsed } = await generateGeminiJsonTurn({
    systemInstruction:
      'Ödev fotoğrafı. Her sorunun dikdörtgen kutusunu 0–1000 koordinatta ver. Çözüm yazma.',
    userMessage:
      '{"boxes":[{"index":0,"x":50,"y":40,"w":900,"h":280}]}',
    imageBase64: input.imageBase64,
    imageMimeType: input.mimeType,
    maxOutputTokens: 300,
    temperature: 0.05,
    preferLite: true,
  });
  const reply = parseGeminiJsonObject(text ?? '');
  const boxes: VisionBox[] = [];
  if (Array.isArray(reply?.boxes)) {
    for (const b of reply.boxes) {
      if (!b || typeof b !== 'object') continue;
      const o = b as Record<string, unknown>;
      boxes.push({
        index: Number(o.index ?? boxes.length),
        x: Number(o.x ?? 0),
        y: Number(o.y ?? 0),
        w: Number(o.w ?? 1000),
        h: Number(o.h ?? 400),
      });
    }
  }
  return { boxes, tokensUsed };
}

export async function cropQuestionRegion(input: {
  imageBase64: string;
  mimeType: string;
  box: VisionBox;
}): Promise<{ base64: string; mimeType: string }> {
  const raw = input.imageBase64.includes(',')
    ? input.imageBase64.split(',').pop()!
    : input.imageBase64;
  const buf = Buffer.from(raw, 'base64');
  const meta = await sharp(buf).metadata();
  const iw = meta.width ?? 1024;
  const ih = meta.height ?? 1024;
  const left = Math.max(0, Math.floor((input.box.x / 1000) * iw));
  const top = Math.max(0, Math.floor((input.box.y / 1000) * ih));
  const width = Math.min(
    iw - left,
    Math.max(32, Math.floor((input.box.w / 1000) * iw)),
  );
  const height = Math.min(
    ih - top,
    Math.max(32, Math.floor((input.box.h / 1000) * ih)),
  );
  const out = await sharp(buf)
    .extract({ left, top, width, height })
    .webp({ quality: 82 })
    .toBuffer();
  return { base64: out.toString('base64'), mimeType: 'image/webp' };
}

/** Seçili index yoksa ilk kutu; çok kutu + seçim yok → null (clarification) */
export async function cropSelectedQuestion(input: {
  imageBase64: string;
  mimeType: string;
  selectedIndex?: number;
}): Promise<{
  cropped?: { base64: string; mimeType: string };
  boxes: VisionBox[];
  needsClarification: boolean;
  tokensUsed: number;
}> {
  const { boxes, tokensUsed } = await detectQuestionBoxes(input);
  if (boxes.length > 1 && input.selectedIndex == null) {
    return { boxes, needsClarification: true, tokensUsed };
  }
  const idx = input.selectedIndex ?? 0;
  const box = boxes.find((b) => b.index === idx) ?? boxes[0];
  if (!box) {
    return { boxes, needsClarification: false, tokensUsed };
  }
  const cropped = await cropQuestionRegion({
    imageBase64: input.imageBase64,
    mimeType: input.mimeType,
    box,
  });
  return {
    cropped,
    boxes,
    needsClarification: false,
    tokensUsed,
  };
}
