import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ProfileProvider } from "../state/ProfileProvider";
import TrainerCross from "./TrainerCross";

// Keep tests fast and deterministic: stub scramble + cross helpers.
vi.mock("../lib/scramble", () => ({
  generateCrossScramble: () => "R U2 F' D",
}));
vi.mock("../lib/cross", () => ({
  solveCross: () => "D' F R'",
  optimalCrossLength: () => 4,
}));

let now = 0;
beforeEach(() => {
  now = 0;
  vi.spyOn(performance, "now").mockImplementation(() => now);
});
afterEach(() => vi.restoreAllMocks());

function renderTrainer() {
  return render(
    <ProfileProvider>
      <TrainerCross />
    </ProfileProvider>,
  );
}

describe("TrainerCross", () => {
  it("renders a scramble", () => {
    renderTrainer();
    expect(screen.getByTestId("scramble")).toHaveTextContent("R U2 F' D");
  });

  it("hides the optimal solution button before any solve", () => {
    renderTrainer();
    expect(
      screen.queryByRole("button", { name: /show optimal solution/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId("solution")).not.toBeInTheDocument();
  });

  it("changing difficulty regenerates a scramble", () => {
    renderTrainer();
    fireEvent.click(screen.getByRole("button", { name: "6" }));
    expect(screen.getByTestId("scramble")).toHaveTextContent("R U2 F' D");
  });
});
