import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const src = path.resolve("public/brand/android-icon-source.png");
const outDir = path.resolve("public/icons");

if (!fs.existsSync(src)) {
  console.error("❌ No existe:", src);
  process.exit(1);
}

fs.mkdirSync(outDir, { recursive: true });

// Para Android splash: usa icon-192 y icon-512 del manifest
const sizes = [192, 512];

for (const size of sizes) {
  const out = path.join(outDir, `icon-${size}.png`);
  await sharp(src)
    .resize(size, size, { fit: "cover", position: "centre" })
    .png({ compressionLevel: 9 })
    .toFile(out);
  console.log("✅ Generado:", out);
}

// Maskable (por si Android decide usarlo)
for (const size of [192, 512]) {
  const out = path.join(outDir, `icon-maskable-${size}.png`);
  await sharp(src)
    .resize(size, size, { fit: "cover", position: "centre" })
    .png({ compressionLevel: 9 })
    .toFile(out);
  console.log("✅ Generado maskable:", out);
}

console.log("🎉 Listo: iconos Android desde tu splash grande.");
