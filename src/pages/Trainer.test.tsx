import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ProfileProvider } from "../state/ProfileProvider";
import Trainer from "./Trainer";

function renderAt(url: string) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <ProfileProvider>
        <Trainer />
      </ProfileProvider>
    </MemoryRouter>,
  );
}

describe("Trainer ?mode= deep-linking", () => {
  it("opens the PLL recognition trainer from ?mode=pll", () => {
    renderAt("/trainer?mode=pll");
    expect(screen.getByRole("heading", { name: /PLL recognition/i })).toBeInTheDocument();
  });

  it("opens the alg-set trainer from ?mode=algset", () => {
    renderAt("/trainer?mode=algset");
    expect(
      screen.getByRole("heading", { name: /OLL \/ PLL alg trainer/i }),
    ).toBeInTheDocument();
  });

  it("falls back to a known mode for an unrecognised ?mode=", () => {
    renderAt("/trainer?mode=bogus");
    // Cross is the default; its select keeps a valid value rather than crashing.
    expect(screen.getByRole("combobox", { name: /select trainer/i })).toHaveValue("cross");
  });
});
