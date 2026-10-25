import { expect, test } from "@playwright/test";

test("demo controls can reproduce a catalog failure and restore the original world", async ({ page }) => {
  await page.goto("/simulation")
  await expect(page.getByRole("heading", { name: "Cenários da demonstração", exact: true })).toBeVisible()

  await page.getByRole("combobox", { name: "Cenário", exact: true }).click()
  await page.getByRole("option", { name: "Falha no catálogo", exact: true }).click()
  await page.getByRole("button", { name: "Aplicar cenário", exact: true }).click()
  await expect(page.getByRole("status")).toContainText("Cenário atualizado")

  await page.getByRole("link", { name: "Abrir catálogo", exact: true }).click()
  await expect(page.getByRole("alert")).toContainText("temporariamente indisponível")

  await page.goto("/simulation")
  await page.getByRole("combobox", { name: "Cenário", exact: true }).click()
  await page.getByRole("option", { name: "Fluxo normal", exact: true }).click()
  await page.getByRole("button", { name: "Reiniciar demonstração", exact: true }).click()
  await expect(page.getByRole("status")).toContainText("Demonstração reiniciada")

  await page.getByRole("link", { name: "Abrir catálogo", exact: true }).click()
  await expect(page.getByRole("link", { name: "Ver Emerald Ape #042", exact: true })).toBeVisible()
})

test("the simulation edition select submits the chosen edition with the NFT update", async ({ page }) => {
  await page.goto("/simulation")
  await page.getByRole("combobox", { name: "Edição", exact: true }).click()
  await page.getByRole("option", { name: "Edição de 10", exact: true }).click()
  await page.getByRole("textbox", { name: "Preço em ETH", exact: true }).fill("3.27")
  await page.getByRole("spinbutton", { name: "Quantidade disponível", exact: true }).fill("7")
  await page.getByRole("button", { name: "Atualizar NFT", exact: true }).click()
  await expect(page.getByRole("status")).toContainText("Preço e disponibilidade atualizados")

  await page.goto("/nfts/emerald-ape-042")
  await page.getByText("1/10", { exact: true }).click()
  await expect(page.getByText("3.27 ETH", { exact: true }).filter({ visible: true }).first()).toBeVisible()
  await page.getByText("1/50", { exact: true }).click()
  await expect(page.getByText("1.19 ETH", { exact: true }).filter({ visible: true }).first()).toBeVisible()
})
