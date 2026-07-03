import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ProfileProvider } from "../state/ProfileProvider";
import Coach from "./Coach";

function renderAt(path: string) {
  return render(
    <ProfileProvider>
      <MemoryRouter initialEntries={[path]}>
        <Coach />
      </MemoryRouter>
    </ProfileProvider>,
  );
}

describe("Coach page", () => {
  it("shows the connect prompt when no smart cube is available", () => {
    renderAt("/coach");
    expect(screen.getByText(/smart cube/i)).toBeInTheDocument();
  });

  it("shows a live session when the simulator is enabled", () => {
    renderAt("/coach?sim=1");
    expect(screen.getByTestId("scramble")).toBeInTheDocument();
    // Coach report region is present (warm-up message with too few solves).
    expect(screen.getByTestId("coach-report")).toBeInTheDocument();
  });
});
