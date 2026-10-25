import { expect, test, type Request, type Route } from "@playwright/test";
import { z } from "zod";

test("the initial design renders while the simulator downloads without sending premature API calls", async ({ page }) => {
  const held: Route[] = []
  let apiCalls = 0

  await page.route("**/src/mocks/browser.ts", (route) => { held.push(route) })
  page.on("request", (request) => { if (new URL(request.url()).pathname.startsWith("/api/")) apiCalls += 1 })

  try {
    await page.goto("/", { waitUntil: "domcontentloaded" })
    await expect(page.getByRole("heading", { level: 1, name: /SEJA DONO/ })).toBeVisible()
    expect(apiCalls).toBe(0)
  } finally {
    const route = held[0]
    if (route) await route.continue()
    await page.unroute("**/src/mocks/browser.ts")
  }

  await expect(page.getByRole("link", { name: "Ver Emerald Ape #042", exact: true })).toBeVisible()
})

test("returning to the catalog restores mocking after its service worker restarts", async ({ page, context }) => {
  const workerVersionsSchema = z.object({
    versions: z.array(z.object({ versionId: z.string(), scriptURL: z.string(), runningStatus: z.string() })),
  })

  const session = await context.newCDPSession(page)
  let workerVersion: string | undefined

  session.on("ServiceWorker.workerVersionUpdated", (payload: unknown) => {
    for (const version of workerVersionsSchema.parse(payload).versions) {
      if (version.scriptURL.endsWith("/mockServiceWorker.js") && version.runningStatus === "running") {
        workerVersion = version.versionId
      }
    }
  })

  await session.send("ServiceWorker.enable")
  await page.clock.install()
  await page.goto("/?categories=%5B%22digital-art%22%5D")

  const firstItem = page.getByRole("link", { name: "Ver Emerald Ape #042", exact: true })
  await expect(firstItem).toBeVisible()

  await page.waitForLoadState("networkidle")
  const catalogUrl = page.url()
  const visitorId = await page.evaluate(() => localStorage.getItem("kurio.visitor.v1"))

  if (!workerVersion) throw new Error("The catalog must have an active service worker before suspension.")
  await page.clock.setSystemTime(new Date(Date.now() + 60_000))
  await session.send("ServiceWorker.stopWorker", { versionId: workerVersion })
  const refreshRequests = new Set<Request>()

  page.on("request", (request) => {
    if (new URL(request.url()).pathname === "/api/nfts") refreshRequests.add(request)
  })

  const refreshedResponse = page.waitForResponse((response) => refreshRequests.has(response.request()))
  await page.evaluate(() => { window.dispatchEvent(new Event("visibilitychange")) })

  const response = await refreshedResponse
  expect(response.headers()["content-type"]).toContain("application/json")

  await expect(firstItem).toBeVisible()
  await expect(page.getByRole("alert")).toHaveCount(0)

  expect(page.url()).toBe(catalogUrl)
  expect(await page.evaluate(() => localStorage.getItem("kurio.visitor.v1"))).toBe(visitorId)
})
