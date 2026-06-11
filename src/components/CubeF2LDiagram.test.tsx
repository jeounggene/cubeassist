import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import CubeF2LDiagram from "./CubeF2LDiagram";
import { solved } from "../lib/facecube";

describe("CubeF2LDiagram", () => {
  it("renders the full top-layer view with 21 stickers", () => {
    render(<CubeF2LDiagram facelets={solved()} />);
    expect(screen.getByRole("img", { name: /f2l/i })).toBeInTheDocument();
    expect(screen.getAllByTestId("sticker")).toHaveLength(21);
  });
});
