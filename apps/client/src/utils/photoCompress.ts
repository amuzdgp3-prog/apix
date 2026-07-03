// =============================
// Photo compression using Canvas
// =============================

const MAX_WIDTH = 800;
const MAX_HEIGHT = 800;
const QUALITY = 0.7;

export function compressPhoto(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const { width, height } = calcSize(img.width, img.height);
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error("Canvas toBlob failed"));
          },
          "image/jpeg",
          QUALITY,
        );
      };
      img.onerror = () => reject(new Error("Image load failed"));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error("FileReader failed"));
    reader.readAsDataURL(file);
  });
}

function calcSize(
  w: number,
  h: number,
): { width: number; height: number } {
  if (w <= MAX_WIDTH && h <= MAX_HEIGHT) return { width: w, height: h };
  const ratio = Math.min(MAX_WIDTH / w, MAX_HEIGHT / h);
  return { width: Math.round(w * ratio), height: Math.round(h * ratio) };
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Not a string"));
    };
    reader.onerror = () => reject(new Error("FileReader failed"));
    reader.readAsDataURL(blob);
  });
}