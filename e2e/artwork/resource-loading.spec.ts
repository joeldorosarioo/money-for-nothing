import { expect, test, type Page, type Route } from "@playwright/test";
import { z } from "zod";

async function observeImagePriority (page: Page, path: string) {
  const client = await page.context().newCDPSession(page)

  const requestEvent = z.object({
    requestId: z.string(), request: z.object({ url: z.string(), initialPriority: z.string() }),
  })

  const priorityEvent = z.object({ requestId: z.string(), newPriority: z.string() })

  let requestId: string | undefined
  let initialPriority: string | undefined
  let currentPriority: string | undefined

  await client.send("Network.enable")

  client.on("Network.requestWillBeSent", (event: unknown) => {
    const result = requestEvent.safeParse(event)

    if (result.success && new URL(result.data.request.url).pathname === path && initialPriority === undefined) {
      requestId = result.data.requestId
      initialPriority = result.data.request.initialPriority
      currentPriority = initialPriority
    }
  })

  client.on("Network.resourceChangedPriority", (event: unknown) => {
    const result = priorityEvent.safeParse(event)
    if (result.success && result.data.requestId === requestId) currentPriority = result.data.newPriority
  })

  return { initial: () => initialPriority, current: () => currentPriority }
}

test("the first viewport visual loads before the application without downloading desktop artwork on mobile", async ({
  page, isMobile
}) => {
  const held: Route[] = []
  const images: string[] = []

  page.on("request", (request) => {
    if (request.resourceType() === "image") images.push(new URL(request.url()).pathname)
  })

  await page.route(/\/src\/app\/main\.tsx(?:\?|$)/, (route) => { held.push(route) })

  try {
    await page.goto("/", { waitUntil: "commit" })
    await expect.poll(() => held.length).toBe(1)
    await expect.poll(() => images).toContain(isMobile ? "/assets/f545d.svg" : "/assets/artwork/8f387-480.webp")

    if (isMobile) expect(images.filter((path) => path.includes("8f387"))).toEqual([])
  } finally {
    for (const route of held) await route.continue()
    await page.unroute(/\/src\/app\/main\.tsx(?:\?|$)/)
  }
})

test("private routes do not download the home artwork before the application starts", async ({ page }) => {
  const held: Route[] = []
  const images: string[] = []

  page.on("request", (request) => {
    if (request.resourceType() === "image") images.push(new URL(request.url()).pathname)
  })

  await page.route(/\/src\/app\/main\.tsx(?:\?|$)/, (route) => { held.push(route) })

  try {
    await page.goto("/wallets", { waitUntil: "commit" })
    await expect.poll(() => held.length).toBe(1)
    await expect.poll(() => page.evaluate(() => document.readyState)).toBe("interactive")
    expect(images.filter((path) => path.includes("8f387"))).toEqual([])
  } finally {
    for (const route of held) await route.continue()
    await page.unroute(/\/src\/app\/main\.tsx(?:\?|$)/)
  }
})

test("the detail artwork begins its request at high priority before gallery thumbnails", async ({ page }) => {
  const priority = await observeImagePriority(page, "/assets/artwork/8f387-480.webp")

  await page.goto("/nfts/emerald-ape-042")
  await page.getByRole("heading", { name: "Emerald Ape #042", exact: true }).waitFor()
  await expect.poll(priority.initial).toBeDefined()

  expect(["High", "VeryHigh"]).toContain(priority.initial())
})

test("secondary home artwork does not compete with the main visual at high priority", async ({ page, isMobile }) => {
  const priority = await observeImagePriority(
    page, isMobile ? "/assets/artwork/83794-160.webp" : "/assets/artwork/83794-320.webp"
  )

  await page.goto("/")
  await expect.poll(priority.initial).toBeDefined()
  await page.getByRole("link", { name: "Ver Sage Nomad #009", exact: true }).waitFor()

  await page.getByRole("img", {
    name: "Ape com óculos verdes e jaqueta esmeralda",
    exact: true
  }).evaluate(async (image) => {
    if (image instanceof HTMLImageElement) await image.decode()
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => { requestAnimationFrame(() => { resolve() }) })
    })
  })

  expect(priority.current()).toBe("Low")
})

test("the hero only downloads secondary artwork when its slot is visible", async ({ page, isMobile }) => {
  const held: Route[] = []
  const images: string[] = []

  page.on("request", (request) => {
    if (request.resourceType() === "image") images.push(new URL(request.url()).pathname)
  })

  await page.route(/\/src\/mocks\/browser\.ts(?:\?|$)/, (route) => { held.push(route) })

  try {
    await page.goto("/", { waitUntil: "domcontentloaded" })
    await expect.poll(() => held.length).toBe(1)

    await page.getByRole("img", {
      name: "Ape com óculos verdes e jaqueta esmeralda",
      exact: true
    }).evaluate(async (image) => {
      if (image instanceof HTMLImageElement) await image.decode()

      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => { resolve() })
        })
      })
    })

    if (isMobile) await expect.poll(() => images).toContain("/assets/artwork/83794-160.webp")

    else {
      expect(images).not.toContain("/assets/artwork/83794-160.webp")
      expect(images).not.toContain("/assets/artwork/9add2-320.webp")

      await page.getByRole("region", { name: "Coleções selecionadas", exact: true }).scrollIntoViewIfNeeded()
      await expect.poll(() => images).toContain("/assets/artwork/9add2-320.webp")
    }
  } finally {
    for (const route of held) await route.continue()
    await page.unroute(/\/src\/mocks\/browser\.ts(?:\?|$)/)
  }
})
