import { expect, test } from "@playwright/test";

test("favorites survive reload and remain isolated between collectors", async ({ page }) => {
  await page.goto("/favorites")
  await expect(page).toHaveURL((url) => url.pathname === "/login" && url.searchParams.get("redirect") === "/favorites")

  await page.getByLabel("E-mail", { exact: true }).fill("collector@kurio.test")
  await page.getByLabel("Senha", { exact: true }).fill("Kurio2026!")
  await page.getByRole("button", { name: "Entrar", exact: true }).click()
  await expect(page.getByRole("heading", { name: "Lista de interesse", exact: true })).toBeVisible()

  await page.goto("/nfts/emerald-ape-042")

  const favorite = page
    .getByRole("button", { name: "Favoritar Emerald Ape #042", exact: true })
    .filter({ visible: true })

  await favorite.click()

  await expect(page.getByRole("button", {
    name: "Remover Emerald Ape #042 dos favoritos",
    exact: true
  }).filter({ visible: true })).toHaveAttribute("aria-pressed", "true")

  await page.goto("/favorites")
  await expect(page.getByRole("link", { name: "Ver Emerald Ape #042", exact: true })).toBeVisible()

  const artwork = await page.locator("article").first().locator("img").first().boundingBox()
  const title = await page.getByRole("heading", { name: "Emerald Ape #042", exact: true }).boundingBox()
  if (!artwork || !title) throw new Error("Favorite card did not render")

  expect(title.y).toBeGreaterThanOrEqual(artwork.y + artwork.height)

  await page.reload()
  await expect(page.getByRole("link", { name: "Ver Emerald Ape #042", exact: true })).toBeVisible()
  await page.getByRole("button", { name: "Sair", exact: true }).click()
  await page.getByLabel("E-mail", { exact: true }).fill("nova@kurio.test")
  await page.getByLabel("Senha", { exact: true }).fill("Kurio2026!")
  await page.getByRole("button", { name: "Entrar", exact: true }).click()
  await expect(page).toHaveURL((url) => url.pathname !== "/login")
  await page.goto("/favorites")
  await expect(page.getByRole("heading", { name: "Sua lista está vazia", exact: true })).toBeVisible()
})
