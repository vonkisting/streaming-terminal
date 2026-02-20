const fs = require("fs");
const path = require("path");
const jpeg = require("jpeg-js");
const { PNG } = require("pngjs");

const inputPath = path.join(__dirname, "..", "public", "pool-ball-9.png");
const outputPath = path.join(__dirname, "..", "public", "pool-ball-9-transparent.png");

const BLACK_THRESHOLD = 40;

const inputBuffer = fs.readFileSync(inputPath);
const jpegData = jpeg.decode(inputBuffer, { useTArray: true });
const { data, width, height } = jpegData;
const bytesPerPixel = data.length / (width * height);

const png = new PNG({ width, height });
for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const srcIdx = (width * y + x) * bytesPerPixel;
    const r = data[srcIdx];
    const g = data[srcIdx + 1];
    const b = data[srcIdx + 2];
    const dstIdx = (width * y + x) << 2;
    png.data[dstIdx] = r;
    png.data[dstIdx + 1] = g;
    png.data[dstIdx + 2] = b;
    png.data[dstIdx + 3] =
      r <= BLACK_THRESHOLD && g <= BLACK_THRESHOLD && b <= BLACK_THRESHOLD ? 0 : 255;
  }
}

const out = fs.createWriteStream(outputPath);
out.on("finish", () => {
  fs.renameSync(outputPath, inputPath);
  console.log("Done: pool-ball-9.png now has transparent background.");
});
png.pack().pipe(out);
