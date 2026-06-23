import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import OLL2Look from "./OLL2Look";

describe("OLL2Look", () => {
  it("shows the make-the-cross step and only the corner cases in the picker", () => {
    render(<OLL2Look />);
    expect(screen.getByRole("heading", { name: /make the yellow cross/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /orient the corners/i })).toBeInTheDocument();
    // The three cross shapes are listed.
    expect(screen.getByText("Dot")).toBeInTheDocument();
    expect(screen.getByText("Line")).toBeInTheDocument();
    // The corner (OCLL) cases are in the picker...
    expect(screen.getByRole("button", { name: "2-look OLL — Sune (OCLL)" })).toBeInTheDocument();
    // ...but the edge cases are not (they live in step 1, not the picker).
    expect(screen.queryByRole("button", { name: /EO dot/i })).not.toBeInTheDocument();
  });
});
