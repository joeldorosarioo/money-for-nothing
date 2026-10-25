// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";

import { ViewportImage } from "./viewport-image";

afterEach(cleanup);

test("changing to an image without variants removes the previous source selection", () => {
  const view = render(
    <ViewportImage
      alt="Artwork"
      src="/first.webp"
      srcSet="/first-small.webp 160w"
      sizes="100px"
    />
  );

  const image = screen.getByRole("img", { name: "Artwork" });

  expect(image).toHaveAttribute("srcset", "/first-small.webp 160w");
  view.rerender(<ViewportImage alt="Artwork" src="/uploaded.png" />);

  expect(image).toHaveAttribute("src", "/uploaded.png");
  expect(image).not.toHaveAttribute("srcset");
  expect(image).not.toHaveAttribute("sizes");
})
