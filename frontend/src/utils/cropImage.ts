/**
 * Recipe image cropping helpers.
 *
 * All recipe images are stored at a single canonical aspect ratio so they
 * render consistently everywhere (cards, thumbnails, detail page).
 */

/** Canonical aspect ratio (width / height) used for recipe images. */
export const RECIPE_IMAGE_ASPECT = 4 / 3;

/** Output dimensions for the stored cropped image. */
export const RECIPE_IMAGE_OUTPUT_WIDTH = 800;
export const RECIPE_IMAGE_OUTPUT_HEIGHT = 600;

export interface PixelCrop {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Load an image from a URL (blob: or data:) into an HTMLImageElement.
 */
function loadImageFromUrl(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not load image'));
    img.src = url;
  });
}

/**
 * Crop the source image to `pixelCrop` and scale to the canonical output
 * dimensions. Returns a JPEG data URL.
 */
export async function cropImageToDataUrl(
  sourceUrl: string,
  pixelCrop: PixelCrop,
  quality = 0.8,
): Promise<string> {
  const img = await loadImageFromUrl(sourceUrl);

  const canvas = document.createElement('canvas');
  canvas.width = RECIPE_IMAGE_OUTPUT_WIDTH;
  canvas.height = RECIPE_IMAGE_OUTPUT_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(
    img,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    RECIPE_IMAGE_OUTPUT_WIDTH,
    RECIPE_IMAGE_OUTPUT_HEIGHT,
  );

  return canvas.toDataURL('image/jpeg', quality);
}
