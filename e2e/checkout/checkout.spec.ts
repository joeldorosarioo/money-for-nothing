import AxeBuilder from "@axe-core/playwright";

import { expect, test, type Page } from "@playwright/test";

import { simulationRequest } from "../support/api";

async function prepareCheckout (page: Page) {
  await page.goto("/nfts/emerald-ape-042")
  await page.getByRole("button", { name: "Adicionar ao carrinho", exact: true }).click()
  await expect(page.getByRole("status")).toContainText("adicionado")

  await page.goto("/checkout")
  await page.getByLabel("E-mail", { exact: true }).fill("collector@kurio.test")
  await page.getByLabel("Senha", { exact: true }).fill("Kurio2026!")
  await page.getByRole("button", { name: "Entrar", exact: true }).click()

  await expect(page).toHaveURL((url) => url.pathname === "/checkout")
  await expect(page.getByRole("button", { name: "Confirmar compra", exact: true })).toBeEnabled()
}

test("a purchase recovers after reload and exposes an immutable receipt", async ({ page }) => {
  await prepareCheckout(page)
  await page.getByRole("button", { name: "Confirmar compra", exact: true }).click()

  await expect(page).toHaveURL(/\/orders\//)
  const orderUrl = page.url()
  await page.reload()

  await expect(page.getByRole("heading", { name: "Seus NFTs agora estão na sua carteira", exact: true }))
    .toBeVisible({ timeout: 10_000 })

  await expect(page.getByRole("dialog")).toContainText("1.206 ETH")
  await page.reload()

  await expect(page).toHaveURL(orderUrl)
  await expect(page.getByRole("dialog")).toContainText("1.206 ETH")

  await page.getByRole("button", { name: "Fechar recibo", exact: true }).click()
  await expect(page.getByRole("heading", { name: "Seu carrinho está vazio", exact: true })).toBeVisible()
})

test("a price change requires reviewing the new quote before purchase", async ({ page }) => {
  await prepareCheckout(page)

  await page.evaluate(async () => {
    const response = await fetch("/api/simulation/nfts/emerald-ape-042", {
      method: "PATCH",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify({
        editionId: "edition-50",
        unitPrice: "2"
      }),
    })

    if (!response.ok) throw new Error("Scenario setup failed")
  })

  await expect(page.getByRole("status")).toContainText("mudou")
  await expect(page.getByRole("button", { name: "Confirmar compra", exact: true })).toBeDisabled()

  await page.getByRole("button", { name: "Atualizar cotação", exact: true }).click()
  await page.getByRole("button", { name: "Aceitar nova cotação", exact: true }).click()

  await expect(page.getByRole("button", { name: "Confirmar compra", exact: true })).toBeEnabled()
  await page.getByRole("button", { name: "Confirmar compra", exact: true }).click()
  await expect(page).toHaveURL(/\/orders\//)

  await expect(page.getByRole("heading", { name: "Seus NFTs agora estão na sua carteira", exact: true }))
    .toBeVisible({ timeout: 10_000 })

  await expect(page.getByRole("dialog")).toContainText("2.016 ETH")
})

test("the receipt remains reachable on short desktop viewports", async ({ page }) => {
  await prepareCheckout(page)

  for (const id of ["violet-nomad-314", "ivory-baron-088"]) {
    await page.goto("/nfts/" + id)
    await page.getByRole("button", { name: "Adicionar ao carrinho", exact: true }).click()
    await expect(page.getByRole("status")).toContainText("adicionado")
  }

  await page.goto("/checkout")
  await page.getByRole("button", { name: "Confirmar compra", exact: true }).click()

  await page.getByRole("heading", { name: "Seus NFTs agora estão na sua carteira", exact: true })
    .waitFor({ timeout: 10_000 })

  for (const viewport of [{ width: 1440, height: 900 }, { width: 1024, height: 768 }]) {
    await page.setViewportSize(viewport)
    const bounds = await page.getByRole("dialog").boundingBox()
    if (!bounds) throw new Error("Receipt did not render")

    expect(bounds.y + bounds.height).toBeLessThanOrEqual(viewport.height - 16)

    const action = page.getByRole("button", { name: "Ver no Etherscan", exact: true })
    await action.scrollIntoViewIfNeeded()
    await expect(action).toBeInViewport()
  }
})

test("an accepted purchase with a lost response recovers without a second order", async ({ page }) => {
  await prepareCheckout(page)

  await page.evaluate(async () => {
    const response = await fetch("/api/simulation/scenario", {
      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify({
        scenario: "timeout-after-order"
      }),
    })

    if (!response.ok) throw new Error("Scenario setup failed")
  })

  await page.getByRole("button", { name: "Confirmar compra", exact: true }).click()
  await expect(page.getByRole("heading", { name: "Recuperar sua compra", exact: true })).toBeVisible({ timeout: 15_000 })
  await page.getByRole("button", { name: "Recuperar compra", exact: true }).click()

  await expect(page.getByRole("heading", { name: "Seus NFTs agora estão na sua carteira", exact: true }))
    .toBeVisible({ timeout: 10_000 })

  await expect(page.getByRole("dialog")).toContainText("1.206 ETH")
  await page.getByRole("button", { name: "Fechar recibo", exact: true }).click()
  await expect(page.getByRole("heading", { name: "Seu carrinho está vazio", exact: true })).toBeVisible()
})

test("a rejected purchase preserves the cart for another attempt", async ({ page }) => {
  await prepareCheckout(page)

  await page.evaluate(async () => {
    const response = await fetch("/api/simulation/scenario", {
      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify({
        scenario: "payment-rejected"
      }),
    })

    if (!response.ok) throw new Error("Scenario setup failed")
  })

  await page.getByRole("button", { name: "Confirmar compra", exact: true }).click()

  await expect(page.getByRole("heading", { name: "Compra não confirmada", exact: true }))
    .toBeVisible({ timeout: 10_000 })

  await page.getByRole("link", { name: "Revisar carrinho", exact: true }).click()
  await expect(page.getByRole("spinbutton", { name: "Quantidade de Emerald Ape #042" })).toHaveValue("1")
})

test("checkout and its final receipt have accessible structure and controls", async ({ page, isMobile }) => {
  await prepareCheckout(page)

  if (isMobile) await page.getByRole("button", { name: "Dados do colecionador e resumo", exact: true }).click()

  const checkout = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "best-practice"])
    .analyze()

  expect(checkout.violations).toEqual([])

  await page.getByRole("button", { name: "Confirmar compra", exact: true }).click()

  await page
    .getByRole("heading", { name: "Seus NFTs agora estão na sua carteira", exact: true })
    .waitFor({ timeout: 10_000 })

  const receipt = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "best-practice"])
    .analyze()

  expect(receipt.violations).toEqual([])
})

test("a wallet refusal keeps the cart and allows a later successful purchase", async ({ page }) => {
  await prepareCheckout(page)
  await simulationRequest(page, "/simulation/scenario", "POST", { scenario: "wallet-rejected" })
  await page.getByRole("button", { name: "Confirmar compra", exact: true }).click()

  await expect(page.getByRole("alert")).toContainText("recusada")
  await expect(page).toHaveURL((url) => url.pathname === "/checkout")
  await simulationRequest(page, "/simulation/scenario", "POST", { scenario: "default" })

  await page.getByRole("button", { name: "Confirmar compra", exact: true }).click()
  await expect(page).toHaveURL(/\/orders\//)

  await expect(page.getByRole("heading", { name: "Seus NFTs agora estão na sua carteira", exact: true }))
    .toBeVisible({ timeout: 10_000 })
})

test("selling out a selected edition prevents accepting a stale checkout", async ({ page }) => {
  await prepareCheckout(page)
  await simulationRequest(page, "/simulation/nfts/emerald-ape-042", "PATCH", { editionId: "edition-50", available: 0 })

  await expect(page.getByRole("status")).toContainText("mudou")
  await expect(page.getByRole("button", { name: "Confirmar compra", exact: true })).toBeDisabled()

  await page.getByRole("button", { name: "Atualizar cotação", exact: true }).click()
  await expect(page.getByRole("alert")).toBeVisible()
  await expect(page.getByRole("button", { name: "Confirmar compra", exact: true })).toBeDisabled()
})

test("a pending order survives connection loss and a direct route reload", async ({ page, context }) => {
  await prepareCheckout(page)
  await page.getByRole("button", { name: "Confirmar compra", exact: true }).click()
  await expect(page).toHaveURL(/\/orders\//)

  const orderUrl = page.url()

  await expect(page.getByRole("heading", { name: "Confirmando sua compra", exact: true })).toBeVisible()
  await context.setOffline(true)
  await expect(page.getByRole("heading", { name: "Confirmando sua compra", exact: true })).toBeVisible()
  await context.setOffline(false)

  await page.reload()
  await expect(page).toHaveURL(orderUrl)

  await expect(page.getByRole("heading", { name: "Seus NFTs agora estão na sua carteira", exact: true }))
    .toBeVisible({ timeout: 10_000 })
})

test("a rapid double click creates one order and consumes the cart once", async ({ page }) => {
  await prepareCheckout(page)
  let submissions = 0

  page.on("request", (request) => {
    if (request.method() === "POST" && new URL(request.url()).pathname === "/api/orders") submissions += 1
  })

  await page.getByRole("button", { name: "Confirmar compra", exact: true }).dblclick()

  await expect(page.getByRole("heading", { name: "Seus NFTs agora estão na sua carteira", exact: true }))
    .toBeVisible({ timeout: 10_000 })

  expect(submissions).toBe(1)
  await page.getByRole("button", { name: "Fechar recibo", exact: true }).click()
  await expect(page.getByRole("heading", { name: "Seu carrinho está vazio", exact: true })).toBeVisible()
})
