const fs = require("fs");
const path = require("path");
const { PNG } = require("pngjs");
const sharp = require("sharp");

const publicDir = path.join(__dirname, "..", "public");
const sourcePath = path.join(publicDir, "new9ballimage.png");
const refPath = path.join(publicDir, "pool-ball-1.png");
const tempPath = path.join(publicDir, "new9ball-cropped.png");

// White background: R,G,B all >= this → transparent
const WHITE_THRESHOLD = 248;
// Checkerboard/grey background: neutral color (R≈G≈B) in this range → transparent
const GREY_TOLERANCE = 25;   // max difference between R,G,B to count as grey
const GREY_MIN = 90;         // grey average (R+G+B)/3 above this
const GREY_MAX = 255;        // grey average below this

function isBackground(r, g, b, a) {
  if (a === 0) return true;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const avg = (r + g + b) / 3;
  if (r >= WHITE_THRESHOLD && g >= WHITE_THRESHOLD && b >= WHITE_THRESHOLD) return true;
  if (max - min <= GREY_TOLERANCE && avg >= GREY_MIN && avg <= GREY_MAX) return true;
  return false;
}

async function main() {
  // 1. Read new9ballimage.png with pngjs
  const sourceBuffer = fs.readFileSync(sourcePath);
  const png = PNG.sync.read(sourceBuffer);

  const { data, width, height } = png;
  const hasAlpha = data.length === width * height * 4;

  // 2. Make white and checkerboard (grey) background transparent
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (width * y + x) << 2;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const a = hasAlpha ? data[idx + 3] : 255;
      if (isBackground(r, g, b, a)) {
        data[idx + 3] = 0;
      } else if (!hasAlpha) {
        data[idx + 3] = 255;
      }
    }
  }

  // 3. Find bounding box of non-transparent pixels
  let minX = width, minY = height, maxX = 0, maxY = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (width * y + x) << 2;
      if (data[idx + 3] > 0) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  const cropWidth = maxX - minX + 1;
  const cropHeight = maxY - minY + 1;
  if (cropWidth <= 0 || cropHeight <= 0) {
    console.error("No visible content found");
    process.exit(1);
  }

  // 4. Crop to bounding box (with 1px padding to avoid cutting the edge)
  const pad = 1;
  const left = Math.max(0, minX - pad);
  const top = Math.max(0, minY - pad);
  const w = Math.min(width - left, cropWidth + 2 * pad);
  const h = Math.min(height - top, cropHeight + 2 * pad);

  const cropped = new PNG({ width: w, height: h });
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const srcIdx = (width * (top + y) + (left + x)) << 2;
      const dstIdx = (w * y + x) << 2;
      cropped.data[dstIdx] = png.data[srcIdx];
      cropped.data[dstIdx + 1] = png.data[srcIdx + 1];
      cropped.data[dstIdx + 2] = png.data[srcIdx + 2];
      cropped.data[dstIdx + 3] = png.data[srcIdx + 3];
    }
  }

  await new Promise((resolve, reject) => {
    cropped.pack().pipe(fs.createWriteStream(tempPath)).on("finish", resolve).on("error", reject);
  });

  // 5. Get reference dimensions from pool-ball-1.png
  const refMeta = await sharp(refPath).metadata();
  const targetWidth = refMeta.width || 256;
  const targetHeight = refMeta.height || 256;

  // 6. Resize cropped 9 ball to match 1 ball image size
  await sharp(tempPath)
    .resize(targetWidth, targetHeight, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(sourcePath);

  fs.unlinkSync(tempPath);
  console.log(`Done: new9ballimage.png has transparent background and is resized to ${targetWidth}x${targetHeight} to match 1 ball.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
