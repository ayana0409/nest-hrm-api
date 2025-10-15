import { createCanvas, loadImage } from 'canvas';

export async function resizeImage(image: any, maxWidth: number): Promise<any> {
  const canvas = createCanvas(
    maxWidth,
    maxWidth * (image.height / image.width),
  );
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas;
}

export async function resizeImageToRatio(
  imageSrc: string,
  targetWidth: number,
): Promise<string> {
  const image = await loadImage(imageSrc);

  const targetHeight = Math.floor((targetWidth * 4) / 3); // 2:3 ratio

  const originalRatio = image.width / image.height;
  const targetRatio = 2 / 3;

  let cropWidth = image.width;
  let cropHeight = image.height;
  let offsetX = 0;
  let offsetY = 0;

  if (originalRatio > targetRatio) {
    cropWidth = image.height * targetRatio;
    offsetX = (image.width - cropWidth) / 2;
  } else {
    cropHeight = image.width / targetRatio;
    offsetY = (image.height - cropHeight) / 2;
  }

  const canvas = createCanvas(targetWidth, targetHeight);
  const ctx = canvas.getContext('2d');

  ctx.drawImage(
    image,
    offsetX,
    offsetY,
    cropWidth,
    cropHeight,
    0,
    0,
    targetWidth,
    targetHeight,
  );

  return canvas.toDataURL('image/jpeg');
}
