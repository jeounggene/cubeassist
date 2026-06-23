import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import TrainerAlgSet from "./TrainerAlgSet";

afterEach(() => vi.restoreAllMocks());

describe("TrainerAlgSet", () => {
  it("renders OLL and PLL selection chips and a scramble by default", () => {
    render(<TrainerAlgSet />);
    expect(screen.getByRole("button", { name: "OLL 01" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "PLL Aa perm" })).toBeInTheDocument();
    expect(screen.getByTestId("scramble").textContent?.trim()).not.toBe("");
  });

  it("prompts and shows no scramble when nothing is selected", () => {
    render(<TrainerAlgSet />);
    fireEvent.click(screen.getByRole("button", { name: /clear oll/i }));
    fireEvent.click(screen.getByRole("button", { name: /clear pll/i }));
    expect(screen.getByText(/select at least one case/i)).toBeInTheDocument();
    expect(screen.queryByTestId("scramble")).not.toBeInTheDocument();
  });

  it("only ever deals cases from the selected pool", () => {
    render(<TrainerAlgSet />);
    fireEvent.click(screen.getByRole("button", { name: /clear oll/i }));
    fireEvent.click(screen.getByRole("button", { name: /clear pll/i }));
    // Select a single case: every scramble must now be that case.
    fireEvent.click(screen.getByRole("button", { name: "PLL Aa perm" }));
    fireEvent.click(screen.getByRole("button", { name: /reveal/i }));
    expect(screen.getByTestId("reveal-name")).toHaveTextContent("PLL Aa perm");

    // Next stays within the (size-1) pool.
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    fireEvent.click(screen.getByRole("button", { name: /reveal/i }));
    expect(screen.getByTestId("reveal-name")).toHaveTextContent("PLL Aa perm");
  });

  it("hides the case name until revealed", () => {
    render(<TrainerAlgSet />);
    fireEvent.click(screen.getByRole("button", { name: /clear oll/i }));
    fireEvent.click(screen.getByRole("button", { name: /clear pll/i }));
    fireEvent.click(screen.getByRole("button", { name: "PLL Ja perm" }));
    expect(screen.queryByTestId("reveal-name")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /reveal/i }));
    expect(screen.getByTestId("reveal-name")).toHaveTextContent("PLL Ja perm");
  });

  it("groups the OLL picker by named shape", () => {
    render(<TrainerAlgSet />);
    expect(screen.getByText("Fish")).toBeInTheDocument();
    expect(screen.getByText("Square")).toBeInTheDocument();
    expect(screen.getByText("OCLL")).toBeInTheDocument();
  });

  it("a shape header selects that whole shape group", () => {
    render(<TrainerAlgSet />);
    fireEvent.click(screen.getByRole("button", { name: /clear oll/i }));
    fireEvent.click(screen.getByRole("button", { name: /clear pll/i }));
    // The Square group is OLL 05 + 06; clicking its header selects both.
    fireEvent.click(screen.getByRole("button", { name: /^Square/ }));
    expect(screen.getByRole("button", { name: "OLL 05" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "OLL 06" })).toHaveAttribute("aria-pressed", "true");
    // ...and nothing outside the group.
    expect(screen.getByRole("button", { name: "OLL 01" })).toHaveAttribute("aria-pressed", "false");
  });

  it("Select all OLL restores the OLL pool", () => {
    render(<TrainerAlgSet />);
    fireEvent.click(screen.getByRole("button", { name: /clear oll/i }));
    fireEvent.click(screen.getByRole("button", { name: /clear pll/i }));
    expect(screen.queryByTestId("scramble")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /select all oll/i }));
    expect(screen.getByTestId("scramble").textContent?.trim()).not.toBe("");
  });
});
