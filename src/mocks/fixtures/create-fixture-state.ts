import { type Nft } from "../../features/catalog/types/nft";
import { type Wallet } from "../../features/wallets/types/wallet";
import { type Network } from "../../shared/types/network";
import { type SimulatedUser, type SimulationState } from "../persistence/simulation-state";

const featuredArtworks = [
  { id: "emerald-ape-042", token: "042", name: "Emerald Ape", price: "1.19", image: "8f387.webp" },
  { id: "sage-nomad-009", token: "009", name: "Sage Nomad", price: "1.69", image: "83794.webp" },
  { id: "neon-vessel-552", token: "552", name: "Neon Vessel", price: "1.99", image: "9add2.webp" },
  { id: "cosmic-bloom-118", token: "118", name: "Cosmic Bloom", price: "1.29", image: "83794.webp" },
  { id: "violet-nomad-314", token: "314", name: "Violet Nomad", price: "1.39", image: "83794.webp" },
  { id: "ivory-baron-088", token: "088", name: "Ivory Baron", price: "1.79", image: "9add2.webp" },
  { id: "golden-beat-207", token: "207", name: "Golden Beat", price: "0.99", image: "b7cfc.webp" },
  { id: "golden-echo-208", token: "208", name: "Golden Echo", price: "0.69", image: "b7cfc.webp" },
  { id: "golden-signal-160", token: "160", name: "Golden Signal", price: "0.39", image: "b7cfc.webp" },
] as const

const categories = [
  "digital-art",
  "photography",
  "music",
  "3d",
  "collectibles",
  "generative-art",
  "games",
  "subscriptions",
  "utility",
] as const

function createNfts (): Nft[] {
  return Array.from({ length: 36 }, (_, index) => {
    const artwork = featuredArtworks[index % featuredArtworks.length] ?? featuredArtworks[0]
    const cycle = Math.floor(index / featuredArtworks.length)
    const network: Network = cycle % 3 === 0 ? "ethereum" : cycle % 3 === 1 ? "polygon" : "solana"
    const tokenId = cycle === 0 ? artwork.token : (42 + index).toString().padStart(3, "0")

    return {
      id: cycle === 0 ? artwork.id : artwork.id + "-" + network + "-" + cycle.toString(),
      tokenId,
      name: artwork.name,
      image: "/assets/" + artwork.image,
      category: cycle === 0 ? "digital-art" : categories[index % categories.length] ?? "digital-art",
      network,
      creator: "Kurio Studio",
      description: "Um colecionável digital finalizado à mão da coleção Kurio Editions, verificado na Ethereum, com arte desbloqueável e acesso para colecionadores.",

      editions: [
        { id: "edition-50", label: "Edição de 50", totalSupply: 50, available: 50, unitPrice: artwork.price },
        { id: "edition-10", label: "Edição de 10", totalSupply: 10, available: 10, unitPrice: "2.49" },
        { id: "edition-1", label: "Peça única", totalSupply: 1, available: 1, unitPrice: "4.99" },
      ],

      version: 1,
      listedAt: Date.UTC(2026, 0, 1) - index * 60_000,
      popularity: 100 - index,
      previousPrice: index === 2 ? "2.29" : null,

      attributes: [
        { name: "Coleção", value: "Ape" },
        { name: "Artista", value: "Kurio Studio" },
        { name: "Edição", value: "Limitada" },
      ],
    }
  })
}

function createUser (id: string, username: string, displayName: string, passwordHash: string): SimulatedUser {
  return {
    id,

    profile: {
      id,
      username,
      displayName,
      email: username + "@kurio.test",
      ens: username + ".eth",
      walletNickname: "Minha carteira",
      avatarUrl: "/assets/8f387.webp",
      version: 1,
    },

    passwordSalt: btoa("kurio-fixture-" + username),
    passwordHash,
  }
}

function createWallets (userId: string, username: string): Wallet[] {
  return [
    {
      id: userId + "-primary",
      slot: "primary",
      displayName: username,
      nickname: "Carteira principal",
      network: "ethereum",
      profileName: username,
      address: "0xA91Fa91fA91FA91Fa91fA91Fa91FA91Fa91FE82C",
      secondaryAddress: "",
      provider: "metamask",
      referralCode: "KURIO",
      email: username + "@kurio.test",
      ens: username + ".eth",
      aliasOfPrimary: false,
      version: 1,
    }, {
      id: userId + "-secondary",
      slot: "secondary",
      displayName: username,
      nickname: "Carteira secundária",
      network: "polygon",
      profileName: username,
      address: "0xB82fb82FB82FB82fB82fB82fB82FB82FB82FD71A",
      secondaryAddress: "",
      provider: "walletconnect",
      referralCode: "KURIO",
      email: username + "@kurio.test",
      ens: username + ".eth",
      aliasOfPrimary: false,
      version: 1,
    },
  ]
}

export function createFixtureState (scenario = "default"): SimulationState {
  const collector = createUser("user-collector", "collector", "Alex Morgan", "b+zb/6lowG0VXfIkbAfJUdQiTfGLyhiDSfqBXK+jmYQ=")
  const nova = createUser("user-nova", "nova", "Nova Silva", "SKS0Bl1MsyCpq90c6mltdO8xDxDTLbpfanCyAJ9tVBY=")

  return {
    schemaVersion: 1,
    epoch: crypto.randomUUID(),
    scenario,
    nextId: 100, eventSequence: 0,

    users: {
      [collector.id]: collector,
      [nova.id]: nova
    },

    sessions: {},
    nfts: scenario === "empty" ? [] : createNfts(),
    carts: {},
    favorites: {},
    completedMerges: {},

    wallets: {
      [collector.id]: createWallets(collector.id, "collector"),
      [nova.id]: createWallets(nova.id, "nova")
    },

    connections: {},
    quotes: {},
    orders: {},
    attempts: {},
  }
}
