import { expect, test } from "@playwright/test";

test("a committed price update reaches the detail page without reload", async ({ page }) => {
  await page.goto("/nfts/emerald-ape-042")
  await page.getByRole("heading", { name: "Emerald Ape #042", exact: true }).waitFor()

  await page.evaluate(async () => {
    const response = await fetch("/api/simulation/nfts/emerald-ape-042", {
      method: "PATCH",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify({
        editionId: "edition-50",
        unitPrice: "2.11"
      }),
    })

    if (!response.ok) throw new Error("Scenario setup failed")
  })

  await expect(page.getByText("2.11 ETH", { exact: true }).filter({ visible: true }).first()).toBeVisible()
})

test("logout in another tab revokes the active private subscription", async ({ page, context }) => {
  await page.goto("/login?redirect=/profile")
  await page.getByLabel("E-mail", { exact: true }).fill("collector@kurio.test")
  await page.getByLabel("Senha", { exact: true }).fill("Kurio2026!")
  await page.getByRole("button", { name: "Entrar", exact: true }).click()
  await expect(page).toHaveURL((url) => url.pathname === "/profile")

  const other = await context.newPage()

  await other.goto("/profile")
  await other.getByRole("button", { name: "Sair", exact: true }).click()
  await expect(page).toHaveURL((url) => url.pathname === "/login")
  await expect(page.getByRole("heading", { name: "Perfil do colecionador", exact: true })).toHaveCount(0)
})

test("live price changes refresh the cart summary and explain the change", async ({ page }) => {
  await page.goto("/nfts/emerald-ape-042")
  await page.getByRole("button", { name: "Adicionar ao carrinho", exact: true }).click()
  await expect(page.getByRole("status")).toContainText("adicionado")
  await page.goto("/cart")

  const summary = page.getByRole("region", { name: "Resumo da carteira" })

  await expect(summary).toContainText("1.206 ETH")

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

  await expect(summary).toContainText("2.016 ETH")
  await expect(page.getByRole("status")).toContainText("atualizado")
})

test("duplicated and older protocol notifications preserve the current NFT", async ({ page }) => {
  await page.goto("/nfts/emerald-ape-042")
  await page.getByRole("heading", { name: "Emerald Ape #042", exact: true }).waitFor()

  await page.evaluate(async () => {
    const channel = new BroadcastChannel("kurio:browser-v1")

    const changed = new Promise<Record<string, unknown>>((resolve) => {
      channel.onmessage = (message: MessageEvent<unknown>) => {
        const value = message.data

        if (value && typeof value === "object" && "resource" in value && value.resource === "catalog") {
          resolve(Object.fromEntries(Object.entries(value)))
        }
      }
    })

    try {
      const response = await fetch("/api/simulation/nfts/emerald-ape-042", {
        method: "PATCH",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          editionId: "edition-50",
          unitPrice: "2.11"
        }),
      })

      if (!response.ok) throw new Error("Scenario setup failed")
      const event = await changed

      channel.postMessage(event)
      channel.postMessage({ ...event, id: String(event.id) + ":late", version: 1 })
    } finally { channel.close() }
  })

  await expect(page.getByText("2.11 ETH", { exact: true }).filter({ visible: true }).first()).toBeVisible()
  await expect(page.getByText("1.19 ETH", { exact: true }).filter({ visible: true })).toHaveCount(0)
})
