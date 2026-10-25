import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("every catalog item exposes its favorite action on touch screens", async ({ page, isMobile }) => {
  test.skip(!isMobile, "Touch actions must not depend on hover.")
  await page.goto("/")
  await page.getByRole("link", { name: "Ver Emerald Ape #042", exact: true }).waitFor()

  const favorites = page.locator("#catalogo").getByRole("link", { name: /^Favoritar / })
  await expect(favorites).toHaveCount(9)

  for (const favorite of await favorites.all()) {
    await expect(favorite).toBeVisible()
    const box = await favorite.boundingBox()
    expect(box?.width).toBeGreaterThanOrEqual(44)
    expect(box?.height).toBeGreaterThanOrEqual(44)
  }
})

test("mobile sorting is available and survives a reload", async ({ page, isMobile }) => {
  test.skip(!isMobile, "Desktop sorting already has coverage.")
  await page.goto("/")
  const sort = page.getByRole("combobox", { name: "Ordenar NFTs", exact: true })
  await expect(sort).toBeVisible()
  await sort.click()
  await page.getByRole("option", { name: "Menor preço", exact: true }).click()
  await expect(page).toHaveURL(/sort=price-asc/)
  await page.reload()
  await expect(sort).toContainText("Menor preço")

  await sort.click()
  await page.getByRole("option", { name: "Mais populares", exact: true }).click()
  await sort.click()
  await page.getByRole("option", { name: "Listados recentemente", exact: true }).click()
  await page.goBack()
  await expect(sort).toContainText("Mais populares")
  await expect(page.getByRole("button", { name: "Em alta", exact: true })).toHaveAttribute("aria-pressed", "true")
})

test("mobile navigation provides visible labels and comfortable touch targets", async ({ page, isMobile }) => {
  test.skip(!isMobile, "The bottom navigation is mobile-only.")
  await page.goto("/")
  const navigation = page.getByRole("navigation", { name: "Navegação principal", exact: true })
  await expect(navigation.getByText("Favoritos", { exact: true })).toBeVisible()
  await expect(navigation.getByText("Mercado", { exact: true })).toBeVisible()

  for (const link of await navigation.getByRole("link").all()) {
    const box = await link.boundingBox()
    expect(box?.width).toBeGreaterThanOrEqual(44)
    expect(box?.height).toBeGreaterThanOrEqual(44)
  }
})

test("cart items can be removed directly by touch", async ({ page, isMobile }) => {
  test.skip(!isMobile, "Desktop removal is already visible.")
  await page.goto("/nfts/emerald-ape-042")
  await page.getByRole("button", { name: "Adicionar ao carrinho", exact: true }).click()
  await expect(page.getByRole("status")).toContainText("adicionado")
  await page.goto("/cart")

  await expect(page.getByRole("textbox", { name: "Código promocional", exact: true })).toBeVisible()
  const accessibility = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "best-practice"])
    .analyze()
  expect(accessibility.violations).toEqual([])
  const remove = page.getByRole("button", { name: "Remover Emerald Ape #042", exact: true })
  await expect(remove).toBeVisible()
  const box = await remove.boundingBox()
  expect(box?.width).toBeGreaterThanOrEqual(44)
  expect(box?.height).toBeGreaterThanOrEqual(44)
  await remove.click()
  await expect(page.getByRole("heading", { name: "Seu carrinho está vazio", exact: true })).toBeVisible()
})

test("the catalog fits narrow and intermediate viewports", async ({ page }) => {
  for (const width of [320, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto("/")
    await page.getByRole("link", { name: "Ver Emerald Ape #042", exact: true }).waitFor()
    await page.evaluate(() => document.fonts.ready)
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
  }
})
