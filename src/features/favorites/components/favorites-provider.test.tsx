// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import React from "react";
import { type FavoritesApi } from "../api/favorites-api";
import { useFavorites } from "../hooks/favorites-context";
import { FavoritesProvider } from "./favorites-provider";

afterEach(cleanup)

function deferred<T> () {
  let resolve: (value: T) => void = () => undefined
  let reject: (error: Error) => void = () => undefined

  const promise = new Promise<T>((onResolve, onReject) => {
    resolve = onResolve;
    reject = onReject
  })

  return { promise, resolve, reject }
}

function Controls () {
  const favorites = useFavorites()

  return (
    <React.Fragment>
      {["emerald", "violet"].map((id) => (
        <button
          key={id}
          aria-pressed={favorites.nftIds.includes(id)}
          disabled={favorites.loading || favorites.pendingIds.includes(id)}
          onClick={() => { void favorites.toggle(id) }}
        >
          {id}
        </button>
      ))}

      {favorites.error && <p role="alert">{favorites.error.message}</p>}
    </React.Fragment>
  )
}

function setup (api: FavoritesApi) {
  let current = "collector:1"

  const client = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false
      },

      mutations: {
        retry: false
      }
    }
  })

  const view = (scope: string) => (
    <QueryClientProvider client={client}>
      <FavoritesProvider api={api} scope={scope} enabled isCurrentScope={(expected) => expected === current}>
        <Controls />
      </FavoritesProvider>
    </QueryClientProvider>
  )

  const rendered = render(view(current))

  return {
    client,
    switchAccount: () => {
      current = "nova:2";
      rendered.rerender(view(current))
    },
  }
}

describe("authenticated optimistic favorites", () => {
  it("updates before the response and rolls back a failed write", async () => {
    const request = deferred<string[]>()
    setup({ list: () => Promise.resolve([]), set: () => request.promise })

    const button = await screen.findByRole("button", { name: "emerald" })
    await waitFor(() => { expect(button).toBeEnabled() })

    fireEvent.click(button)
    await waitFor(() => { expect(button).toHaveAttribute("aria-pressed", "true") })
    expect(button).toBeDisabled()

    request.reject(new Error("Não foi possível salvar."))
    await waitFor(() => { expect(button).toHaveAttribute("aria-pressed", "false") })
    expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível salvar.")
    expect(button).toBeEnabled()
  })

  it("keeps another NFT optimistic when a simultaneous write fails", async () => {
    const emerald = deferred<string[]>()
    const violet = deferred<string[]>()

    setup({
      list: () => Promise.resolve([]),
      set: (id) => id === "emerald" ? emerald.promise : violet.promise,
    })

    await waitFor(() => { expect(screen.getByRole("button", { name: "emerald" })).toBeEnabled() })
    fireEvent.click(screen.getByRole("button", { name: "emerald" }))
    fireEvent.click(screen.getByRole("button", { name: "violet" }))
    emerald.reject(new Error("A primeira alteração falhou."))

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "emerald" })).toHaveAttribute("aria-pressed", "false")
    })

    expect(screen.getByRole("button", { name: "violet" })).toHaveAttribute("aria-pressed", "true")
    violet.resolve(["violet"])
    await waitFor(() => { expect(screen.getByRole("button", { name: "violet" })).toBeEnabled() })
  })

  it("reconciles one response without discarding another pending NFT", async () => {
    const emerald = deferred<string[]>()
    const violet = deferred<string[]>()

    let server: string[] = []

    setup({
      list: () => Promise.resolve(server),
      set: (id) => id === "emerald" ? emerald.promise : violet.promise,
    })

    await waitFor(() => { expect(screen.getByRole("button", { name: "emerald" })).toBeEnabled() })

    fireEvent.click(screen.getByRole("button", { name: "emerald" }))
    fireEvent.click(screen.getByRole("button", { name: "violet" }))
    emerald.resolve(["emerald"])

    await waitFor(() => { expect(screen.getByRole("button", { name: "emerald" })).toBeEnabled() })
    expect(screen.getByRole("button", { name: "violet" })).toHaveAttribute("aria-pressed", "true")

    server = ["emerald", "violet"]
    violet.resolve(server)
    await waitFor(() => { expect(screen.getByRole("button", { name: "violet" })).toBeEnabled() })
    expect(screen.getByRole("button", { name: "emerald" })).toHaveAttribute("aria-pressed", "true")
  })

  it("does not let a late response recreate private cache after an account switch", async () => {
    const request = deferred<string[]>()

    const { client, switchAccount } = setup({
      list: () => Promise.resolve([]), set: () => request.promise,
    })

    await waitFor(() => { expect(screen.getByRole("button", { name: "emerald" })).toBeEnabled() })
    fireEvent.click(screen.getByRole("button", { name: "emerald" }))
    switchAccount()
    request.resolve(["emerald"])

    await waitFor(() => { expect(screen.getByRole("button", { name: "emerald" })).toBeEnabled() })
    expect(screen.getByRole("button", { name: "emerald" })).toHaveAttribute("aria-pressed", "false")
    expect(client.getQueryData(["private", "collector:1", "favorites"])).toBeUndefined()
  })

  it("does not send a second command while the same NFT is pending", async () => {
    const request = deferred<string[]>()
    const commands: string[] = []

    setup({
      list: () => Promise.resolve([]),
      set (id) { commands.push(id); return request.promise },
    })

    await waitFor(() => { expect(screen.getByRole("button", { name: "emerald" })).toBeEnabled() })
    const button = screen.getByRole("button", { name: "emerald" })

    fireEvent.click(button)
    fireEvent.click(button)

    await waitFor(() => { expect(button).toHaveAttribute("aria-pressed", "true") })
    expect(commands).toEqual(["emerald"])
    request.resolve(["emerald"])
    await waitFor(() => { expect(button).toBeEnabled() })
  })
})
