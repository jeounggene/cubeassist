import { describe, it, expect } from "vitest";
import { mean, avgOfLast } from "./stats";

describe("mean", () => {
  it("averages the numbers", () => {
    expect(mean([2, 4, 6])).toBe(4);
  });
});

describe("avgOfLast", () => {
  it("returns — until n samples exist", () => {
    expect(avgOfLast([1, 2], 5)).toBe("—");
  });

  it("averages the last n samples, rounded to 2 decimals", () => {
    expect(avgOfLast([100, 1, 2, 3, 4, 5], 5)).toBe("3.00");
  });
});
