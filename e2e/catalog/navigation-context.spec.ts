import { expect, test } from "@playwright/test";

const homeSections = [
  {
    label: "Criadores",
    id: "criadores"
  }, {
    label: "Aprenda",
    id: "diario"
  },
] as const

for (const { label, id } of homeSections) {
  test(label + " preserves the filtered catalog and scrolls without reloading", async ({ page, isMobile }) => {
    test.skip(isMobile, "The editorial navigation links belong to the desktop header.")

    await page.emulateMedia({ reducedMotion: "reduce" })
    await page.goto("/?q=Emerald&sort=popular")
    await page.getByRole("link", { name: "Ver Emerald Ape #042", exact: true }).waitFor()

    const popular = page.getByRole("button", { name: "Em alta", exact: true })
    await popular.click()
    await expect(popular).toHaveAttribute("aria-pressed", "true")

    const search = Object.fromEntries(new URL(page.url()).searchParams)
    const timeOrigin = await page.evaluate(() => performance.timeOrigin)
    const documentRequests: string[] = []

    page.on("request", (request) => {
      if (request.isNavigationRequest() && request.frame() === page.mainFrame())
        documentRequests.push(request.url())
    })

    await page.getByRole("navigation", { name: "Navegação principal" })
      .getByRole("link", { name: label, exact: true })
      .click()

    await expect(page).toHaveURL((url) => url.pathname === "/" && url.hash === "#" + id)
    expect(await page.evaluate(() => performance.timeOrigin)).toBe(timeOrigin)
    expect(documentRequests).toEqual([])
    expect(Object.fromEntries(new URL(page.url()).searchParams)).toEqual(search)

    await expect(popular).toHaveAttribute("aria-pressed", "true")

    await expect
      .poll(() => page.locator("#" + id).evaluate((element) => Math.abs(element.getBoundingClientRect().top)))
      .toBeLessThan(2)
  })

  test(label + " reaches its home section from an NFT without reloading and supports browser history", async ({
    page, isMobile
  }) => {
    test.skip(isMobile, "The editorial navigation links belong to the desktop header.")

    await page.emulateMedia({ reducedMotion: "reduce" })
    await page.goto("/nfts/sage-nomad-009")
    await page.getByRole("heading", { name: "Sage Nomad #009", exact: true }).waitFor()

    const timeOrigin = await page.evaluate(() => performance.timeOrigin)
    const documentRequests: string[] = []

    page.on("request", (request) => {
      if (request.isNavigationRequest() && request.frame() === page.mainFrame()) documentRequests.push(request.url())
    })

    await page
      .getByRole("navigation", { name: "Navegação principal" })
      .getByRole("link", { name: label, exact: true })
      .click()

    await expect(page).toHaveURL((url) => url.pathname === "/" && url.hash === "#" + id)
    expect(await page.evaluate(() => performance.timeOrigin)).toBe(timeOrigin)

    await expect
      .poll(() => page.locator("#" + id).evaluate((element) => Math.abs(element.getBoundingClientRect().top)))
      .toBeLessThan(2)

    await page.goBack()
    await expect(page).toHaveURL((url) => url.pathname === "/nfts/sage-nomad-009")
    await expect(page.getByRole("heading", { name: "Sage Nomad #009", exact: true })).toBeVisible()
    await page.goForward()
    await expect(page).toHaveURL((url) => url.pathname === "/" && url.hash === "#" + id)

    expect(await page.evaluate(() => performance.timeOrigin)).toBe(timeOrigin)
    expect(documentRequests).toEqual([])

    await expect
      .poll(() => page.locator("#" + id).evaluate((element) => Math.abs(element.getBoundingClientRect().top)))
      .toBeLessThan(2)
  })
}

test("sorting keeps the current catalog scroll position", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.goto("/")

  const sort = page.getByRole("button", { name: "Em alta", exact: true })

  await page.getByRole("link", { name: "Ver Emerald Ape #042", exact: true }).waitFor()
  await sort.evaluate((element) => { window.scrollTo(0, element.getBoundingClientRect().top + window.scrollY - 120) })

  const before = await page.evaluate(() => window.scrollY)
  expect(before).toBeGreaterThan(50)

  await sort.click()
  await expect(page).toHaveURL((url) => url.searchParams.get("sort") === "popular")
  await expect(page.getByRole("link", { name: "Ver Emerald Ape #042", exact: true })).toBeVisible()
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(before)
})

test("opening login preserves the NFT page and closing restores focus", async ({ page, isMobile }) => {
  test.skip(isMobile, "The header login trigger belongs to the desktop Figma frame.")

  await page.goto("/nfts/sage-nomad-009")

  const heading = page.getByRole("heading", { name: "Sage Nomad #009", exact: true })
  await heading.waitFor()

  const before = page.url()
  const trigger = page.getByRole("link", { name: "Entrar", exact: true })

  await trigger.click()
  await expect(page.getByRole("dialog")).toBeVisible()

  expect(page.url()).toBe(before)

  expect(await page.getByRole("heading", {
    name: "Sage Nomad #009",
    exact: true,
    includeHidden: true
  }).count()).toBe(1)

  const overlay = page.locator('[data-slot="dialog-overlay"]')
  await expect(overlay).toBeVisible()
  const background = await overlay.evaluate((element) => getComputedStyle(element).backgroundColor)

  expect(background).not.toBe("rgba(0, 0, 0, 0)")

  await page.getByRole("link", { name: "Criar conta", exact: true }).click()
  await expect(page.getByLabel("Nome de usuário", { exact: true })).toBeVisible()

  expect(page.url()).toBe(before)

  await page.keyboard.press("Escape")
  await expect(page.getByRole("dialog")).toHaveCount(0)
  await expect(heading).toBeVisible()
  await expect(trigger).toBeFocused()
})

test("canceling authentication from a catalog favorite preserves filters and scroll", async ({ page, isMobile }) => {
  await page.goto("/?sort=popular")

  const favorite = page.getByRole("link", { name: "Favoritar Emerald Ape #042", exact: true })
  if (!isMobile) await page.getByRole("link", { name: "Ver Emerald Ape #042", exact: true }).hover()

  await favorite.scrollIntoViewIfNeeded()

  const before = page.url()
  const scroll = await page.evaluate(() => window.scrollY)

  await favorite.click()
  await expect(page.getByRole("dialog")).toBeVisible()

  expect(page.url()).toBe(before)

  if (isMobile) await page.getByRole("button", { name: "Fechar", exact: true }).click()
  else await page.keyboard.press("Escape")

  await expect(page.getByRole("dialog")).toHaveCount(0)
  expect(page.url()).toBe(before)
  expect(await page.evaluate(() => window.scrollY)).toBe(scroll)
})

test("category changes keep the filter panel and page at the same scroll position", async ({ page, isMobile }) => {
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.goto("/")
  await page.getByRole("link", { name: "Ver Emerald Ape #042", exact: true }).waitFor()

  if (isMobile) await page.getByRole("button", { name: "Filtrar NFTs", exact: true }).click()

  const category = page.getByRole("checkbox", { name: /Generativa/ })
  const panel = isMobile ? page.getByRole("dialog") : page.locator("aside")
  const label = panel.getByText("Generativa", { exact: true })

  await label.scrollIntoViewIfNeeded()

  const before = await page.evaluate(() => window.scrollY)

  await label.click()
  await expect(category).toBeChecked()
  await expect(page).toHaveURL((url) => url.searchParams.get("categories")?.includes("generative-art") === true)

  expect(await page.evaluate(() => window.scrollY)).toBe(before)
})

test("leaving the origin through browser history dismisses its authentication dialog", async ({ page, isMobile }) => {
  test.skip(isMobile, "The header login trigger is desktop-only.")

  await page.goto("/")
  await page.getByRole("link", { name: "Ver Sage Nomad #009", exact: true }).click()
  await page.getByRole("heading", { name: "Sage Nomad #009", exact: true }).waitFor()
  await page.getByRole("link", { name: "Entrar", exact: true }).click()

  await expect(page.getByRole("dialog")).toBeVisible()
  await page.goBack()

  await expect(page).toHaveURL((url) => url.pathname === "/")
  await expect(page.getByRole("dialog")).toHaveCount(0)
})
