import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import CubeF2LDiagram from "./CubeF2LDiagram";
import { solved } from "../lib/facecube";

describe("CubeF2LDiagram", () => {
  it("renders three faces (U + F + R = 27 stickers)", () => {
    render(<CubeF2LDiagram facelets={solved()} />);
    expect(screen.getByRole("img", { name: /f2l/i })).toBeInTheDocument();
    expect(screen.getAllByTestId("sticker")).toHaveLength(27);
  });

  it("only highlights the given facelets in color", () => {
    render(<CubeF2LDiagram facelets={solved()} highlight={[0, 4, 9]} />);
    const hl = screen
      .getAllByTestId("sticker")
      .filter((el) => el.getAttribute("data-hl") === "1");
    expect(hl).toHaveLength(3);
  });
});
