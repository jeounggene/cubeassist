import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { solved, applyAlg } from "../lib/facecube";
import CubeView3D from "./CubeView3D";

describe("CubeView3D", () => {
  it("renders one sticker per facelet (54) for a solved cube", () => {
    const { container } = render(<CubeView3D facelets={solved()} />);
    expect(container.querySelectorAll("[data-sticker]").length).toBe(54);
  });

  it("colors the U-center sticker with the U color", () => {
    const { container } = render(<CubeView3D facelets={solved()} />);
    const el = container.querySelector('[data-sticker="4"]') as HTMLElement;
    expect(el).toBeTruthy();
    expect(el.getAttribute("data-color")).toBe("0"); // U center = color id 0
  });

  it("reflects a turned state (a U move changes the U-adjacent stickers)", () => {
    const solvedColors = [...container(solved())];
    const turnedColors = [...container(applyAlg(solved(), "U"))];
    expect(turnedColors).not.toEqual(solvedColors);
  });
});

// Helper: render and read the data-color of every sticker in index order.
function container(facelets: number[]): string[] {
  const { container: c } = render(<CubeView3D facelets={facelets} />);
  return Array.from({ length: 54 }, (_, i) =>
    c.querySelector(`[data-sticker="${i}"]`)!.getAttribute("data-color")!,
  );
}
