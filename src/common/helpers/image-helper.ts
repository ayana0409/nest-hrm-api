import { createCanvas } from 'canvas';

export async function resizeImage(image: any, maxWidth: number): Promise<any> {
  const canvas = createCanvas(
    maxWidth,
    maxWidth * (image.height / image.width),
  );
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas;
}
