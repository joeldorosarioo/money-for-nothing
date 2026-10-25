import { describe, expect, it } from "vitest";

import { type Session, type StoredSession } from "../types/session";
import { createSessionService } from "./session-service";

type SessionDependencies = Parameters<typeof createSessionService>[0]

const collector: Session = {
  token: "collector-token",

  user: {
    id: "collector",
    username: "collector",
    displayName: "Alex",
    email: "a@kurio.test"
  },

  expiresAt: Date.now() + 60_000,
}

const nova: Session = {
  ...collector, token: "nova-token", user: { ...collector.user, id: "nova" }
}

function deferred<T> () {
  let resolve: (value: T) => void = () => {
    throw new Error("Deferred promise not initialized")
  }

  const promise = new Promise<T>((complete) => {
    resolve = complete
  });

  return { promise, resolve }
}

function setup (options: {
  saved?: StoredSession
  merge?: SessionDependencies["mergeGuestCart"]
  login?: SessionDependencies["repository"]["login"]
  current?: SessionDependencies["repository"]["current"]
  logout?: SessionDependencies["repository"]["logout"]
  isUnauthorized?: (error: unknown) => boolean
} = {}) {
  let saved: StoredSession | null = options.saved ?? null

  const repository: SessionDependencies["repository"] = {
    login: options.login ?? (() => Promise.resolve(collector)),
    register: () => Promise.resolve(collector),
    current: options.current ?? (() => Promise.resolve(saved?.token === nova.token ? nova : collector)),
    logout: options.logout ?? (() => Promise.resolve()),
  }

  const service = createSessionService({
    repository,

    persistence: {
      read: () => saved,
      write: (value) => { saved = value }
    },

    mergeGuestCart: options.merge ?? (() => Promise.resolve()),
    createId: () => "unique-merge-id",
    isUnauthorized: options.isUnauthorized ?? (() => false),
  });

  return { service, saved: () => saved }
}

describe("session activation and identity isolation", () => {
  it("restores a session without merging the guest cart twice", async () => {
    const context = setup({ saved: { token: collector.token, pendingMergeId: null } });

    await context.service.restore();
    expect(context.service.getSnapshot()).toMatchObject({ status: "authenticated", session: collector });
    expect(context.saved()).toEqual({ token: collector.token, pendingMergeId: null });
  })

  it("clears an expired session when restoration is unauthorized", async () => {
    const expired = new Error("Expired session");

    const context = setup({
      saved: { token: collector.token, pendingMergeId: null },
      current: () => Promise.reject(expired),
      isUnauthorized: (error) => error === expired,
    })

    await context.service.restore();

    expect(context.service.getSnapshot()).toMatchObject({
      status: "guest",
      session: null
    });

    expect(context.service.getToken()).toBeNull();
    expect(context.saved()).toBeNull();
  });

  it("preserves a session after a transient restoration failure and allows retry", async () => {
    const failure = new Error("Offline");

    let offline = true

    const context = setup({
      saved: {
        token: collector.token,
        pendingMergeId: null
      },

      current: () => offline ? Promise.reject(failure) : Promise.resolve(collector),
    });

    await context.service.restore();

    expect(context.service.getSnapshot()).toMatchObject({
      status: "unavailable",
      session: null,
      error: failure
    });

    expect(context.service.getToken()).toBe(collector.token);

    expect(context.saved()).toEqual({
      token: collector.token,
      pendingMergeId: null
    });

    offline = false

    await context.service.restore();

    expect(context.service.getSnapshot()).toMatchObject({
      status: "authenticated",
      session: collector,
      error: null
    });
  });

  it("clears the previous identity and propagates a rejected login", async () => {
    const failure = new Error("Invalid credentials");

    const context = setup({
      saved: {
        token: collector.token,
        pendingMergeId: null
      },

      login: () => Promise.reject(failure),
    });

    await context.service.restore();

    await expect(context.service.login({
      email: "nova@kurio.test",
      password: "wrong"
    })).rejects.toBe(failure);

    expect(context.service.getSnapshot()).toMatchObject({
      status: "guest",
      session: null,
      error: failure
    });

    expect(context.saved()).toBeNull();
  });

  it("clears the local session even when remote logout fails", async () => {
    const failure = new Error("Offline");

    const context = setup({
      saved: {
        token: collector.token,
        pendingMergeId: null
      },

      logout: () => Promise.reject(failure),
    });

    await context.service.restore();
    await expect(context.service.logout()).rejects.toBe(failure);

    expect(context.service.getSnapshot()).toMatchObject({
      status: "guest",
      session: null
    });

    expect(context.service.getToken()).toBeNull();
    expect(context.saved()).toBeNull();
  });

  it("updates the profile only when the response belongs to the active token", async () => {
    const context = setup();

    const updatedUser = { ...collector.user, displayName: "Updated name" }
    await context.service.login({ email: collector.user.email, password: "password" });

    context.service.updateUser(updatedUser, nova.token);
    expect(context.service.getSnapshot().session?.user.displayName).toBe("Alex");

    context.service.updateUser(updatedUser, collector.token);
    expect(context.service.getSnapshot().session?.user.displayName).toBe("Updated name");
  });

  it("persists a retryable merge marker before starting the guest cart transfer", async () => {
    const merge = deferred<undefined>();
    const context = setup({ merge: () => merge.promise });

    await context.service.restore();
    const login = context.service.login({ email: collector.user.email, password: "password" });

    await Promise.resolve();

    expect(context.saved()).toEqual({ token: collector.token, pendingMergeId: "unique-merge-id" });
    expect(context.service.getSnapshot().status).toBe("activating");

    merge.resolve(undefined);
    await login

    expect(context.saved()?.pendingMergeId).toBeNull();
    expect(context.service.getSnapshot().status).toBe("authenticated");
  });

  it("keeps the authenticated account and merge marker when the transfer fails", async () => {
    let attempts = 0

    const context = setup({
      merge: () => {
        attempts += 1

        return attempts === 1
          ? Promise.reject(new Error("Offline"))
          : Promise.resolve()
      }
    });

    await context.service.login({
      email: collector.user.email,
      password: "password"
    });

    expect(context.service.getSnapshot().status).toBe("authenticated");
    expect(context.service.getSnapshot().mergeError).toBeInstanceOf(Error);
    expect(context.saved()?.pendingMergeId).toBe("unique-merge-id");

    await context.service.retryMerge();
    expect(context.saved()?.pendingMergeId).toBeNull();
    expect(context.service.getSnapshot().mergeError).toBeNull();
  });

  it("resumes an interrupted merge with the same marker after refresh", async () => {
    const context = setup({
      saved: {
        token: collector.token,
        pendingMergeId: "previous-attempt"
      }
    });

    await context.service.restore();
    expect(context.service.getSnapshot().session?.user.id).toBe("collector");
    expect(context.saved()).toEqual({ token: collector.token, pendingMergeId: null });
  });

  it("ignores a slow login response after another account has become active", async () => {
    const first = deferred<Session>();

    const context = setup({
      login: (input) =>
        input.email === "first@kurio.test" ? first.promise : Promise.resolve(nova),
    });

    const oldLogin = context.service.login({ email: "first@kurio.test", password: "password" });
    await context.service.login({ email: "second@kurio.test", password: "password" });

    first.resolve(collector);
    await oldLogin

    expect(context.service.getSnapshot().session?.user.id).toBe("nova");
    expect(context.saved()?.token).toBe(nova.token);
  });

  it("does not resurrect a session when logout interrupts a merge", async () => {
    const merge = deferred<undefined>();
    const context = setup({ merge: () => merge.promise });
    const login = context.service.login({ email: collector.user.email, password: "password" });

    await Promise.resolve();
    await context.service.logout();

    merge.resolve(undefined)
    await login

    expect(context.service.getSnapshot().status).toBe("guest");
    expect(context.saved()).toBeNull();
  })

  it("ignores an expired response from a previous account", async () => {
    const context = setup({
      login: () => Promise.resolve(nova)
    });

    await context.service.login({ email: "nova@kurio.test", password: "password" });
    context.service.expire(collector.token);

    expect(context.service.getSnapshot().session?.token).toBe(nova.token);
    context.service.expire(nova.token);

    expect(context.service.getSnapshot().status).toBe("guest");
    expect(context.saved()).toBeNull();
  });
});
