import { type Network } from "../../../shared/types/network";

export const networkLabels: Record<Network, string> = {
  ethereum: "Rede principal Ethereum",
  polygon: "Rede Polygon",
  solana: "Rede Solana",
}

export function shortenAddress (address: string) {
  return address.length > 16 ? address.slice(0, 6) + "…" + address.slice(-4) : address
}
