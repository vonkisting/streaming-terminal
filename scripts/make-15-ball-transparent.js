const fs = require("fs");
const path = require("path");
const { PNG } = require("pngjs");

const inputPath = path.join(__dirname, "..", "public", "pool-ball-15.png");
const outputPath = path.join(__dirname, "..", "public", "pool-ball-15-transparent.png");

const BLACK_THRESHOLD = 40;

const sourceBuffer = fs.readFileSync(inputPath);
const bitmap = PNG.sync.read(sourceBuffer);
const { data, width, height } = bitmap;

for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const idx = (width * y + x) << 2;
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    if (r <= BLACK_THRESHOLD && g <= BLACK_THRESHOLD && b <= BLACK_THRESHOLD) {
      data[idx + 3] = 0;
    }
  }
}

const png = new PNG({ width, height });
bitmap.data.copy(png.data);
png.pack()
  .pipe(fs.createWriteStream(outputPath))
  .on("finish", () => {
    fs.renameSync(outputPath, inputPath);
    console.log("Done: pool-ball-15.png has transparent background.");
  });
