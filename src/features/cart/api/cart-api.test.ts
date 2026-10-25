import axios from "axios";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { ZodError } from "zod";

import { createCartApi } from "./cart-api";

const baseUrl = "https://kurio.test/api"

const server = setupServer();
const api = createCartApi(axios.create({ baseURL: baseUrl }));

const snapshot = {
  id: "cart-1",
  ownerId: "collector",
  version: 3,

  items: [
    {
      id: "line-1",
      nftId: "emerald",
      editionId: "edition-50",
      quantity: 2,
      name: "Emerald Ape",
      tokenId: "042",
      image: "/assets/emerald.webp",
      network: "ethereum",
      editionLabel: "Edição de 50",
      unitPrice: "1.19",
      available: 8,
      nftVersion: 4,
    }
  ],
}

beforeAll(() => { server.listen({ onUnhandledRequest: "error" }) });
afterEach(() => { server.resetHandlers() });
afterAll(() => { server.close() });

describe("cart HTTP API", () => {
  it("loads the cart with edition details and exact ETH prices", async () => {
    server.use(http.get(baseUrl + "/cart", () => HttpResponse.json(snapshot)));

    const cart = await api.get(new AbortController().signal);

    expect(cart).toMatchObject({
      id: "cart-1",
      ownerId: "collector",
      version: 3,

      items: [
        {
          id: "line-1",
          quantity: 2,
          network: "ethereum",
          unitPrice: "1.19",
          available: 8
        }
      ],
    });
  });

  it.each([
    ["a nonpositive version", { ...snapshot, version: 0 }],
    ["a fractional quantity", { ...snapshot, items: [{ ...snapshot.items[0], quantity: 1.5 }] }],
    ["an unsupported network", { ...snapshot, items: [{ ...snapshot.items[0], network: "unknown" }] }],
    ["an invalid ETH price", { ...snapshot, items: [{ ...snapshot.items[0], unitPrice: "1e3" }] }],
  ])("rejects a cart response with %s", async (_description, invalid) => {
    server.use(http.get(baseUrl + "/cart", () => HttpResponse.json(invalid)));
    await expect(api.get(new AbortController().signal)).rejects.toBeInstanceOf(ZodError);
  });

  it("adds the selected edition and quantity", async () => {
    let body: unknown

    server.use(http.post(baseUrl + "/cart/items", async ({ request }) => {
      body = await request.json();
      return HttpResponse.json(snapshot);
    }));

    const cart = await api.add({
      nftId: "emerald",
      editionId: "edition-50",
      quantity: 2
    });

    expect(body).toEqual({ nftId: "emerald", editionId: "edition-50", quantity: 2 });
    expect(cart.version).toBe(3);
  });

  it("changes an escaped cart line against the expected version", async () => {
    let body: unknown
    let pathname = ""

    server.use(http.patch(baseUrl + "/cart/items/:itemId", async ({ request }) => {
      body = await request.json();
      pathname = new URL(request.url).pathname

      return HttpResponse.json(snapshot);
    }));

    const cart = await api.change("line/one ?#", 2, 2);

    expect(pathname).toBe("/api/cart/items/line%2Fone%20%3F%23");
    expect(body).toEqual({ quantity: 2, expectedVersion: 2 });
    expect(cart.items[0]?.quantity).toBe(2);
  });

  it("removes an escaped cart line with the If-Match version", async () => {
    let pathname = ""
    let version: string | null = null

    server.use(http.delete(baseUrl + "/cart/items/:itemId", ({ request }) => {
      pathname = new URL(request.url).pathname
      version = request.headers.get("If-Match");

      return HttpResponse.json({ ...snapshot, items: [] });
    }));

    const cart = await api.remove("line/one ?#", 2);

    expect(pathname).toBe("/api/cart/items/line%2Fone%20%3F%23");
    expect(version).toBe("2");
    expect(cart.items).toEqual([]);
  });

  it("cancels an in-flight cart read when its signal is aborted", async () => {
    let requestStarted: () => void = () => undefined
    const started = new Promise<void>((resolve) => { requestStarted = resolve });

    server.use(http.get(baseUrl + "/cart", async ({ request }) => {
      requestStarted();

      await new Promise<void>((resolve) => {
        request.signal.addEventListener("abort", () => { resolve() }, { once: true });
      });

      return HttpResponse.json(snapshot);
    }));

    const controller = new AbortController();
    const pending = api.get(controller.signal);
    const rejection = expect(pending).rejects.toMatchObject({ code: "ERR_CANCELED" });

    await started
    controller.abort();
    await rejection
  });

  it("propagates HTTP conflicts without returning a cart", async () => {
    server.use(http.patch(baseUrl + "/cart/items/:itemId", () => HttpResponse.json({
      code: "CART_CHANGED",
      message: "Confira as quantidades atuais.",
    }, { status: 409 })));

    await expect(api.change("line-1", 2, 1)).rejects.toMatchObject({
      response: { status: 409, data: { code: "CART_CHANGED" } },
    });
  });
});
