import { expect, test } from "@playwright/test";

import { compareArtworkRendering } from "../support/artwork-rendering";

test("a mobile retina screen loads smaller density candidates without downloading original artwork", async ({ browser }) => {
  const context = await browser.newContext({
    viewport: {
      width: 390,
      height: 844
    },

    deviceScaleFactor: 2,
    isMobile: true
  })

  const page = await context.newPage()
  const requested: string[] = []

  page.on("request", (request) => { requested.push(new URL(request.url()).pathname) })

  try {
    await page.goto("/")

    const hero = page.getByRole("img", {
      name: "Ape com óculos verdes e jaqueta esmeralda",
      exact: true
    })

    await expect
      .poll(() => hero.evaluate((image) => image instanceof HTMLImageElement ? new URL(image.currentSrc).pathname : ""))
      .toBe("/assets/artwork/8f387-320.webp")

    await hero.evaluate(async (image) => { if (image instanceof HTMLImageElement) await image.decode() })
    await page.getByRole("link", { name: "Ver Emerald Ape #042", exact: true }).waitFor()

    expect(requested.filter((path) => /^\/assets\/(8f387|83794|9add2|b7cfc)\.webp$/.test(path))).toEqual([])

    await page.goto("/nfts/emerald-ape-042")
    const artwork = page.getByRole("img", { name: "Emerald Ape #042", exact: true })

    await expect
      .poll(() => artwork.evaluate((image) => image instanceof HTMLImageElement ? new URL(image.currentSrc).pathname : ""))
      .toBe("/assets/artwork/8f387-768.webp")

    await artwork.evaluate(async (image) => { if (image instanceof HTMLImageElement) await image.decode() })
    expect(requested).not.toContain("/assets/8f387.webp")
  } finally {
    await context.close()
  }
})

test("zoom loads the original of the selected NFT only when it is opened", async ({ page, isMobile }) => {
  test.skip(isMobile, "The Figma zoom control is desktop-only.")
  const requested: string[] = []
  page.on("request", (request) => { requested.push(new URL(request.url()).pathname) })

  await page.goto("/nfts/sage-nomad-009")
  await page.getByRole("heading", { name: "Sage Nomad #009", exact: true }).waitFor()

  expect(requested).not.toContain("/assets/83794.webp")

  await page.getByRole("button", { name: "Ampliar imagem do NFT", exact: true }).click()
  const original = page.getByRole("dialog").getByRole("img", { name: "Sage Nomad #009", exact: true })
  await expect(original).toBeVisible()
  await original.evaluate(async (image) => { if (image instanceof HTMLImageElement) await image.decode() })

  expect(requested).toContain("/assets/83794.webp")
  expect(requested).not.toContain("/assets/8f387.webp")
})

test("retina artwork keeps its geometry and visual detail against the original", async ({ browser }, info) => {
  const context = await browser.newContext({
    viewport: {
      width: 390,
      height: 844
    },

    deviceScaleFactor: 2,
    isMobile: true
  })

  const page = await context.newPage()

  try {
    await page.emulateMedia({ reducedMotion: "reduce" })
    await page.goto("/nfts/sage-nomad-009")

    const image = page.getByRole("img", { name: "Sage Nomad #009", exact: true })

    await image.evaluate(async (element) => { if (element instanceof HTMLImageElement) await element.decode() })
    const { metrics } = await compareArtworkRendering(page, info)

    expect(metrics.psnr).not.toBeNull()
    expect(metrics.psnr).toBeGreaterThan(35)
  } finally {
    await context.close()
  }
})
