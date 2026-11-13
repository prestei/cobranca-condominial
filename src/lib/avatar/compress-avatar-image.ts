import {
  AVATAR_CLIENT_MAX_FILE_BYTES,
  AVATAR_MAX_DIMENSION_PX,
  AVATAR_TARGET_MAX_BYTES,
} from "@/lib/avatar/constants";

export class CompressAvatarError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CompressAvatarError";
  }
}

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new CompressAvatarError("Não foi possível ler a imagem."));
    };
    img.src = url;
  });
}

function scaledDimensions(
  width: number,
  height: number,
  maxSide: number,
): { width: number; height: number } {
  if (width <= maxSide && height <= maxSide) {
    return { width, height };
  }
  const ratio = Math.min(maxSide / width, maxSide / height);
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
  };
}

function canvasToDataUrl(canvas: HTMLCanvasElement, type: string, quality: number): string | null {
  try {
    return canvas.toDataURL(type, quality);
  } catch {
    return null;
  }
}

function byteLengthUtf8(value: string): number {
  return new TextEncoder().encode(value).length;
}

/**
 * Redimensiona e compacta a foto para um data URL leve (WebP ou JPEG).
 */
export async function compressAvatarImage(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new CompressAvatarError("Selecione um arquivo de imagem.");
  }
  if (file.size > AVATAR_CLIENT_MAX_FILE_BYTES) {
    throw new CompressAvatarError("A imagem é grande demais. Use um arquivo de até 8 MB.");
  }

  const img = await loadImageFromFile(file);
  const { width, height } = scaledDimensions(img.naturalWidth, img.naturalHeight, AVATAR_MAX_DIMENSION_PX);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new CompressAvatarError("Seu navegador não suporta processamento de imagem.");
  }
  ctx.drawImage(img, 0, 0, width, height);

  const mimeCandidates: Array<{ type: string; label: string }> = [
    { type: "image/webp", label: "WebP" },
    { type: "image/jpeg", label: "JPEG" },
  ];

  let best: string | null = null;
  let bestSize = Number.POSITIVE_INFINITY;

  for (const { type } of mimeCandidates) {
    for (let quality = 0.9; quality >= 0.45; quality -= 0.08) {
      const dataUrl = canvasToDataUrl(canvas, type, quality);
      if (!dataUrl) continue;
      const size = byteLengthUtf8(dataUrl);
      if (size <= AVATAR_TARGET_MAX_BYTES) {
        return dataUrl;
      }
      if (size < bestSize) {
        best = dataUrl;
        bestSize = size;
      }
    }
  }

  if (best && bestSize <= AVATAR_TARGET_MAX_BYTES * 1.35) {
    return best;
  }

  throw new CompressAvatarError(
    "Não foi possível deixar a foto leve o suficiente. Tente outra imagem ou um recorte menor.",
  );
}
