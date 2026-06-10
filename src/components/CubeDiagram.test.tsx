import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import CubeDiagram from "./CubeDiagram";

describe("CubeDiagram", () => {
  it("defaults to the white cross", () => {
    render(<CubeDiagram />);
    expect(screen.getByRole("img", { name: /white cross/i })).toBeInTheDocument();
    expect(screen.getByText("white cross")).toBeInTheDocument();
  });

  it("labels the diagram by the given cross color name", () => {
    render(<CubeDiagram color="green" />);
    expect(screen.getByRole("img", { name: /green cross/i })).toBeInTheDocument();
    expect(screen.getByText("green cross")).toBeInTheDocument();
  });
});
