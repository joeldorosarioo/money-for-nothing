import { expect, test } from "@playwright/test";

test("demo controls can reproduce a catalog failure and restore the original world", async ({ page }) => {
  await page.goto("/simulation")
  await expect(page.getByRole("heading", { name: "Cenários da demonstração", exact: true })).toBeVisible()

  await page.getByLabel("Cenário", { exact: true }).selectOption("catalog-error")
  await page.getByRole("button", { name: "Aplicar cenário", exact: true }).click()
  await expect(page.getByRole("status")).toContainText("Cenário atualizado")

  await page.getByRole("link", { name: "Abrir catálogo", exact: true }).click()
  await expect(page.getByRole("alert")).toContainText("temporariamente indisponível")

  await page.goto("/simulation")
  await page.getByLabel("Cenário", { exact: true }).selectOption("default")
  await page.getByRole("button", { name: "Reiniciar demonstração", exact: true }).click()
  await expect(page.getByRole("status")).toContainText("Demonstração reiniciada")

  await page.getByRole("link", { name: "Abrir catálogo", exact: true }).click()
  await expect(page.getByRole("link", { name: "Ver Emerald Ape #042", exact: true })).toBeVisible()
})
