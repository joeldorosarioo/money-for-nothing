// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";

import { browserSessionPersistence } from "./browser-session-persistence";

afterEach(() => { localStorage.clear() });

describe("browser session persistence", () => {
  it("returns no session when storage is empty", () => {
    expect(browserSessionPersistence.read()).toBeNull();
  });

  it.each(
    ["{", "null", "{}", '{"token":"","pendingMergeId":null}', '{"token":"saved-token","pendingMergeId":42}']
  )("ignores invalid stored sessions: %s", (serialized) => {
    localStorage.setItem("kurio.session.v1", serialized);
    expect(browserSessionPersistence.read()).toBeNull();
  });

  it.each([null, "pending-transfer"])("restores a session with merge marker %s", (pendingMergeId) => {
    localStorage.setItem("kurio.session.v1", JSON.stringify({ token: "saved-token", pendingMergeId }));
    expect(browserSessionPersistence.read()).toEqual({ token: "saved-token", pendingMergeId });
  });

  it("stores the token and pending cart transfer for a later session", () => {
    browserSessionPersistence.write({ token: "saved-token", pendingMergeId: "pending-transfer" });

    expect(JSON.parse(localStorage.getItem("kurio.session.v1") ?? "null")).toEqual({
      token: "saved-token",
      pendingMergeId: "pending-transfer",
    });
  });

  it("clears the saved session while preserving other browser data", () => {
    localStorage.setItem("kurio.session.v1", '{"token":"saved-token","pendingMergeId":null}');
    localStorage.setItem("kurio.visitor.v1", "visitor-id");

    browserSessionPersistence.write(null);

    expect(localStorage.getItem("kurio.session.v1")).toBeNull();
    expect(localStorage.getItem("kurio.visitor.v1")).toBe("visitor-id");
  });
});
