import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import LastLayerTrainer from "./LastLayerTrainer";

const cases = [
  { id: "OLL-01", name: "OLL 01", algs: ["R U R' U R U2 R'", "y F R U R' U' F'"] },
  { id: "OLL-02", name: "OLL 02", algs: ["F R U R' U' F'"] },
];

describe("LastLayerTrainer", () => {
  it("shows the first case's algorithm and a case sidebar", () => {
    render(<LastLayerTrainer kind="oll" title="OLL algorithms" cases={cases} />);
    expect(screen.getByRole("heading", { name: /OLL algorithms/i })).toBeInTheDocument();
    expect(screen.getByText("Cases")).toBeInTheDocument();
    expect(screen.getByTestId("algorithm")).toHaveTextContent("R U R' U R U2 R'");
  });

  it("selecting another case updates the algorithm", () => {
    render(<LastLayerTrainer kind="oll" title="OLL" cases={cases} />);
    fireEvent.click(screen.getByRole("button", { name: "OLL 02" }));
    expect(screen.getByTestId("algorithm")).toHaveTextContent("F R U R' U' F'");
  });

  it("hides the algorithm when toggled", () => {
    render(<LastLayerTrainer kind="oll" title="OLL" cases={cases} />);
    fireEvent.click(screen.getByLabelText(/hide algorithm/i));
    expect(screen.queryByTestId("algorithm")).not.toBeInTheDocument();
  });
});
