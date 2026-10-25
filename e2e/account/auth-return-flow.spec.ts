import { expect, test, type Page } from "@playwright/test";

async function signIn (page: Page) {
  await page.getByLabel("E-mail", { exact: true }).fill("collector@kurio.test")
  await page.getByLabel("Senha", { exact: true }).fill("Kurio2026!")
  await page.getByRole("button", { name: "Entrar", exact: true }).click()
  await expect(page.getByRole("dialog")).toHaveCount(0)
}

test("logging in from a filtered catalog preserves its URL and results", async ({ page, isMobile }) => {
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.goto("/?q=Emerald&sort=popular")

  const item = page.getByRole("link", { name: "Ver Emerald Ape #042", exact: true })

  await item.waitFor()
  if (!isMobile) await item.hover()
  await page.getByRole("link", { name: "Favoritar Emerald Ape #042", exact: true }).click()

  const origin = page.url()
  const scroll = await page.evaluate(() => window.scrollY)

  await signIn(page)
  await expect(page).toHaveURL(origin)
  await expect(item).toBeVisible()
  await expect(page.getByRole("link", { name: "Ver Sage Nomad #009", exact: true })).toHaveCount(0)

  expect(await page.evaluate(() => window.scrollY)).toBe(scroll)
})

test("registration from the cart returns with the same items and quantities", async ({ page, isMobile }) => {
  test.skip(isMobile, "The header trigger is desktop-only; the same dialog is exercised on mobile through a favorite.")

  await page.goto("/nfts/emerald-ape-042")
  await page.getByRole("spinbutton", { name: "Quantidade de Emerald Ape #042", exact: true }).fill("2")
  await page.getByRole("button", { name: "Adicionar ao carrinho", exact: true }).click()
  await expect(page.getByRole("status")).toContainText("adicionado")
  await page.goto("/cart")

  const quantity = page.getByRole("spinbutton", { name: "Quantidade de Emerald Ape #042", exact: true })

  await expect(quantity).toHaveValue("2")
  await page.getByRole("link", { name: "Entrar", exact: true }).click()

  const origin = page.url()

  await page.getByRole("link", { name: "Criar conta", exact: true }).click()
  await page.getByLabel("Nome de usuário", { exact: true }).fill("cart-collector")
  await page.getByLabel("E-mail", { exact: true }).fill("cart-collector@kurio.test")
  await page.getByLabel("Senha", { exact: true }).fill("Kurio2026!")
  await page.getByLabel("Confirmar senha", { exact: true }).fill("Kurio2026!")
  await page.getByRole("button", { name: "Criar conta", exact: true }).click()
  await expect(page.getByRole("dialog")).toHaveCount(0)
  await expect(page).toHaveURL(origin)
  await expect(quantity).toHaveValue("2")
  await page.reload()
  await expect(quantity).toHaveValue("2")
})
