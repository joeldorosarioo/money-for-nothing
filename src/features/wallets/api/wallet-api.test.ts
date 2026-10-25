import axios from "axios";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { ZodError } from "zod";

import { type Wallet, type WalletConnection } from "../types/wallet";
import { createWalletApi } from "./wallet-api";
import { type WalletInput } from "./wallet-contracts";

const endpoint = "https://kurio.test/api/wallets"
const server = setupServer()
const api = createWalletApi(axios.create({ baseURL: "https://kurio.test/api" }))

const wallet: Wallet = {
  id: "wallet-primary",
  slot: "primary",
  version: 2,
  displayName: "Alex Morgan",
  nickname: "Principal",
  network: "ethereum",
  profileName: "Alex",
  address: "0xA91Fa91fA91FA91Fa91fA91Fa91FA91Fa91FE82C",
  secondaryAddress: "",
  provider: "metamask",
  referralCode: "KURIO",
  email: "collector@kurio.test",
  ens: "alex.eth",
  aliasOfPrimary: false,
}

const connection: WalletConnection = {
  id: "connection-1",
  walletId: wallet.id,
  network: "ethereum",
  provider: "metamask",
  expiresAt: 1_800_000_000_000,
}

const input: WalletInput = {
  displayName: "Alex Updated",
  nickname: "Minha carteira",
  network: "ethereum",
  profileName: "Alex",
  address: wallet.address,
  secondaryAddress: "",
  provider: "metamask",
  referralCode: "KURIO",
  email: "collector@kurio.test",
  ens: "alex.eth",
  aliasOfPrimary: false,
  expectedVersion: 2,
}

beforeAll(() => { server.listen({ onUnhandledRequest: "error" }) })
afterEach(() => { server.resetHandlers() })
afterAll(() => { server.close() })

describe("wallet HTTP API", () => {
  it.each([null, connection])("loads and validates wallets with connection %j", async (activeConnection) => {
    server.use(http.get(endpoint, () => HttpResponse.json({
      items: [{ ...wallet, internal: "discard" }],
      connection: activeConnection,
      internal: "discard",
    })))

    expect(await api.list(new AbortController().signal)).toEqual({ items: [wallet], connection: activeConnection })
  })

  it.each(["primary", "secondary"] as const)("saves a versioned standalone wallet in the %s slot", async (slot) => {
    let body: unknown

    server.use(http.put(endpoint + "/" + slot, async ({ request }) => {
      body = await request.json()
      return HttpResponse.json({ ...wallet, ...input, slot, version: 3 })
    }))

    const saved = await api.save(slot, input)

    expect(body).toEqual(input)

    expect(saved).toEqual({
      ...wallet, displayName: "Alex Updated", nickname: "Minha carteira", slot, version: 3,
    })
  })

  it("saves an explicit secondary alias with its expected version", async () => {
    let body: unknown

    server.use(http.put(endpoint + "/secondary", async ({ request }) => {
      body = await request.json()

      return HttpResponse.json({
        ...wallet, id: "wallet-secondary", slot: "secondary", aliasOfPrimary: true, version: 4
      })
    }))

    const saved = await api.save("secondary", { aliasOfPrimary: true, expectedVersion: 3 })

    expect(body).toEqual({ aliasOfPrimary: true, expectedVersion: 3 })
    expect(saved).toEqual({ ...wallet, id: "wallet-secondary", slot: "secondary", aliasOfPrimary: true, version: 4 })
  })

  it("connects the selected wallet through its provider and validates the connection", async () => {
    let body: unknown

    server.use(http.post(endpoint + "/connect", async ({ request }) => {
      body = await request.json()
      return HttpResponse.json({ ...connection, internal: "discard" })
    }))

    expect(await api.connect(wallet.id, "metamask")).toEqual(connection)
    expect(body).toEqual({ walletId: "wallet-primary", provider: "metamask" })
  })

  it("disconnects the current wallet connection", async () => {
    let activeConnection: WalletConnection | null = connection

    server.use(
      http.get(endpoint, () => HttpResponse.json({ items: [wallet], connection: activeConnection })),

      http.delete(endpoint + "/connection", () => {
        activeConnection = null
        return new HttpResponse(null, { status: 204 })
      }),
    )

    await api.disconnect()

    expect(await api.list(new AbortController().signal)).toEqual({ items: [wallet], connection: null })
  })

  it.each(["list", "save", "connect"] as const)("rejects an invalid %s response", async (operation) => {
    server.use(
      http.get(endpoint, () => HttpResponse.json({ items: [{ ...wallet, version: 0 }], connection: null })),
      http.put(endpoint + "/primary", () => HttpResponse.json({ ...wallet, version: 0 })),
      http.post(endpoint + "/connect", () => HttpResponse.json({ ...connection, expiresAt: "invalid" })),
    )

    const request = operation === "list"
      ? api.list(new AbortController().signal)
      : operation === "save"
        ? api.save("primary", input)
        : api.connect(wallet.id, "metamask")

    await expect(request).rejects.toBeInstanceOf(ZodError)
  })

  it("rejects an invalid connection returned with the wallet list", async () => {
    server.use(http.get(endpoint, () => HttpResponse.json({
      items: [wallet], connection: { ...connection, provider: "unknown" },
    })))

    await expect(api.list(new AbortController().signal)).rejects.toBeInstanceOf(ZodError)
  })

  it.each(["list", "save", "connect", "disconnect"] as const)("propagates HTTP failures from %s", async (operation) => {
    const failure = () => HttpResponse.json({ code: "WALLET_CHANGED" }, { status: 409 })

    server.use(
      http.get(endpoint, failure), http.put(endpoint + "/primary", failure),
      http.post(endpoint + "/connect", failure), http.delete(endpoint + "/connection", failure),
    )

    const request = operation === "list"
      ? api.list(new AbortController().signal)
      : operation === "save"
        ? api.save("primary", input)
        : operation === "connect"
          ? api.connect(wallet.id, "metamask")
          : api.disconnect()

    await expect(request).rejects.toMatchObject({ response: { status: 409, data: { code: "WALLET_CHANGED" } } })
  })

  it("cancels an in-flight wallet list when its signal is aborted", async () => {
    let requestStarted: () => void = () => undefined
    const started = new Promise<void>((resolve) => { requestStarted = resolve })

    server.use(http.get(endpoint, async ({ request }) => {
      requestStarted()

      await new Promise<void>((resolve) => {
        request.signal.addEventListener("abort", () => { resolve() }, { once: true })
      })

      return HttpResponse.json({ items: [wallet], connection: null })
    }))

    const controller = new AbortController()
    const pending = api.list(controller.signal)
    const rejection = expect(pending).rejects.toMatchObject({ code: "ERR_CANCELED" })

    await started
    controller.abort()
    await rejection
  })
})
