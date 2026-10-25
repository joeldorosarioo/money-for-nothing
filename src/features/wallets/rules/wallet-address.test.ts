import { describe, expect, it } from "vitest";

import { isWalletAddress } from "./wallet-address";

describe("wallet address validation", () => {
  it.each(["ethereum", "polygon"] as const)("accepts a complete EVM address on %s", (network) => {
    expect(isWalletAddress("0xA91Fa91fA91FA91Fa91fA91Fa91FA91Fa91FE82C", network)).toBe(true)
  })

  it("rejects a shortened display address as a wallet address", () => {
    expect(isWalletAddress("0xA91F…E82C", "ethereum")).toBe(false)
  })

  it("rejects hexadecimal characters outside the address alphabet", () => {
    expect(isWalletAddress("0xG91Fa91fA91FA91Fa91fA91Fa91FA91Fa91FE82C", "ethereum")).toBe(false)
  })

  it("accepts a base58 address encoding 32 bytes on Solana", () => {
    expect(isWalletAddress("11111111111111111111111111111111", "solana")).toBe(true)
  })

  it("rejects an EVM address on Solana", () => {
    expect(isWalletAddress("0xA91Fa91fA91FA91Fa91fA91Fa91FA91Fa91FE82C", "solana")).toBe(false)
  })

  it("rejects a base58 string with an invalid decoded length", () => {
    expect(isWalletAddress("111111111111111111111111111111111", "solana")).toBe(false)
  })
})
