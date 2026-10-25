import { expect, test, type Page } from "@playwright/test";

import { compareArtworkRendering } from "../support/artwork-rendering";

const viewports = [
  { name: "desktop", width: 1440, height: 1080 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "figma-mobile", width: 414, height: 896 },
  { name: "mobile", width: 390, height: 844 },
] as const

const screens = ["home", "detail", "cart", "login", "signup", "profile", "wallets", "checkout"] as const

async function authenticate (page: Page) {
  await page.goto("/login?redirect=/profile")
  await page.getByLabel("E-mail", { exact: true }).fill("collector@kurio.test")
  await page.getByLabel("Senha", { exact: true }).fill("Kurio2026!")
  await page.getByRole("button", { name: "Entrar", exact: true }).click()

  await expect(page).toHaveURL((url) => url.pathname === "/profile")
  await expect(page.getByRole("textbox", { name: "Nome de exibição", exact: true })).toHaveValue("Alex Morgan")
}

async function seedCart (page: Page, desktop: boolean) {
  await page.goto("/cart")
  await page.getByRole("heading", { name: "Seu carrinho está vazio", exact: true }).waitFor()

  await page.evaluate(async (entries) => {
    const visitor = localStorage.getItem("kurio.visitor.v1")
    if (!visitor) throw new Error("Visitor has not initialized.")

    for (const [nftId, quantity] of entries) {
      const response = await fetch("/api/cart/items", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          "X-Visitor-Id": visitor
        },

        body: JSON.stringify({
          nftId,
          editionId: "edition-50",
          quantity
        }),
      })

      if (!response.ok) throw new Error("Could not seed the visual cart.")
    }
  }, desktop
    ? [["emerald-ape-042", 2], ["violet-nomad-314", 6], ["ivory-baron-088", 9]] as const
    : [["emerald-ape-042", 1], ["violet-nomad-314", 1], ["ivory-baron-088", 2], ["golden-beat-207", 2]] as const
  )

  await page.reload()
  await expect(page.getByText(desktop ? "26.846 ETH" : "8.156 ETH", { exact: true })).toBeVisible()
}

for (const viewport of viewports) {
  for (const screen of screens) {
    test("@visual " + viewport.name + " " + screen, async ({ page }) => {
      await page.setViewportSize(viewport)
      await page.emulateMedia({ reducedMotion: "reduce" })

      if (screen === "checkout") {
        await seedCart(page, viewport.width >= 1024)
        await authenticate(page)
        await page.goto("/checkout")
        await expect(page.getByRole("button", { name: "Confirmar compra", exact: true })).toBeEnabled()
      } else if (screen === "profile" || screen === "wallets") {
        await authenticate(page)

        if (screen === "wallets") {
          await page.getByRole("link", { name: "Carteiras", exact: true }).click()
          await expect(page.getByRole("form", { name: "Carteira principal" })).toBeVisible()
          await expect(page.getByRole("textbox", { name: "Endereço da carteira", exact: true })).not.toHaveValue("")
        }
      } else if (screen === "cart") {
        await seedCart(page, viewport.width >= 1024)
      } else {
        await page.goto(screen === "home" ? "/" : screen === "detail" ? "/nfts/emerald-ape-042" : "/" + screen)

        if (screen === "detail") await page.getByRole("heading", { name: "Emerald Ape #042", exact: true }).waitFor()
        else if (screen === "home") await page.getByRole("link", { name: "Ver Emerald Ape #042" }).waitFor()
        else {
          await page.getByRole("dialog").waitFor()

          if (viewport.width >= 1024) await page
            .locator("[inert]")
            .getByRole("link", { name: "Ver Emerald Ape #042", includeHidden: true })
            .waitFor()
        }
      }

      if (screen === "home") {
        await page.evaluate(async () => {
          for (let offset = 0; offset < document.documentElement.scrollHeight; offset += window.innerHeight) {
            window.scrollTo(0, offset)

            await new Promise<void>((resolve) => {
              requestAnimationFrame(() => { requestAnimationFrame(() => { resolve() }) })
            })
          }

          window.scrollTo(0, 0)
        })
      }

      await page.evaluate(async () => {
        await document.fonts.ready

        await Promise
          .all(Array.from(document.images).filter((image) => image.getClientRects().length > 0).map((image) => {
            image.loading = "eager"
            return image.decode().catch(() => undefined)
          }))

        window.scrollTo(0, 0)
      })

      const { candidate, reference } = await compareArtworkRendering(page, test.info())

      const snapshotName = viewport.name + "-" + screen + ".png"

      const sharesArtworkBaseline = viewport.width < 1024 && ["checkout", "login", "signup", "wallets"]
        .includes(screen)

      const responsiveSnapshotName = sharesArtworkBaseline ? snapshotName : "responsive-" + snapshotName

      expect(reference).toMatchSnapshot(snapshotName, { maxDiffPixels: 0 })
      expect(candidate).toMatchSnapshot(responsiveSnapshotName, { maxDiffPixels: 0 })
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(viewport.width)
    })
  }
}
