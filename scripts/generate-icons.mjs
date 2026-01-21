import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const src = path.resolve("public/brand/icon-source.png");
const outDir = path.resolve("public/icons");

if (!fs.existsSync(src)) {
  console.error("❌ No existe:", src);
  console.error("👉 Poné tu imagen en: public/brand/icon-source.png");
  process.exit(1);
}

fs.mkdirSync(outDir, { recursive: true });

// Tamaños estándar
const sizes = [32, 192, 512];

// Iconos normales (cuadrados)
for (const size of sizes) {
  const out =
    size === 32
      ? path.join(outDir, "favicon-32.png")
      : path.join(outDir, `icon-${size}.png`);

  await sharp(src)
    .resize(size, size, { fit: "cover", position: "centre" })
    .png({ compressionLevel: 9 })
    .toFile(out);

  console.log("✅ Generado:", out);
}

// Maskable (Android) con margen seguro
for (const size of [192, 512]) {
  const out = path.join(outDir, `icon-maskable-${size}.png`);

  await sharp(src)
    .resize(Math.round(size * 0.8), Math.round(size * 0.8), {
      fit: "cover",
      position: "centre",
    })
    .extend({
      top: Math.round(size * 0.1),
      bottom: Math.round(size * 0.1),
      left: Math.round(size * 0.1),
      right: Math.round(size * 0.1),
      background: { r: 15, g: 75, b: 140, alpha: 1 }, // #0f4b8c
    })
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toFile(out);

  console.log("✅ Generado maskable:", out);
}

console.log("🎉 Listo. Revisá /public/icons");
