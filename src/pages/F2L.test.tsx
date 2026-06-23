import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import F2L from "./F2L";

beforeEach(() => {
  vi.spyOn(performance, "now").mockImplementation(() => 0);
});
afterEach(() => vi.restoreAllMocks());

describe("F2L", () => {
  it("shows the Feliks set with a setup and algorithm by default", () => {
    render(<F2L />);
    expect(screen.getByRole("heading", { level: 1, name: /feliks/i })).toBeInTheDocument();
    expect(screen.getByTestId("setup").textContent?.length).toBeGreaterThan(0);
    expect(screen.getByTestId("algorithm")).toBeInTheDocument();
  });

  it("switches the algorithm set with the dropdown", () => {
    render(<F2L />);
    fireEvent.change(screen.getByRole("combobox", { name: /algorithm set/i }), {
      target: { value: "speedcubedb" },
    });
    expect(screen.getByRole("heading", { level: 1, name: /speedcubedb/i })).toBeInTheDocument();
    expect(screen.getByTestId("algorithm")).toBeInTheDocument();
  });

  it("hides the algorithm when 'Hide algorithm' is checked", () => {
    render(<F2L />);
    fireEvent.click(screen.getByLabelText(/hide algorithm/i));
    expect(screen.queryByTestId("algorithm")).not.toBeInTheDocument();
  });

  it("shows the case-list sidebar with the cases", () => {
    render(<F2L />);
    expect(screen.getByText("Cases")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "F2L case 1" })).toBeInTheDocument();
  });
});
