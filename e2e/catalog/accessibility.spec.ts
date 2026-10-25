import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

for (const route of ["/", "/nfts/emerald-ape-042", "/login", "/signup"]) {
  test("accessible landmarks, headings and controls at " + route, async ({ page }) => {
    await page.goto(route)
    await page.locator("main").waitFor({ state: "attached" })

    if (route === "/login" || route === "/signup") await page.getByRole("dialog").waitFor()
    else await page.getByRole("heading", { level: 1 }).first().waitFor()

    await page.evaluate(() => document.fonts.ready)

    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "best-practice"])
      .analyze()

    expect(result.violations).toEqual([])
  })
}

test("filter dialog traps keyboard focus and restores its trigger", async ({ page, isMobile }) => {
  test.skip(!isMobile, "The desktop filters are inline.")

  await page.goto("/")
  const trigger = page.getByRole("button", { name: "Filtrar NFTs", exact: true })

  await trigger.focus()
  await page.keyboard.press("Enter")

  const dialog = page.getByRole("dialog")
  await expect(dialog).toBeVisible()

  for (let index = 0; index < 16; index += 1) {
    await page.keyboard.press("Tab")
    await expect(dialog).toContainText("Filtrar NFTs")

    expect(await dialog.evaluate((element) => element.contains(document.activeElement))).toBe(true)
  }

  await page.keyboard.press("Escape")
  await expect(dialog).toHaveCount(0)
  await expect(trigger).toBeFocused()
})
