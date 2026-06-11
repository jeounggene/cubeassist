import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ProfileProvider } from "../state/ProfileProvider";
import TrainerF2L from "./TrainerF2L";

let now = 0;
beforeEach(() => {
  now = 0;
  vi.spyOn(performance, "now").mockImplementation(() => now);
});
afterEach(() => vi.restoreAllMocks());

function renderF2L() {
  return render(
    <ProfileProvider>
      <TrainerF2L />
    </ProfileProvider>,
  );
}

describe("TrainerF2L", () => {
  it("shows a setup scramble and the algorithm by default", () => {
    renderF2L();
    expect(screen.getByTestId("setup").textContent?.length).toBeGreaterThan(0);
    expect(screen.getByTestId("algorithm")).toBeInTheDocument();
  });

  it("hides the algorithm when 'Hide algorithm until solve' is checked", () => {
    renderF2L();
    fireEvent.click(screen.getByLabelText(/hide algorithm until solve/i));
    expect(screen.queryByTestId("algorithm")).not.toBeInTheDocument();
  });

  it("selecting a different case changes the setup scramble", () => {
    renderF2L();
    const before = screen.getByTestId("setup").textContent;
    const caseButtons = screen.getAllByRole("button", { name: /^F2L case \d+$/ });
    fireEvent.click(caseButtons[caseButtons.length - 1]);
    expect(screen.getByTestId("setup").textContent).not.toBe(before);
  });
});
