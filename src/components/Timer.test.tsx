import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Timer from "./Timer";

let now = 0;

beforeEach(() => {
  now = 0;
  vi.spyOn(performance, "now").mockImplementation(() => now);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Timer (inspection off)", () => {
  it("hold -> ready -> start -> stop yields a positive time", () => {
    const onComplete = vi.fn();
    render(<Timer inspection={false} useMs={false} onComplete={onComplete} readyHoldMs={0} />);

    fireEvent.keyDown(window, { code: "Space" }); // begin hold; readyHoldMs=0 => ready
    now = 1000;
    fireEvent.keyUp(window, { code: "Space" }); // start running at t=1000
    now = 4500;
    fireEvent.keyDown(window, { code: "Space" }); // stop at t=4500

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete.mock.calls[0][0]).toBeCloseTo(3.5, 3);
    expect(screen.getByTestId("timer-display")).toHaveTextContent("3.50");
  });

  it("releasing Space before ready is a false start (no time recorded)", () => {
    const onComplete = vi.fn();
    render(<Timer inspection={false} useMs={false} onComplete={onComplete} readyHoldMs={550} />);

    fireEvent.keyDown(window, { code: "Space" }); // holding, not yet ready
    fireEvent.keyUp(window, { code: "Space" }); // released too early
    expect(onComplete).not.toHaveBeenCalled();
  });
});
