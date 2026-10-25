import { expect, test } from "@playwright/test";

import { simulationRequest } from "../support/api";

test("loading an NFT keeps cumulative layout shift below 0.1", async ({ page }) => {
  await page.addInitScript(() => {
    let score = 0

    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if ("hadRecentInput" in entry && entry.hadRecentInput === false && "value" in entry && typeof entry.value === "number") {
          score += entry.value
        }
      }

      document.documentElement.dataset.layoutShiftScore = score.toString()
    })

    observer.observe({ type: "layout-shift", buffered: true })
  })

  await page.goto("/nfts/emerald-ape-042")
  await page.getByRole("heading", { name: "Emerald Ape #042", exact: true }).waitFor()
  await page.getByRole("link", { name: "Ver Cosmic Bloom #118", exact: true, includeHidden: true }).waitFor({ state: "attached" })

  await page.evaluate(async () => {
    await document.fonts.ready

    await Promise.all(
      [...document.images]
        .filter((image) => image.getClientRects().length > 0)
        .map((image) => image.decode().catch(() => undefined))
    )

    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => { requestAnimationFrame(() => { resolve() }) })
    })
  })

  const score = Number(await page.locator("html").getAttribute("data-layout-shift-score") ?? "0")
  expect(score).toBeLessThan(0.1)
})

test("the main content keeps its top edge when the detail skeleton is replaced", async ({ page }) => {
  await page.goto("/simulation")
  await page.getByRole("heading", { name: "Cenários da demonstração", exact: true }).waitFor()
  await simulationRequest(page, "/simulation/scenario", "POST", { scenario: "slow" })

  await page.goto("/nfts/emerald-ape-042")
  await page.getByLabel("Carregando NFT", { exact: true }).waitFor()
  const before = await page.locator("main").boundingBox()
  await page.getByRole("heading", { name: "Emerald Ape #042", exact: true }).waitFor()
  const after = await page.locator("main").boundingBox()

  expect(before).not.toBeNull()
  expect(after?.y).toBe(before?.y)
})
