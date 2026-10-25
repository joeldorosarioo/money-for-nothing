import { expect, test } from "@playwright/test";

test("catalog search survives refresh and browser navigation", async ({ page, isMobile }) => {
  await page.goto("/")
  await expect(page.getByRole("heading", { level: 1, name: /SEJA DONO/ })).toBeVisible()

  if (!isMobile) await page.getByRole("button", { name: "Buscar NFTs", exact: true }).click()
  await page.getByRole("searchbox", { name: "Buscar NFTs" }).fill("Emerald")
  await page.getByRole("searchbox", { name: "Buscar NFTs" }).press("Enter")
  await expect(page).toHaveURL(/q=Emerald/)
  await expect(page.getByRole("link", { name: "Ver Sage Nomad #009" })).toHaveCount(0)
  await page.reload()

  if (!isMobile) await page.getByRole("button", { name: "Buscar NFTs", exact: true }).click()
  await expect(page.getByRole("searchbox", { name: "Buscar NFTs" })).toHaveValue("Emerald")

  if (!isMobile) await page.keyboard.press("Escape")
  await page.getByRole("link", { name: "Ver Emerald Ape #042" }).click()
  await expect(page).toHaveURL(/\/nfts\/emerald-ape-042/)
  await page.goBack()

  if (!isMobile) await page.getByRole("button", { name: "Buscar NFTs", exact: true }).click()
  await expect(page.getByRole("searchbox", { name: "Buscar NFTs" })).toHaveValue("Emerald")
})

test("visitor adds an edition to the cart and recovers it after refresh", async ({ page }) => {
  await page.goto("/nfts/emerald-ape-042")
  await expect(page.getByRole("heading", { level: 1, name: "Emerald Ape #042" })).toBeVisible()
  await page.getByRole("button", { name: "Aumentar quantidade" }).click()
  await page.getByRole("button", { name: "Adicionar ao carrinho" }).click()
  await expect(page.getByRole("status")).toContainText("adicionado")

  await page.goto("/cart")
  await expect(page.getByRole("heading", { name: "Seu carrinho de NFTs" })).toBeVisible()
  await expect(page.getByRole("spinbutton", { name: "Quantidade de Emerald Ape #042" })).toHaveValue("2")
  await expect(page.getByText("2.38 ETH", { exact: true }).first()).toBeVisible()

  await page.reload()
  await expect(page.getByRole("spinbutton", { name: "Quantidade de Emerald Ape #042" })).toHaveValue("2")
})

test("combined filters, sort and pagination survive direct links and browser history", async ({ page, isMobile }) => {
  await page
    .goto("/?q=&categories=digital-art&networks=ethereum&minPrice=0.02&maxPrice=12.30&sort=price-asc&page=2#catalogo")

  const pagination = page.getByRole("navigation", { name: "Paginação do catálogo", exact: true })

  await expect(pagination.getByRole("button", { name: "Página 2", exact: true }))
    .toHaveAttribute("aria-current", "page")
  await page.reload()

  if (isMobile) await page.getByRole("button", { name: "Filtrar NFTs", exact: true }).click()
  await expect(page.getByRole("checkbox", { name: /Arte digital/ })).toBeChecked()
  await expect(page.getByRole("checkbox", { name: /Ethereum/ })).toBeChecked()

  if (isMobile) await page.keyboard.press("Escape")
  else await expect(page.getByRole("combobox", { name: "Ordenar NFTs", exact: true })).toContainText("Menor preço")

  await pagination.getByRole("button", { name: "Página 1", exact: true }).click()
  await expect(page).toHaveURL(/page=1/)
  await page.goBack()

  await expect(pagination.getByRole("button", { name: "Página 2", exact: true }))
    .toHaveAttribute("aria-current", "page")
})
