// Shrinks photos in the browser before upload. A phone photo is 3-8 MB; after
// this it is usually 150-300 KB, which keeps the class well inside the
// Supabase Free plan's 1 GB storage and 5 GB monthly bandwidth.

const MAX_SIDE = 1600;
const MAX_BYTES = 950 * 1024; // the bucket refuses files over 1 MB

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
}

export async function compressImage(file: File): Promise<{ blob: Blob; ext: 'webp' | 'jpg' }> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  for (const quality of [0.82, 0.7, 0.55, 0.4]) {
    // Some browsers cannot encode WebP and silently return PNG; use JPEG there.
    let blob = await canvasToBlob(canvas, 'image/webp', quality);
    let ext: 'webp' | 'jpg' = 'webp';
    if (!blob || blob.type !== 'image/webp') {
      blob = await canvasToBlob(canvas, 'image/jpeg', quality);
      ext = 'jpg';
    }
    if (blob && blob.size <= MAX_BYTES) return { blob, ext };
  }
  throw new Error('This image is too large even after compression. Try a smaller photo.');
}
