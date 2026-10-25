import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import sharp from "sharp";

const artworkNames = ["8f387", "83794", "9add2", "b7cfc"]
const widths = [160, 320, 480, 768, 960]
const report = []
const responsive = []

const manifest = {}

const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");

await mkdir("public/assets/artwork", { recursive: true });
await mkdir("src/shared/artwork", { recursive: true });

for (const name of artworkNames) {
  const source = "public/assets/" + name + ".png"
  const destination = "public/assets/" + name + ".webp"

  const original = await readFile(source);

  try {
    await readFile(destination);
  } catch (error) {
    if (error.code !== "ENOENT") throw error
    await sharp(original).webp({ lossless: true, effort: 6 }).toFile(destination);
  }

  const encoded = await readFile(destination);
  const before = await sharp(original).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const after = await sharp(encoded).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

  if (!before.data.equals(after.data)) throw new Error("Pixel mismatch: " + name);

  report.push({
    source, destination, width: before.info.width, height: before.info.height,
    sourceBytes: original.length, encodedBytes: encoded.length, identicalDecodedPixels: true,
    sourceSha256: hash(original), encodedSha256: hash(encoded),
  });

  const candidates = [];

  for (const width of widths) {
    if (width >= before.info.width) continue

    const path = "public/assets/artwork/" + name + "-" + width + ".webp"

    const resized = await sharp(original)
      .resize({ width, kernel: "lanczos3", withoutEnlargement: true })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const bytes = await sharp(resized.data, { raw: resized.info })
      .webp({ lossless: true, effort: 6 })
      .toBuffer();

    const decoded = await sharp(bytes).ensureAlpha().raw().toBuffer();
    if (!decoded.equals(resized.data)) throw new Error("Responsive encoding mismatch: " + path);

    await writeFile(path, bytes);

    candidates.push({ src: path.replace("public", ""), width });

    responsive.push({
      source,
      destination: path,
      width,
      height: resized.info.height,
      encodedBytes: bytes.length,
      encodedSha256: hash(bytes),
      identicalResizedPixels: true,
    });
  }

  candidates.push({ src: destination.replace("public", ""), width: before.info.width });
  manifest[destination.replace("public", "")] = candidates
}

await writeFile("src/shared/artwork/artwork-manifest.json", JSON.stringify(manifest, null, 2) + "\n");

await mkdir(".cache", { recursive: true })

await writeFile(".cache/artwork-optimization.json", JSON.stringify({
  encoding: "WebP lossless",
  sharp: sharp.versions.sharp,
  artwork: report,

  responsive: {
    kernel: "lanczos3",
    originalPixelsPreserved: true,
    variants: responsive
  },
}, null, 2) + "\n");

console.log(JSON.stringify({
  originals: report.length,
  variants: responsive.length,
  variantBytes: responsive.reduce((total, image) => total + image.encodedBytes, 0)
}));
