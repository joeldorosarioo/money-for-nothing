import { expect, test } from "@playwright/test";

test("a direct private URL preserves its destination through login", async ({ page }) => {
  await page.goto("/profile")
  await expect(page).toHaveURL((url) => url.pathname === "/login" && url.searchParams.get("redirect") === "/profile")

  await page.getByLabel("E-mail", { exact: true }).fill("collector@kurio.test")
  await page.getByLabel("Senha", { exact: true }).fill("Kurio2026!")
  await page.getByRole("button", { name: "Entrar", exact: true }).click()
  await expect(page).toHaveURL((url) => url.pathname === "/profile")
  await expect(page.getByRole("textbox", { name: "Nome de exibição", exact: true })).toHaveValue("Alex Morgan")
})

test("login validates credentials, restores the session and logs out", async ({ page }) => {
  await page.goto("/login?redirect=/cart")
  await page.getByLabel("E-mail", { exact: true }).fill("collector@kurio.test")
  await page.getByLabel("Senha", { exact: true }).fill("invalid")
  await page.getByRole("button", { name: "Entrar", exact: true }).click()
  await expect(page.getByRole("alert")).toContainText("E-mail ou senha")

  await page.getByLabel("Senha", { exact: true }).fill("Kurio2026!")
  await page.getByRole("button", { name: "Entrar", exact: true }).click()
  await expect(page).toHaveURL((url) => url.pathname === "/cart")

  await page.reload()
  await page.goto("/profile")
  await expect(page.getByRole("heading", { name: "Perfil do colecionador", exact: true })).toBeVisible()

  await page.getByRole("button", { name: "Sair", exact: true }).click()
  await expect(page).toHaveURL((url) => url.pathname === "/login")
})

test("signup reports confirmation mismatch before creating a persistent account", async ({ page }) => {
  await page.goto("/signup")
  await page.getByLabel("Nome de usuário", { exact: true }).fill("new-collector")
  await page.getByLabel("E-mail", { exact: true }).fill("new@kurio.test")
  await page.getByLabel("Senha", { exact: true }).fill("Kurio2026!")
  await page.getByLabel("Confirmar senha", { exact: true }).fill("Wrong2026!")
  await page.getByRole("button", { name: /Criar (conta|perfil)/ }).click()
  await expect(page.getByText("As senhas precisam ser iguais.")).toBeVisible()

  await page.getByLabel("Confirmar senha", { exact: true }).fill("Kurio2026!")
  await page.getByRole("button", { name: /Criar (conta|perfil)/ }).click()
  await expect(page).toHaveURL((url) => url.pathname === "/profile")

  await page.reload()
  await expect(page.getByRole("heading", { name: "Perfil do colecionador", exact: true })).toBeVisible()
})

test("guest items transfer once on login and do not leak to another account", async ({ page }) => {
  await page.goto("/nfts/emerald-ape-042")
  await page.getByRole("button", { name: "Adicionar ao carrinho", exact: true }).click()
  await expect(page.getByRole("status")).toContainText("adicionado")

  await page.goto("/login?redirect=/cart")
  await page.getByLabel("E-mail", { exact: true }).fill("collector@kurio.test")
  await page.getByLabel("Senha", { exact: true }).fill("Kurio2026!")
  await page.getByRole("button", { name: "Entrar", exact: true }).click()
  await expect(page).toHaveURL((url) => url.pathname === "/cart")
  await expect(page.getByRole("spinbutton", { name: "Quantidade de Emerald Ape #042" })).toBeVisible()

  await page.reload()
  await expect(page.getByRole("spinbutton", { name: "Quantidade de Emerald Ape #042" })).toHaveValue("1")

  await page.goto("/profile")
  await page.getByRole("button", { name: "Sair", exact: true }).click()
  await page.getByLabel("E-mail", { exact: true }).fill("nova@kurio.test")
  await page.getByLabel("Senha", { exact: true }).fill("Kurio2026!")
  await page.getByRole("button", { name: "Entrar", exact: true }).click()
  await page.goto("/cart")
  await expect(page.getByRole("heading", { name: "Seu carrinho está vazio" })).toBeVisible()
})
