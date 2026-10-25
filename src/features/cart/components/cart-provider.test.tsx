// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import React, { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";

import { type CartApi } from "../api/cart-api";
import { useCart } from "../hooks/cart-context";
import { type CartView } from "../types/cart";
import { CartProvider } from "./cart-provider";

afterEach(cleanup);

function deferred<T> () {
  let resolve: (value: T) => void = () => undefined

  const promise = new Promise<T>((onResolve) => { resolve = onResolve });
  return { promise, resolve }
}

function Controls () {
  const cart = useCart();

  const [message, setMessage] = useState("");

  function submit (request: Promise<CartView>) {
    void request.catch((error: unknown) => {
      setMessage(error instanceof Error ? error.message : "Failed")
    });
  }

  return (
    <React.Fragment>
      <output aria-label="Cart version">{cart.cart?.version}</output>
      <output aria-label="Saving">{cart.adding ? "yes" : "no"}</output>

      {message && <p role="alert">{message}</p>}

      <button onClick={() => { cart.retry() }}>Refresh</button>

      <button onClick={() => { submit(cart.addItem({ nftId: "emerald", editionId: "50", quantity: 1 })) }}>
        Add
      </button>

      <button onClick={() => { submit(cart.changeItem("line", 2, cart.cart?.version ?? 1)) }}>Change</button>
      <button onClick={() => { submit(cart.removeItem("line", cart.cart?.version ?? 1)) }}>Remove</button>
    </React.Fragment>
  )
}

function setup (api: CartApi, enabled = true) {
  let scope = "collector:1"

  const client = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false
      }
    }
  });

  const view = () => (
    <QueryClientProvider client={client}>
      <CartProvider api={api} scope={scope} enabled={enabled} isCurrentScope={(expected) => expected === scope}>
        <Controls />
      </CartProvider>
    </QueryClientProvider>
  );

  const rendered = render(view());

  return {
    client,
    unmount: rendered.unmount,

    switchAccount: () => {
      scope = "nova:2"
      rendered.rerender(view())

      client.removeQueries({
        queryKey: ["private", "collector:1", "cart"]
      })
    },
  }
}

const initial: CartView = {
  id: "cart",
  ownerId: "collector",
  version: 1,
  items: []
}

describe("cart snapshot reconciliation", () => {
  it("keeps the mutation result when an older background GET finishes later", async () => {
    const oldSnapshot = initial
    const newerSnapshot: CartView = { ...oldSnapshot, version: 2 }

    const delayed = deferred<CartView>();

    let reads = 0

    const api: CartApi = {
      get () {
        reads += 1;
        return reads === 1 ? Promise.resolve(oldSnapshot) : delayed.promise
      },

      add: () => Promise.resolve(newerSnapshot),
      change: () => Promise.resolve(newerSnapshot),
      remove: () => Promise.resolve(newerSnapshot),
    }

    const { client } = setup(api);

    await waitFor(() => { expect(screen.getByLabelText("Cart version")).toHaveTextContent("1") });
    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));

    await waitFor(() => { expect(reads).toBe(2) });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));

    await waitFor(() => { expect(screen.getByLabelText("Cart version")).toHaveTextContent("2") });
    await act(async () => { delayed.resolve(oldSnapshot); await delayed.promise });
    await waitFor(() => { expect(client.isFetching()).toBe(0) });

    expect(screen.getByLabelText("Cart version")).toHaveTextContent("2");
  });

  it("keeps the newest cart when mutations finish out of order", async () => {
    const delayed = deferred<CartView>();

    const { client } = setup({
      get: () => Promise.resolve(initial),
      add: () => delayed.promise,
      change: () => Promise.resolve({ ...initial, version: 3 }),
      remove: () => Promise.resolve(initial),
    });

    await waitFor(() => {
      expect(screen.getByLabelText("Cart version")).toHaveTextContent("1")
    });

    fireEvent.click(screen.getByRole("button", { name: "Add" }));

    await waitFor(() => { expect(screen.getByLabelText("Saving")).toHaveTextContent("yes") });
    fireEvent.click(screen.getByRole("button", { name: "Change" }));

    await waitFor(() => { expect(screen.getByLabelText("Cart version")).toHaveTextContent("3") });
    await act(async () => { delayed.resolve({ ...initial, version: 2 }); await delayed.promise });
    await waitFor(() => { expect(client.isMutating()).toBe(0) });

    expect(screen.getByLabelText("Cart version")).toHaveTextContent("3");
  });

  it("does not restore a previous account's cache after a late mutation", async () => {
    const delayed = deferred<CartView>();

    const { client, switchAccount } = setup({
      get: () => Promise.resolve(initial),
      add: () => delayed.promise,
      change: () => Promise.resolve(initial),
      remove: () => Promise.resolve(initial),
    });

    await waitFor(() => { expect(screen.getByLabelText("Cart version")).toHaveTextContent("1") })
    fireEvent.click(screen.getByRole("button", { name: "Add" }))

    await waitFor(() => { expect(screen.getByLabelText("Saving")).toHaveTextContent("yes") });

    switchAccount();
    expect(screen.getByLabelText("Saving")).toHaveTextContent("no");

    await act(async () => {
      delayed.resolve({ ...initial, version: 2 });
      await delayed.promise
    });

    await waitFor(() => { expect(client.isMutating()).toBe(0) });
    await waitFor(() => { expect(screen.getByLabelText("Cart version")).toHaveTextContent("1") });

    expect(client.getQueryData(["private", "collector:1", "cart"])).toBeUndefined();
    expect(client.getQueryData(["private", "nova:2", "cart"])).toMatchObject({ version: 1 });
  });

  it("does not restore private cache after the provider unmounts", async () => {
    const delayed = deferred<CartView>();

    const { client, unmount } = setup({
      get: () => Promise.resolve(initial),
      add: () => delayed.promise,
      change: () => Promise.resolve(initial),
      remove: () => Promise.resolve(initial),
    });

    await waitFor(() => { expect(screen.getByLabelText("Cart version")).toHaveTextContent("1") });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));

    await waitFor(() => { expect(screen.getByLabelText("Saving")).toHaveTextContent("yes") });
    unmount();
    client.removeQueries({ queryKey: ["private", "collector:1", "cart"] });

    await act(async () => { delayed.resolve({ ...initial, version: 2 }); await delayed.promise });
    await waitFor(() => { expect(client.isMutating()).toBe(0) });

    expect(client.getQueryData(["private", "collector:1", "cart"])).toBeUndefined();
  });

  it("blocks cart requests until the session is available", async () => {
    let server = initial

    setup({
      get: () => Promise.reject(new Error("Cart should not load")),

      add () {
        server = { ...initial, version: 2 };
        return Promise.resolve(server);
      },

      change: () => Promise.resolve(initial),
      remove: () => Promise.resolve(initial),
    }, false);

    fireEvent.click(screen.getByRole("button", { name: "Add" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Aguarde a recuperação da sessão.");
    expect(screen.getByLabelText("Cart version")).toBeEmptyDOMElement();
    expect(server.version).toBe(1);
    expect(screen.getByLabelText("Saving")).toHaveTextContent("no");
  })

  it("refreshes the cart after a rejected change and allows removal", async () => {
    let server = initial

    setup({
      get: () => Promise.resolve(server),
      add: () => Promise.resolve(initial),

      change () {
        server = { ...initial, version: 2 }
        return Promise.reject(new Error("Cart changed"))
      },

      remove: () => Promise.resolve({ ...initial, version: 3 }),
    });

    await waitFor(() => { expect(screen.getByLabelText("Cart version")).toHaveTextContent("1") });
    fireEvent.click(screen.getByRole("button", { name: "Change" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Cart changed");
    expect(screen.getByLabelText("Cart version")).toHaveTextContent("2");

    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    await waitFor(() => { expect(screen.getByLabelText("Cart version")).toHaveTextContent("3") });
  });
});
