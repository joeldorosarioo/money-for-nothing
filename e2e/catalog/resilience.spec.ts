import { expect, test } from "@playwright/test";

import { simulationRequest } from "../support/api";

test("favorite failures roll back the optimistic selection", async ({ page }) => {
  await page.goto("/login?redirect=/nfts/emerald-ape-042")
  await page.getByLabel("E-mail", { exact: true }).fill("collector@kurio.test")
  await page.getByLabel("Senha", { exact: true }).fill("Kurio2026!")
  await page.getByRole("button", { name: "Entrar", exact: true }).click()

  await expect(page).toHaveURL(/\/nfts\/emerald-ape-042/)

  expect((await simulationRequest(page, "/simulation/scenario", "POST", { scenario: "favorite-error" })).status)
    .toBe(200)

  const favorite = page
    .getByRole("button", { name: "Favoritar Emerald Ape #042", exact: true })
    .filter({ visible: true })

  await favorite.click()
  await expect(page.getByRole("alert")).toContainText("indisponível")
  await expect(favorite).toHaveAttribute("aria-pressed", "false")

  expect((await simulationRequest(page, "/favorites")).data).toEqual({ nftIds: [] })
})

test("a slow catalog shows shimmer, then an API failure can recover", async ({ page }) => {
  await page.goto("/simulation")
  await page.getByRole("heading", { name: "Cenários da demonstração", exact: true }).waitFor()

  await simulationRequest(page, "/simulation/scenario", "POST", { scenario: "slow" })
  await page.goto("/")

  await expect(page.getByLabel("Carregando NFTs")).toBeVisible()
  await expect(page.getByRole("link", { name: "Ver Emerald Ape #042", exact: true })).toBeVisible()

  await simulationRequest(page, "/simulation/scenario", "POST", { scenario: "catalog-error" })

  await page.reload()
  await expect(page.getByRole("alert")).toContainText("indisponível")
  await simulationRequest(page, "/simulation/scenario", "POST", { scenario: "default" })
  await page.getByRole("button", { name: "Tentar novamente", exact: true }).click()
  await expect(page.getByRole("link", { name: "Ver Emerald Ape #042", exact: true })).toBeVisible()
})

test("a direct unknown NFT renders a recoverable not found state", async ({ page }) => {
  await page.goto("/nfts/this-nft-does-not-exist")
  await expect(page.getByRole("alert")).toContainText("encontrado")
  await expect(page.getByRole("button", { name: "Adicionar ao carrinho", exact: true })).toHaveCount(0)
})

test("cart quantity, coupon and removal reconcile after refresh", async ({ page }) => {
  await page.goto("/nfts/emerald-ape-042")
  await page.getByRole("button", { name: "Adicionar ao carrinho", exact: true }).click()
  await expect(page.getByRole("status")).toContainText("adicionado")

  await page.goto("/cart")
  const quantity = page.getByRole("spinbutton", { name: "Quantidade de Emerald Ape #042", exact: true })
  await quantity.fill("2")
  await quantity.blur()
  await expect(quantity).toHaveValue("2")

  await page.getByRole("textbox", { name: "Código promocional", exact: true }).fill("KURIO10")
  await page.getByRole("button", { name: "Aplicar", exact: true }).click()
  await expect(page.getByRole("region", { name: "Resumo da carteira" })).toContainText("2.158 ETH")

  await page.reload()
  await expect(quantity).toHaveValue("2")

  await quantity.focus()
  await page.getByRole("button", { name: "Remover Emerald Ape #042", exact: true }).click()
  await expect(page.getByRole("heading", { name: "Seu carrinho está vazio", exact: true })).toBeVisible()
})

test("cart totals show a shimmer while an authoritative quote is loading", async ({ page }) => {
  await page.goto("/nfts/emerald-ape-042")
  await page.getByRole("button", { name: "Adicionar ao carrinho", exact: true }).click()
  await expect(page.getByRole("status")).toContainText("adicionado")
  await simulationRequest(page, "/simulation/scenario", "POST", { scenario: "slow" })

  await page.goto("/cart")
  await expect(page.getByLabel("Calculando valores do carrinho", { exact: true })).toBeVisible()
  await expect(page.getByRole("region", { name: "Resumo da carteira" })).toContainText("1.206 ETH")
})
