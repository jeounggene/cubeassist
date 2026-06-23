import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ProfileProvider } from "../state/ProfileProvider";
import TrainingPlan from "./TrainingPlan";

beforeEach(() => localStorage.clear());

function renderPlan() {
  return render(
    <MemoryRouter>
      <ProfileProvider>
        <TrainingPlan />
      </ProfileProvider>
    </MemoryRouter>,
  );
}

describe("TrainingPlan", () => {
  it("shows four daily tasks, each with a clickable link", () => {
    renderPlan();
    expect(screen.getAllByRole("checkbox")).toHaveLength(4);
    expect(screen.getByRole("link", { name: /open OLL algorithms/i })).toHaveAttribute(
      "href",
      "/algorithms/oll",
    );
    expect(screen.getByRole("link", { name: /open PLL algorithms/i })).toHaveAttribute(
      "href",
      "/algorithms/pll",
    );
    expect(screen.getByRole("link", { name: /cross trainer/i })).toHaveAttribute(
      "href",
      "/trainer?mode=cross",
    );
  });

  it("advances the streak once every task is checked", () => {
    renderPlan();
    expect(screen.getByTestId("streak")).toHaveTextContent(/no streak/i);
    screen.getAllByRole("checkbox").forEach((cb) => fireEvent.click(cb));
    expect(screen.getByTestId("streak")).toHaveTextContent("1");
  });

  it("marking an OLL known updates the count and persists as pressed", () => {
    renderPlan();
    expect(screen.getByTestId("oll-count")).toHaveTextContent("0/57");
    fireEvent.click(screen.getByRole("button", { name: "OLL 01" }));
    expect(screen.getByTestId("oll-count")).toHaveTextContent("1/57");
    expect(screen.getByRole("button", { name: "OLL 01" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("reshapes the plan as cases become known (next OLL to learn advances)", () => {
    renderPlan();
    // Fresh profile: the OLL task should offer #01 first.
    expect(screen.getByLabelText(/learn 2 new oll/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "OLL 01" }));
    fireEvent.click(screen.getByRole("button", { name: "OLL 02" }));
    // Now #01/#02 are known; the task detail should have moved on.
    expect(screen.getByText(/next: #03, #04/i)).toBeInTheDocument();
  });
});
