// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it } from "vitest";

import { Dialog, DialogContent, DialogDescription, DialogTitle } from "./dialog";
import { Skeleton } from "./skeleton";

afterEach(cleanup);

describe("shared shadcn controls", () => {
  it("announces named loading placeholders without announcing decorative ones", () => {
    render(
      <React.Fragment>
        <Skeleton aria-label="Carregando catálogo" />
        <Skeleton />
      </React.Fragment>
    );

    expect(screen.getByRole("status", { name: "Carregando catálogo" })).toBeVisible();
    expect(screen.getAllByRole("status")).toHaveLength(1);
  });

  it("closes a dialog through its default Portuguese close control", () => {
    render(
      <Dialog defaultOpen>
        <DialogContent>
          <DialogTitle>Detalhes da compra</DialogTitle>
          <DialogDescription>Confira os itens selecionados.</DialogDescription>
        </DialogContent>
      </Dialog>
    );

    expect(screen.getByRole("dialog", { name: "Detalhes da compra" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Fechar diálogo" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
