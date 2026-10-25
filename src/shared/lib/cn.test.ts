import { describe, expect, it } from "vitest";

import { cn } from "./cn";

describe("design token class merging", () => {
  it("allows an exact Figma radius to override a shared radius", () => {
    expect(cn("rounded-control", "rounded-[10px]")).toBe("rounded-[10px]");
  });

  it("preserves an explicit line height when only the font size changes", () => {
    expect(cn("leading-4.5", "text-sm")).toBe("leading-4.5 text-sm");
  });

  it("lets local layout override shared control spacing", () => {
    expect(cn("px-control-x py-control-y min-h-control", "p-0 min-h-6")).toBe("p-0 min-h-6");
  });

  it("lets a quantity control override the shared control line height", () => {
    expect(cn("leading-control", "leading-6")).toBe("leading-6");
  });
});
