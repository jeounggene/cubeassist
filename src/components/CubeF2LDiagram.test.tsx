import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import CubeF2LDiagram from "./CubeF2LDiagram";
import { solved } from "../lib/facecube";

describe("CubeF2LDiagram", () => {
  it("renders all six faces (54 stickers)", () => {
    render(<CubeF2LDiagram facelets={solved()} />);
    expect(screen.getByRole("img", { name: /f2l/i })).toBeInTheDocument();
    expect(screen.getAllByTestId("sticker")).toHaveLength(54);
  });

  it("only highlights the given facelets in color", () => {
    render(<CubeF2LDiagram facelets={solved()} highlight={[0, 4, 9]} />);
    const hl = screen
      .getAllByTestId("sticker")
      .filter((el) => el.getAttribute("data-hl") === "1");
    expect(hl).toHaveLength(3);
  });

  it("rotates while dragging and snaps back to the default on release", () => {
    render(<CubeF2LDiagram facelets={solved()} />);
    const img = screen.getByRole("img", { name: /f2l/i });
    const cube = screen.getByTestId("cube");
    const def = cube.style.transform;

    fireEvent.pointerDown(img, { clientX: 0, clientY: 0 });
    fireEvent.pointerMove(window, { clientX: 60, clientY: 0 });
    expect(cube.style.transform).not.toBe(def); // rotated by the drag

    fireEvent.pointerUp(window);
    expect(cube.style.transform).toBe(def); // snapped back
  });
});
