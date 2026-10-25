import "fake-indexeddb/auto";

import axios from "axios";
import { setupServer } from "msw/node";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";

import { profileSchema } from "../features/profile/api/profile-contracts";
import { createHandlers, resetSimulation } from "./handlers";

const server = setupServer(...createHandlers("account-integration"))
const api = axios.create({ baseURL: "https://kurio.test/api", validateStatus: () => true })

const profileInput = {
  displayName: "Alex Morgan",
  username: "collector",
  email: "collector@kurio.test",
  ens: "collector.eth",
  walletNickname: "Principal",
  avatarUrl: "",
  expectedVersion: 1,
}

const walletInput = {
  displayName: "Alex Morgan",
  nickname: "Reserva",
  network: "ethereum",
  profileName: "collector",
  address: "0xC73fc73FC73FC73fC73fC73fC73FC73FC73FC60B",
  secondaryAddress: "",
  provider: "metamask",
  referralCode: "KURIO",
  email: "collector@kurio.test",
  ens: "collector.eth",
  aliasOfPrimary: false,
  expectedVersion: 1,
}

beforeAll(() => { server.listen({ onUnhandledRequest: "error" }) })
afterAll(() => { server.close() })

beforeEach(async () => {
  await resetSimulation("account-integration", "default")
})

async function authenticate (email = "collector@kurio.test", password = "Kurio2026!") {
  const response = await api.post<unknown>("/auth/login", { email, password })
  expect(response.status).toBe(200)

  return {
    Authorization: "Bearer " + z.object({ token: z.string() }).parse(response.data).token
  }
}

describe("private account and wallet persistence", () => {
  it("disconnects only the current account wallet connection and remains idempotent", async () => {
    const headers = await authenticate()
    const response = await api.get<unknown>("/wallets", { headers })
    const wallet = z.object({ items: z.array(z.object({ id: z.string() })) }).parse(response.data).items[0]

    expect((await api.post("/wallets/connect", { walletId: wallet?.id, provider: "metamask" }, { headers })).status)
      .toBe(200)

    expect((await api.delete("/wallets/connection", { headers })).status).toBe(204)
    expect((await api.get<unknown>("/wallets", { headers })).data).toMatchObject({ connection: null })
    expect((await api.delete("/wallets/connection", { headers })).status).toBe(204)
    expect((await api.delete("/wallets/connection")).status).toBe(401)
  })

  it("accepts an incomplete profile returned for a newly registered collector", async () => {
    const registered = await api.post<unknown>("/auth/register", {
      username: "new-collector",
      email: "new@kurio.test",
      password: "Kurio2026!",
      confirmPassword: "Kurio2026!",
    })

    const token = z.object({ token: z.string() }).parse(registered.data).token
    const response = await api.get<unknown>("/profile", { headers: { Authorization: "Bearer " + token } })

    expect(response.status).toBe(200)
    expect(profileSchema.parse(response.data)).toMatchObject({ ens: "", walletNickname: "" })
  })

  it("requires authentication to read a collector profile", async () => {
    expect((await api.get("/profile")).status).toBe(401)
  })

  it("returns only the current collector profile", async () => {
    const headers = await authenticate("nova@kurio.test")
    const response = await api.get<unknown>("/profile", { headers })

    expect(response.status).toBe(200)
    expect(response.data).toMatchObject({ username: "nova", email: "nova@kurio.test" })
  })

  it("persists profile updates and accepts login with the updated email", async () => {
    const headers = await authenticate()

    const updated = await api.put<unknown>("/profile", {
      ...profileInput, email: " UPDATED@KURIO.TEST ", displayName: "Alex Updated",
    }, { headers })

    const recovered = await api.get<unknown>("/profile", { headers })

    expect(updated.status).toBe(200)
    expect(recovered.data).toMatchObject({ email: "updated@kurio.test", displayName: "Alex Updated", version: 2 })
    await authenticate("updated@kurio.test")
  })

  it("rejects a profile email already owned by another account", async () => {
    const headers = await authenticate()
    const response = await api.put("/profile", { ...profileInput, email: "nova@kurio.test" }, { headers })

    expect(response.status).toBe(409)
  })

  it("rejects stale profile updates without overwriting the newer value", async () => {
    const headers = await authenticate()

    await api.put("/profile", { ...profileInput, displayName: "Updated" }, { headers })

    const stale = await api.put("/profile", profileInput, { headers })
    const current = await api.get<unknown>("/profile", { headers })

    expect(stale.status).toBe(409)
    expect(current.data).toMatchObject({ displayName: "Updated" })
  })

  it("requires the correct current password before changing it", async () => {
    const headers = await authenticate()

    const response = await api.put("/profile", {
      ...profileInput, passwordChange: {
        currentPassword: "Wrong2026!",
        password: "NewKurio2026!",
        confirmPassword: "NewKurio2026!"
      },
    }, { headers })

    expect(response.status).toBe(422)
    expect(response.data).toMatchObject({ code: "CURRENT_PASSWORD_INVALID" })
  })

  it("changes the password and expires other sessions for the same account", async () => {
    const first = await authenticate()
    const other = await authenticate()

    const response = await api.put("/profile", {
      ...profileInput, passwordChange: {
        currentPassword: "Kurio2026!",
        password: "NewKurio2026!",
        confirmPassword: "NewKurio2026!"
      },
    }, { headers: first })

    expect(response.status).toBe(200)
    expect((await api.get("/auth/session", { headers: other })).status).toBe(401)
    expect((await api.get("/auth/session", { headers: first })).status).toBe(200)
    expect((await api.post("/auth/login", { email: profileInput.email, password: "Kurio2026!" })).status).toBe(401)
    await authenticate(profileInput.email, "NewKurio2026!")
  })

  it("rejects an avatar whose declared image is not a valid image payload", async () => {
    const headers = await authenticate()

    const response = await api.put("/profile", {
      ...profileInput,
      avatarUrl: "data:image/png;base64," + btoa("not an image"),
    }, { headers })

    expect(response.status).toBe(422)
  })

  it("persists a wallet in the requested slot", async () => {
    const headers = await authenticate()
    const response = await api.put<unknown>("/wallets/secondary", walletInput, { headers })
    const recovered = await api.get<unknown>("/wallets", { headers })

    expect(response.status).toBe(200)
    expect(recovered.data).toMatchObject({
      items: [{}, { slot: "secondary", address: walletInput.address, version: 2 }]
    })
  })

  it("rejects an address incompatible with its network", async () => {
    const headers = await authenticate()
    const response = await api.put("/wallets/secondary", { ...walletInput, network: "solana" }, { headers })

    expect(response.status).toBe(422)
  })

  it("rejects duplicate wallets while allowing an explicit primary alias", async () => {
    const headers = await authenticate()

    const duplicate = await api.put("/wallets/secondary", {
      ...walletInput,
      address: "0xa91fa91fa91fa91fa91fa91fa91fa91fa91fe82c",
    }, { headers })

    const alias = await api.put("/wallets/secondary", { aliasOfPrimary: true, expectedVersion: 1 }, { headers })

    expect(duplicate.status).toBe(409)
    expect(alias.status).toBe(200)

    expect(alias.data).toMatchObject({
      aliasOfPrimary: true,
      address: "0xA91Fa91fA91FA91Fa91fA91Fa91FA91Fa91FE82C"
    })
  })

  it("keeps the secondary alias synchronized when the primary wallet changes", async () => {
    const headers = await authenticate()

    await api.put("/wallets/secondary", { aliasOfPrimary: true, expectedVersion: 1 }, { headers })
    const changed = await api.put("/wallets/primary", { ...walletInput, nickname: "Principal" }, { headers })
    const recovered = await api.get<unknown>("/wallets", { headers })

    expect(changed.status).toBe(200)

    expect(recovered.data).toMatchObject({
      items: [
        { address: walletInput.address },
        { aliasOfPrimary: true, address: walletInput.address, version: 3 }
      ],
    })
  })
})
