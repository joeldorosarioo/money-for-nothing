import axios from "axios";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { ZodError } from "zod";

import { createProfileApi } from "./profile-api";

const endpoint = "https://kurio.test/api/profile"
const server = setupServer()
const api = createProfileApi(axios.create({ baseURL: "https://kurio.test/api" }))

const profile = {
  id: "collector",
  version: 2,
  displayName: "Alex Morgan",
  username: "alexmorgan",
  email: "collector@kurio.test",
  ens: "alex.eth",
  walletNickname: "Principal",
  avatarUrl: "/assets/8f387.webp",
}

const input = {
  displayName: "Alex Updated",
  username: "alexmorgan",
  email: "updated@kurio.test",
  ens: "alex.eth",
  walletNickname: "Principal",
  avatarUrl: "",
  expectedVersion: 2,
}

beforeAll(() => { server.listen({ onUnhandledRequest: "error" }) })
afterEach(() => { server.resetHandlers() })
afterAll(() => { server.close() })

describe("profile HTTP API", () => {
  it("loads and validates the collector profile", async () => {
    server.use(http.get(endpoint, () => HttpResponse.json({ ...profile, internal: "discard" })))
    expect(await api.get(new AbortController().signal)).toEqual(profile)
  })

  it("accepts the incomplete profile of a newly registered collector", async () => {
    server.use(http.get(endpoint, () => HttpResponse.json({ ...profile, ens: "", walletNickname: "" })))
    expect(await api.get(new AbortController().signal)).toMatchObject({ ens: "", walletNickname: "" })
  })

  it.each([input, {
    ...input, passwordChange: {
      currentPassword: "Kurio2026!", password: "NewKurio2026!", confirmPassword: "NewKurio2026!",
    }
  }])("saves the versioned profile with an optional password change: %j", async (update) => {
    let body: unknown

    server.use(http.put(endpoint, async ({ request }) => {
      body = await request.json()
      return HttpResponse.json({ ...profile, ...input, version: 3 })
    }))

    const saved = await api.save(update)

    expect(body).toEqual(update)

    expect(saved).toEqual({
      id: "collector",
      version: 3,
      displayName: "Alex Updated",
      username: "alexmorgan",
      email: "updated@kurio.test",
      ens: "alex.eth",
      walletNickname: "Principal",
      avatarUrl: "",
    })
  })

  it.each(["get", "save"] as const)("rejects an invalid %s response", async (operation) => {
    const handler = operation === "get" ? http.get : http.put
    server.use(handler(endpoint, () => HttpResponse.json({ ...profile, version: 0 })))

    const request = operation === "get" ? api.get(new AbortController().signal) : api.save(input)
    await expect(request).rejects.toBeInstanceOf(ZodError)
  })

  it.each(["get", "save"] as const)("propagates HTTP failures from %s", async (operation) => {
    const handler = operation === "get" ? http.get : http.put
    server.use(handler(endpoint, () => HttpResponse.json({ code: "PROFILE_CHANGED" }, { status: 409 })))

    const request = operation === "get" ? api.get(new AbortController().signal) : api.save(input)
    await expect(request).rejects.toMatchObject({ response: { status: 409, data: { code: "PROFILE_CHANGED" } } })
  })

  it("cancels an in-flight profile read when its signal is aborted", async () => {
    let requestStarted: () => void = () => undefined
    const started = new Promise<void>((resolve) => { requestStarted = resolve })

    server.use(http.get(endpoint, async ({ request }) => {
      requestStarted()

      await new Promise<void>((resolve) => {
        request.signal.addEventListener("abort", () => { resolve() }, { once: true })
      })

      return HttpResponse.json(profile)
    }))

    const controller = new AbortController()
    const pending = api.get(controller.signal)
    const rejection = expect(pending).rejects.toMatchObject({ code: "ERR_CANCELED" })

    await started
    controller.abort()
    await rejection
  })
})
