import { expect, type Page, type TestInfo } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import sharp from "sharp";

async function stableScreenshot (page: Page) {
  let previous = await page.screenshot({ fullPage: true, animations: "disabled", caret: "hide" })

  for (let attempt = 0; attempt < 8; attempt++) {
    const current = await page.screenshot({ fullPage: true, animations: "disabled", caret: "hide" })
    if (current.equals(previous)) return current
    previous = current
  }

  throw new Error("The visual state did not stabilize.")
}

export async function compareArtworkRendering (page: Page, info: TestInfo) {
  await page.waitForFunction(() => (
    Array
      .from(document.images)
      .filter((image) => image.getClientRects().length > 0 && (image.src || image.srcset))
      .every((image) => image.complete && image.naturalWidth > 0)
  ))

  await page.evaluate(async () => {
    await document.fonts.ready

    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => { resolve() })
      })
    })
  })

  const candidate = await stableScreenshot(page)

  const images = await page.evaluate(() => Array
    .from(document.images)
    .filter((image) => ["8f387", "83794", "9add2", "b7cfc"]
      .some((name) => (image.currentSrc || image.src)
        .includes(name)))
    .map((image) => {
      const rect = image.getBoundingClientRect()

      return {
        src: image.getAttribute("src"),
        srcSet: image.getAttribute("srcset"),
        sizes: image.getAttribute("sizes"),
        currentSrc: image.currentSrc,
        x: rect.x + scrollX,
        y: rect.y + scrollY,
        width: rect.width,
        height: rect.height,
      }
    }))

  const originalGeometry = images.map(({ x, y, width, height }) => ({ x, y, width, height }))

  await page.evaluate(async () => {
    await Promise.all(
      Array
        .from(document.images)
        .filter((image) => ["8f387", "83794", "9add2", "b7cfc"].some((name) => (image.currentSrc || image.src).includes(name)))
        .map(async (image) => {
          const name = ["8f387", "83794", "9add2", "b7cfc"]
            .find((name) => (image.currentSrc || image.src).includes(name))

          if (!name) throw new Error("Artwork source is missing.")

          image.removeAttribute("srcset")
          image.src = "/assets/" + name + ".webp"

          if (image.getClientRects().length > 0) await image.decode()
        })
    )
  })

  const geometry = await page.evaluate(() => Array.from(document.images)
    .filter((image) => ["8f387", "83794", "9add2", "b7cfc"].some((name) => (image.currentSrc || image.src).includes(name)))
    .map((image) => {
      const rect = image.getBoundingClientRect()

      return {
        x: rect.x + scrollX,
        y: rect.y + scrollY,
        width: rect.width,
        height: rect.height
      }
    }))

  expect(geometry).toEqual(originalGeometry)

  const reference = await stableScreenshot(page)
  const before = await sharp(reference).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const after = await sharp(candidate).ensureAlpha().raw().toBuffer({ resolveWithObject: true })

  expect(after.info).toEqual(before.info)

  const pixelRatio = before.info.width / await page.evaluate(() => window.innerWidth)

  let outsideChangedPixels = 0
  let artworkPixels = 0
  let changedArtworkPixels = 0
  let absoluteError = 0
  let squaredError = 0
  let maximumChannelError = 0

  const diff = Buffer.alloc(before.data.length)

  for (let y = 0; y < before.info.height; y++) {
    for (let x = 0; x < before.info.width; x++) {
      const offset = (y * before.info.width + x) * 4

      const inside = images.some((rect) => x >= Math.floor(rect.x * pixelRatio) - 1
        && x < Math.ceil((rect.x + rect.width) * pixelRatio) + 1
        && y >= Math.floor(rect.y * pixelRatio) - 1
        && y < Math.ceil((rect.y + rect.height) * pixelRatio) + 1
      )

      let changed = false

      for (let channel = 0; channel < 3; channel++) {
        const difference = Math.abs((before.data[offset + channel] ?? 0) - (after.data[offset + channel] ?? 0))
        changed ||= difference > 0

        if (inside) {
          absoluteError += difference
          squaredError += difference * difference
          maximumChannelError = Math.max(maximumChannelError, difference)
        }

        diff[offset + channel] = Math.min(255, difference * 8)
      }

      diff[offset + 3] = 255
      if (inside) { artworkPixels++; if (changed) changedArtworkPixels++ }
      else if (changed) outsideChangedPixels++
    }
  }

  const metrics = {
    screen: info.title,
    pixelRatio,
    images,
    geometryUnchanged: true,
    outsideChangedPixels,
    artworkPixels,
    changedArtworkPixels,
    meanAbsoluteChannelError: artworkPixels ? absoluteError / (artworkPixels * 3) : 0,
    rootMeanSquaredChannelError: artworkPixels ? Math.sqrt(squaredError / (artworkPixels * 3)) : 0,
    maximumChannelError,
    psnr: squaredError ? 10 * Math.log10(255 * 255 / (squaredError / (artworkPixels * 3))) : null,
  }

  for (const [name, bytes] of [["responsive.png", candidate], ["original.png", reference]] as const) {
    const path = info.outputPath(name)
    await writeFile(path, bytes)
    await info.attach(name, { path, contentType: "image/png" })
  }

  await sharp(diff, { raw: before.info }).png().toFile(info.outputPath("difference-8x.png"))
  await writeFile(info.outputPath("artwork-comparison.json"), JSON.stringify(metrics, null, 2))

  await info.attach("artwork-comparison", {
    path: info.outputPath("artwork-comparison.json"),
    contentType: "application/json"
  })

  expect(outsideChangedPixels).toBe(0)

  return { candidate, reference, metrics }
}
