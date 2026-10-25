import AxeBuilder from "@axe-core/playwright";

import { expect, test, type Route } from "@playwright/test";

test("a suspended route renders without React loading errors", async ({ page }) => {
  const errors: string[] = []
  const held: Route[] = []

  page.on("pageerror", (error) => { errors.push(error.message) })
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()) })
  await page.route(/\/src\/features\/auth\/pages\/auth-screen\.tsx(?:\?|$)/, (route) => { held.push(route) })

  try {
    await page.goto("/login?redirect=/profile", { waitUntil: "domcontentloaded" })
    await expect.poll(() => held.length).toBe(1)

    await page.evaluate(async () => {
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => { resolve() })
        })
      })
    })
  } finally {
    for (const route of held) await route.continue()
    await page.unroute(/\/src\/features\/auth\/pages\/auth-screen\.tsx(?:\?|$)/)
  }

  await page.getByLabel("E-mail", { exact: true }).waitFor()
  expect(errors).toEqual([])
})

test("a failed route download offers a reload that recovers the screen", async ({ page }) => {
  let failed = false

  await page.route(/\/src\/features\/auth\/pages\/auth-screen\.tsx(?:\?|$)/, async (route) => {
    if (!failed) {
      failed = true
      await route.abort("failed")
    } else await route.continue()
  })

  await page.goto("/login?redirect=/profile")
  await page.getByRole("alert").waitFor()

  const result = await new AxeBuilder({ page }).withTags(
    ["wcag2a", "wcag2aa", "wcag21aa", "best-practice"]
  ).analyze()

  expect(result.violations).toEqual([])

  await page.getByRole("button", { name: "Tentar novamente", exact: true }).press("Enter")
  await page.getByLabel("E-mail", { exact: true }).waitFor()
})
