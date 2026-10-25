import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { cp, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, sep } from "node:path";
import { test } from "node:test";
import { URL, fileURLToPath } from "node:url";
import sharp from "sharp";

test("responsive artwork preserves every original and supplies lossless, uncropped density candidates", async () => {
  const directory = await mkdtemp(join(tmpdir(), "kurio-artwork-"));
  const names = ["8f387", "83794", "9add2", "b7cfc"]
  const hashes = new Map();

  const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");

  try {
    await cp(new URL("../public/assets/", import.meta.url), join(directory, "public/assets"), {
      recursive: true, filter: (source) => !source.includes("artwork"),
    });

    for (const name of names) {
      for (const extension of ["png", "webp"]) {
        const path = join(directory, "public/assets", name + "." + extension);
        hashes.set(path, hash(await readFile(path)));
      }
    }

    execFileSync(process.execPath, [fileURLToPath(new URL("./optimize-artwork.mjs", import.meta.url))], {
      cwd: directory, stdio: "pipe",
    });

    assert.ok(existsSync(join(directory, ".cache/artwork-optimization.json")), "Optimization report must stay in the local cache");
    assert.equal(existsSync(join(directory, "docs")), false, "Optimizing artwork must not recreate documentation");

    assert.ok(existsSync(join(
      directory, "src/shared/artwork/artwork-manifest.json")
    ), "Responsive candidates must have a generated manifest");

    const manifest = JSON.parse(await readFile(join(directory, "src/shared/artwork/artwork-manifest.json"), "utf8"));

    for (const name of names) {
      assert
        .deepEqual(manifest["/assets/" + name + ".webp"].map((entry) => entry.width), [160, 320, 480, 768, 960, 1254]);

      for (const width of [160, 320, 480, 768, 960]) {
        const path = join(directory, "public/assets/artwork", name + "-" + width + ".webp");
        const bytes = await readFile(path);
        const image = sharp(bytes);
        const metadata = await image.metadata();

        assert.equal(metadata.width, width);
        assert.equal(metadata.height, width);
        assert.equal(metadata.format, "webp");

        const expected = await sharp(join(directory, "public/assets", name + ".png"))
          .resize(width, width, { kernel: "lanczos3" }).ensureAlpha().raw().toBuffer();

        assert.deepEqual(await image.ensureAlpha().raw().toBuffer(), expected);
        assert.ok(bytes.length < 0.7 * (await readFile(join(directory, "public/assets", name + ".webp"))).length);
      }
    }

    for (const [path, before] of hashes) assert.equal(hash(await readFile(path)), before);
  } finally {
    assert.ok(resolve(directory).startsWith(resolve(tmpdir()) + sep + "kurio-artwork-"));
    await rm(directory, { recursive: true, force: true });
  }
});
