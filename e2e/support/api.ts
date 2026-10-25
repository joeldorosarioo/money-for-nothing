import { type Page } from "@playwright/test";

export async function simulationRequest (page: Page, path: string, method = "GET", body?: unknown) {
  return page.evaluate(async (input) => {
    const headers: Record<string, string> = { "Content-Type": "application/json" }
    const visitor = localStorage.getItem("kurio.visitor.v1")

    if (visitor) headers["X-Visitor-Id"] = visitor
    const serialized = localStorage.getItem("kurio.session.v1")
    const session: unknown = serialized ? JSON.parse(serialized) : null

    if (session && typeof session === "object" && "token" in session && typeof session.token === "string") {
      headers.Authorization = "Bearer " + session.token
    }

    const response = await fetch("/api" + input.path, {
      method: input.method, headers, ...(input.body === undefined ? {} : { body: JSON.stringify(input.body) }),
    })

    const data: unknown = response.status === 204 ? null : await response.json()
    return { status: response.status, data }
  }, { path, method, body })
}
