import { type WalletInput } from "../../features/wallets/api/wallet-contracts";
import { type Wallet, type WalletSlot } from "../../features/wallets/types/wallet";
import { ApiError } from "../http/api-error";
import { nextId, type SimulationState } from "../persistence/simulation-state";

export function saveWallet (state: SimulationState, userId: string, slot: WalletSlot, input: WalletInput): Wallet {
  const wallets = state.wallets[userId] ?? []
  const current = wallets.find((wallet) => wallet.slot === slot)

  if ((current?.version ?? 0) !== input.expectedVersion) {
    throw new ApiError(409, "WALLET_CHANGED", "A carteira foi atualizada. Recarregue antes de salvar.")
  }

  const id = current?.id ?? nextId(state, "wallet")
  const version = (current?.version ?? 0) + 1
  let updated: Wallet

  if (input.aliasOfPrimary) {
    const primary = wallets.find((wallet) => wallet.slot === "primary")

    if (slot !== "secondary" || !primary) {
      throw new ApiError(422, "PRIMARY_WALLET_REQUIRED", "Cadastre uma carteira principal antes de usar esta opção.")
    }

    updated = {
      ...primary,
      id,
      slot,
      nickname: current?.nickname ?? "Reserva",
      aliasOfPrimary: true,
      version
    }
  } else {
    const duplicate = wallets.some((wallet) => wallet.id !== id && !wallet.aliasOfPrimary
      && wallet.network === input.network
      && (input.network === "solana" ? wallet.address === input.address
        : wallet.address.toLowerCase() === input.address.toLowerCase()))

    if (duplicate) {
      throw new ApiError(409, "WALLET_DUPLICATE", "Esta carteira já está cadastrada. Use a opção de carteira principal.")
    }

    updated = {
      id, slot, version, displayName: input.displayName, nickname: input.nickname, network: input.network,
      profileName: input.profileName, address: input.address, secondaryAddress: input.secondaryAddress,
      provider: input.provider, referralCode: input.referralCode, email: input.email, ens: input.ens, aliasOfPrimary: false,
    }
  }

  const next = current ? wallets.map((wallet) => wallet.id === id ? updated : wallet) : [...wallets, updated]

  state.wallets[userId] = slot === "primary"
    ? next.map((wallet) => wallet.slot === "secondary" && wallet.aliasOfPrimary
      ? {
        ...updated,
        id: wallet.id,
        slot: wallet.slot,
        nickname: wallet.nickname,
        aliasOfPrimary: true,
        version: wallet.version + 1,
      }
      : wallet)
    : next

  state.connections = Object.fromEntries(Object.entries(state.connections).filter(([ownerId]) => ownerId !== userId))
  return updated
}
