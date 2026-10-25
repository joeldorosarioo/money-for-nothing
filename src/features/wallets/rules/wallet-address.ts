import { type Network } from "../../../shared/types/network";

const BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"

export function isWalletAddress (address: string, network: Network): boolean {
  if (network !== "solana") return /^0x[0-9a-fA-F]{40}$/.test(address)
  if (address.length < 32 || address.length > 44) return false

  let decoded = 0n

  for (const character of address) {
    const digit = BASE58_ALPHABET.indexOf(character)
    if (digit < 0) return false

    decoded = decoded * 58n + BigInt(digit)
  }

  let bytes = address.match(/^1*/)?.[0].length ?? 0

  while (decoded > 0n) {
    bytes += 1
    decoded >>= 8n
  }

  return bytes === 32
}
