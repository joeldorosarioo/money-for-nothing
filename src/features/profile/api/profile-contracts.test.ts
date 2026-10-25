import { describe, expect, it } from "vitest";

import { profileSchema } from "./profile-contracts";

const profile = {
  id: "collector",
  version: 1,
  displayName: "Alex Morgan",
  username: "alexmorgan",
  email: "collector@kurio.test",
  ens: "alex.eth",
  walletNickname: "Principal",
}

describe("profile artwork boundary", () => {
  it("accepts the lossless WebP version of the approved avatar artwork", () => {
    expect(profileSchema.safeParse({ ...profile, avatarUrl: "/assets/8f387.webp" }).success).toBe(true)
  })

  it("keeps the asset allowlist closed to unknown filenames", () => {
    expect(profileSchema.safeParse({ ...profile, avatarUrl: "/assets/unknown.webp" }).success).toBe(false)
  })
})
