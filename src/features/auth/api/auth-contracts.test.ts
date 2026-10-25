import { describe, expect, it } from "vitest";

import { loginSchema, registerSchema } from "./auth-contracts";

const validRegistration = {
  username: "nova",
  email: "nova@kurio.test",
  password: "Kurio2026!",
  confirmPassword: "Kurio2026!",
}

describe("account input contracts", () => {
  it("normalizes the email without changing the password", () => {
    expect(loginSchema.parse({ email: " NOVA@KURIO.TEST ", password: " secret " })).toEqual({
      email: "nova@kurio.test",
      password: " secret ",
    });
  });

  it("accepts a complete registration", () => {
    expect(registerSchema.safeParse(validRegistration).success).toBe(true);
  });

  it.each([
    ["email", { email: "wrong" }],
    ["username", { username: "a" }],
    ["password", { password: "short", confirmPassword: "short" }],
    ["confirmPassword", { confirmPassword: "Other2026!" }],
  ])("associates invalid registration input with %s", (field, override) => {
    const result = registerSchema.safeParse({ ...validRegistration, ...override });
    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path[0] === field)).toBe(true);
    }
  });
});
