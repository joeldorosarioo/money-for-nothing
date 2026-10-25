import { expect, test } from "@playwright/test";
import { z } from "zod";

import { simulationRequest } from "../support/api";

test.beforeEach(async ({ page }) => {
  await page.goto("/login?redirect=/profile")
  await page.getByRole("textbox", { name: "E-mail", exact: true }).fill("collector@kurio.test")
  await page.getByLabel("Senha", { exact: true }).fill("Kurio2026!")
  await page.getByRole("button", { name: "Entrar", exact: true }).click()

  await expect(page).toHaveURL((url) => url.pathname === "/profile")
})

test("profile validates ENS, persists edits and reports conflicting email", async ({ page }) => {
  await page.getByRole("textbox", { name: "Nome de exibição", exact: true }).fill("Alex Updated")
  await page.getByRole("textbox", { name: "Nome ENS", exact: true }).fill("bad ens")
  await page.getByRole("button", { name: "Salvar alterações" }).click()
  await expect(page.getByText("Informe um nome ENS válido terminado em .eth.")).toBeVisible()

  await page.getByRole("textbox", { name: "Nome ENS", exact: true }).fill("alex")
  await page.getByRole("button", { name: "Salvar alterações" }).click()

  await expect(page.getByRole("status")).toContainText("Perfil atualizado")
  await page.reload()

  await expect(page.getByRole("textbox", { name: "Nome de exibição", exact: true })).toHaveValue("Alex Updated")
  await expect(page.getByRole("textbox", { name: "Nome ENS", exact: true })).toHaveValue("alex")

  await page.getByRole("textbox", { name: "E-mail", exact: true }).fill("nova@kurio.test")
  await page.getByRole("button", { name: "Salvar alterações" }).click()

  await expect(page.getByRole("alert")).toBeVisible()
  await page.reload()
  await expect(page.getByRole("textbox", { name: "E-mail", exact: true })).toHaveValue("collector@kurio.test")
})

test("wallet changes persist and a secondary alias follows the primary wallet", async ({ page }) => {
  await page.getByRole("link", { name: "Carteiras", exact: true }).click()
  const primary = page.getByRole("form", { name: "Carteira principal" })

  await primary.getByRole("combobox", { name: "Rede", exact: true }).selectOption("solana")
  await primary.getByRole("button", { name: "Salvar carteira", exact: true }).click()
  await expect(primary.getByText("Endereço incompatível com a rede selecionada.")).toBeVisible()

  await primary.getByRole("combobox", { name: "Rede", exact: true }).selectOption("ethereum")
  await primary.getByRole("textbox", { name: "Apelido da carteira", exact: true }).fill("Minha carteira")
  await primary.getByRole("button", { name: "Salvar carteira", exact: true }).click()
  await expect(page.getByRole("status")).toContainText("Carteira salva")

  await page.getByLabel("Igual à carteira principal").check()
  await expect(page.getByRole("status")).toContainText("Carteira secundária vinculada")

  await page.reload()
  await expect(primary.getByRole("textbox", { name: "Apelido da carteira", exact: true })).toHaveValue("Minha carteira")
  await expect(page.getByLabel("Igual à carteira principal")).toBeChecked()
})

test("a connected wallet can be disconnected through the account screen", async ({ page }) => {
  const wallets = await simulationRequest(page, "/wallets")
  const wallet = z.object({ items: z.array(z.object({ id: z.string() })) }).parse(wallets.data).items[0]

  expect((await simulationRequest(page, "/wallets/connect", "POST", {
    walletId: wallet?.id,
    provider: "metamask"
  })).status).toBe(200)

  await page.goto("/wallets")
  await page.getByRole("button", { name: "Desconectar carteira", exact: true }).click()
  await expect(page.getByRole("status")).toContainText("desconectada")

  expect((await simulationRequest(page, "/wallets")).data).toMatchObject({ connection: null })
})

test("avatar upload and password change persist through a new login", async ({ page }) => {
  await page.getByLabel("Alterar avatar", { exact: true }).setInputFiles("public/assets/8f387.webp")
  await page.getByLabel("Senha atual", { exact: true }).fill("Kurio2026!")
  await page.getByLabel("Nova senha", { exact: true }).fill("NewKurio2026!")
  await page.getByLabel("Confirmar nova senha", { exact: true }).fill("NewKurio2026!")
  await page.getByRole("button", { name: "Salvar alterações", exact: true }).click()
  await expect(page.getByRole("status")).toContainText("Perfil atualizado")

  await page.getByRole("button", { name: "Sair", exact: true }).click()
  await page.goto("/login?redirect=/profile")
  await page.getByLabel("E-mail", { exact: true }).fill("collector@kurio.test")
  await page.getByLabel("Senha", { exact: true }).fill("NewKurio2026!")
  await page.getByRole("button", { name: "Entrar", exact: true }).click()

  await expect(page).toHaveURL((url) => url.pathname === "/profile")
  await expect(page.getByRole("img", { name: "Seu avatar", exact: true })).toHaveAttribute("src", /^data:image\/webp;base64,/)
})
