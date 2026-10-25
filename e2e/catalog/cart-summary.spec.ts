import { expect, test, type Page } from "@playwright/test";

import { simulationRequest } from "../support/api";

async function openCart (page: Page) {
  await page.goto("/nfts/emerald-ape-042")
  await page.getByRole("button", { name: "Adicionar ao carrinho", exact: true }).click()
  await expect(page.getByRole("status")).toContainText("adicionado")
  await page.goto("/cart")
  const summary = page.getByRole("region", { name: "Resumo da carteira", exact: true })
  await expect(summary).toContainText("1.206 ETH")
  return summary
}

test("quantity changes retain the totals while the next quote is calculated", async ({ page }) => {
  const summary = await openCart(page)
  await simulationRequest(page, "/simulation/scenario", "POST", { scenario: "slow" })
  await summary.scrollIntoViewIfNeeded()
  const before = await summary.boundingBox()
  expect(before).not.toBeNull()

  await summary.evaluate((element) => {
    const totals = element.querySelector("dl")
    if (!totals) throw new Error("The initial quote is missing.")
    element.setAttribute("data-totals-removed", "false")
    const observer = new MutationObserver(() => {
      if (!element.contains(totals)) element.setAttribute("data-totals-removed", "true")
    })
    observer.observe(element, { childList: true, subtree: true })
  })

  await page.getByRole("button", { name: "Aumentar quantidade", exact: true }).click()
  await expect(page.getByRole("spinbutton", { name: "Quantidade de Emerald Ape #042", exact: true })).toHaveValue("2")
  await expect(summary.locator("dl")).toHaveAttribute("aria-busy", "true")
  await expect(summary.getByText("Atualizando valores…", { exact: true })).toHaveCount(0)
  await expect(summary).toContainText("1.206 ETH")
  await expect(summary.getByRole("button", { name: "Conectar e finalizar", exact: true })).toBeDisabled()
  await expect(summary.getByLabel("Calculando valores do carrinho", { exact: true })).toHaveCount(0)
  expect((await summary.boundingBox())?.height).toBe(before?.height)

  await expect(summary).toContainText("2.396 ETH")
  await expect(summary).toHaveAttribute("data-totals-removed", "false")
  await expect(summary.locator("dl")).toHaveAttribute("aria-busy", "false")
  await expect(summary.getByRole("link", { name: "Conectar e finalizar", exact: true })).toBeVisible()
})

test("a coupon change does not reuse the previous coupon totals", async ({ page }) => {
  const summary = await openCart(page)
  await simulationRequest(page, "/simulation/scenario", "POST", { scenario: "slow" })
  await page.getByRole("textbox", { name: "Código promocional", exact: true }).fill("KURIO10")
  await summary.getByRole("button", { name: "Aplicar", exact: true }).click()
  await expect(summary.getByLabel("Calculando valores do carrinho", { exact: true })).toBeVisible()
  await expect(summary.getByRole("button", { name: "Conectar e finalizar", exact: true })).toBeDisabled()
  await expect(summary.locator("dl")).toHaveCount(0)
  await expect(summary).toContainText("1.087 ETH")
  await expect(summary.getByRole("link", { name: "Conectar e finalizar", exact: true })).toBeVisible()
})

test("an unsuccessful quote prevents continuing with outdated totals", async ({ page }) => {
  const summary = await openCart(page)
  await simulationRequest(page, "/simulation/scenario", "POST", { scenario: "checkout-error" })
  await page.getByRole("button", { name: "Aumentar quantidade", exact: true }).click()
  await expect(summary.getByRole("alert")).toContainText("temporariamente indisponível")
  await expect(summary.getByRole("button", { name: "Conectar e finalizar", exact: true })).toBeDisabled()
  await expect(summary.getByRole("link", { name: "Conectar e finalizar", exact: true })).toHaveCount(0)
  await expect(summary.locator("dl")).toHaveCount(0)
})
