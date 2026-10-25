import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("collection highlights keep dot controls and support keyboard navigation", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.goto("/")
  const carousel = page.getByRole("region", { name: "Destaques da coleção", exact: true })
  const track = carousel.getByRole("group", { name: "Navegar pelos itens", exact: true })
  const dots = carousel.getByRole("button", { name: /^Ir para a página/ })

  await expect(dots).toHaveCount(3)
  await expect(dots.nth(0)).toHaveAttribute("aria-current", "true")
  await dots.nth(1).click()
  await expect(dots.nth(1)).toHaveAttribute("aria-current", "true")
  const image = carousel.getByRole("img", { name: "Sage Nomad com chapéu e moletom violeta", exact: true })
  await image.evaluate(async element => { if (element instanceof HTMLImageElement) await element.decode() })
  const [viewport, artwork] = await Promise.all([track.boundingBox(), image.boundingBox()])
  expect(viewport && artwork && artwork.x >= viewport.x - 1 && artwork.x + artwork.width <= viewport.x + viewport.width + 1).toBe(true)

  await track.focus()
  await page.keyboard.press("Home")
  await expect(dots.nth(0)).toHaveAttribute("aria-current", "true")
  await page.keyboard.press("End")
  await expect(dots.nth(2)).toHaveAttribute("aria-current", "true")
  await page.keyboard.press("ArrowLeft")
  await expect(dots.nth(1)).toHaveAttribute("aria-current", "true")
  await expect(carousel.getByRole("button", { name: /Anterior:|Próximo:/ })).toHaveCount(0)
})

test("related keeps five cards and three dots in the original desktop composition", async ({ page, isMobile }) => {
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.goto("/nfts/emerald-ape-042")
  await page.getByRole("heading", { name: "Emerald Ape #042", exact: true }).waitFor()
  const carousel = page.getByRole("region", { name: "Mais desta coleção", exact: true, includeHidden: true })
  if (isMobile) {
    await expect(carousel).toBeHidden()
    return
  }

  await carousel.scrollIntoViewIfNeeded()
  const track = carousel.getByRole("group", { name: "Navegar pelos itens", exact: true })
  const dots = carousel.getByRole("button", { name: /^Ir para a página/ })
  await expect(dots).toHaveCount(3)
  await expect(dots.nth(1)).toHaveAttribute("aria-current", "true")
  const initialPage = track.getByRole("group", { name: "2 de 3", exact: true })
  await expect(initialPage.getByRole("article")).toHaveCount(5)
  const [viewport, first, last] = await Promise.all([
    track.boundingBox(), initialPage.getByRole("article").first().boundingBox(), initialPage.getByRole("article").last().boundingBox(),
  ])
  expect(viewport && first && last && Math.abs(first.x - viewport.x) < 1 && Math.abs(last.x + last.width - viewport.x - viewport.width) < 1).toBe(true)
  expect(first?.width).toBeLessThan(240)
  await expect(initialPage.getByRole("link", { name: "Ver Cosmic Bloom #118", exact: true })).toBeVisible()
  await expect(initialPage.getByRole("link", { name: "Ver Golden Signal #160", exact: true })).toBeVisible()

  await expect(track.getByRole("link", { name: /^Ver / })).toHaveCount(5)
  const cardLinks = await track.getByRole("link", { name: /^Ver /, includeHidden: true }).evaluateAll(links => links.map(link => link.getAttribute("href")))
  expect(new Set(cardLinks).size).toBe(cardLinks.length)
  await dots.nth(2).click()
  await expect(dots.nth(2)).toHaveAttribute("aria-current", "true")
  await track.evaluate(element => { element.scrollTo({ left: 0, behavior: "instant" }) })
  await expect(dots.nth(0)).toHaveAttribute("aria-current", "true")
  await track.focus()
  await page.keyboard.press("ArrowRight")
  await expect(dots.nth(1)).toHaveAttribute("aria-current", "true")
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(await page.evaluate(() => innerWidth))
})

test("the cart recommendations keep their original composition and remain accessible", async ({ page, isMobile }) => {
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.goto("/cart")
  await page.getByRole("heading", { name: "Seu carrinho está vazio", exact: true }).waitFor()
  const carousel = page.getByRole("region", { name: "Colecionadores também viram", exact: true, includeHidden: true })
  if (isMobile) {
    await expect(carousel).toBeHidden()
  } else {
    await carousel.scrollIntoViewIfNeeded()
    await carousel.getByRole("button", { name: "Ir para a página 3: Colecionadores também viram", exact: true }).click()
  }
  const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "best-practice"]).analyze()
  expect(result.violations).toEqual([])
})
