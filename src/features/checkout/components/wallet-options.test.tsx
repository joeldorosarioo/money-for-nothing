// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";

import { WalletOptions } from "./wallet-options";

afterEach(cleanup)

test("exposes compatible wallet brands as readable text in the WalletConnect option", () => {
  render(<WalletOptions provider="walletconnect" network="ethereum" onChange={() => undefined} />)

  const option = screen.getByRole("radio", { name: "WalletConnect" }).closest("label")
  if (!option) throw new Error("WalletConnect must have a provider label.")

  const brands = within(option).getByRole("list", { name: "Carteiras compatíveis" })

  expect(within(brands).getAllByRole("listitem").map((item) => item.textContent))
    .toEqual(["METAMASK", "WALLETCONNECT", "COINBASE"])
})
