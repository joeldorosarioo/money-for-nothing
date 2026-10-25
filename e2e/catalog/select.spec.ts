import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("catalog sorting uses an in-page select and persists a keyboard selection", async ({ page }) => {
  await page.goto("/?sort=recent#catalogo")
  const sort = page.getByRole("combobox", { name: "Ordenar NFTs", exact: true })

  await expect(sort).toHaveJSProperty("tagName", "BUTTON")
  await sort.focus()
  await sort.press("ArrowDown")
  await expect(page.getByRole("listbox")).toBeVisible()
  await expect(page.getByRole("option", { name: "Listados recentemente", exact: true })).toBeFocused()
  await page.keyboard.press("ArrowDown")
  await expect(page.getByRole("option", { name: "Menor preço", exact: true })).toBeFocused()
  await page.keyboard.press("Enter")

  await expect(page).toHaveURL(/sort=price-asc/)
  await expect(sort).toContainText("Menor preço")
  await page.reload()
  await expect(sort).toContainText("Menor preço")
})

test("catalog select popup is accessible and returns focus when dismissed", async ({ page }) => {
  await page.goto("/#catalogo")
  const sort = page.getByRole("combobox", { name: "Ordenar NFTs", exact: true })

  await sort.click()
  await expect(page.getByRole("listbox")).toBeVisible()
  const accessibility = await new AxeBuilder({ page })
    .include('[role="listbox"]')
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "best-practice"])
    .analyze()
  expect(accessibility.violations).toEqual([])

  await page.keyboard.press("Escape")
  await expect(page.getByRole("listbox")).toHaveCount(0)
  await expect(sort).toBeFocused()
  await expect(page).not.toHaveURL(/sort=price-/)
})
