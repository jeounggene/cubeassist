import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ProfileProvider } from "../state/ProfileProvider";
import TimerPage from "./TimerPage";

// Deterministic scrambles so we can assert which event is active.
vi.mock("../lib/scramble", () => ({
  generateScramble: () => "U R2 F'",
  generateRUScramble: () => "R U' R2 U",
  generateRULScramble: () => "R U L' R",
}));

function renderPage() {
  return render(
    <ProfileProvider>
      <TimerPage />
    </ProfileProvider>,
  );
}

describe("TimerPage", () => {
  it("defaults to the 3x3 timer", () => {
    renderPage();
    expect(screen.getByRole("heading", { name: /3x3 timer/i })).toBeInTheDocument();
    expect(screen.getByTestId("scramble")).toHaveTextContent("U R2 F'");
  });

  it("switches to the RU (2-gen) timer from the menu", () => {
    renderPage();
    fireEvent.change(screen.getByRole("combobox", { name: /select event/i }), {
      target: { value: "ru" },
    });
    expect(screen.getByRole("heading", { name: /RU \(2-gen\) timer/i })).toBeInTheDocument();
    expect(screen.getByTestId("scramble")).toHaveTextContent("R U' R2 U");
  });

  it("lists only the timer events (no trainer options)", () => {
    renderPage();
    const values = screen
      .getAllByRole("option")
      .map((o) => (o as HTMLOptionElement).value);
    expect(values).toEqual(["3x3", "ru", "rul"]);
  });
});
