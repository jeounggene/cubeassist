import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProfileProvider } from "../state/ProfileProvider";
import Profile from "./Profile";

function renderProfile() {
  return render(
    <ProfileProvider>
      <Profile />
    </ProfileProvider>,
  );
}

describe("Profile page — times", () => {
  it("renders an input for each stage", () => {
    renderProfile();
    expect(screen.getByLabelText(/^cross time$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^f2l time$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^oll time$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^pll time$/i)).toBeInTheDocument();
  });

  it("records a time and displays the new average", async () => {
    const user = userEvent.setup();
    renderProfile();
    const input = screen.getByLabelText(/^pll time$/i) as HTMLInputElement;
    await user.type(input, "3.0");
    await user.click(screen.getByRole("button", { name: /add pll time/i }));

    await user.clear(input);
    await user.type(input, "4.0");
    await user.click(screen.getByRole("button", { name: /add pll time/i }));

    expect(screen.getByTestId("pll-avg")).toHaveTextContent("3.50");
  });
});

describe("Profile page — checklists", () => {
  it("renders sections for each algorithm list", () => {
    renderProfile();
    expect(screen.getByRole("heading", { name: /^f2l$/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /2-look oll/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /2-look pll/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^oll$/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^pll$/i })).toBeInTheDocument();
  });

  it("renders a checkbox for every PLL case (21 total)", () => {
    renderProfile();
    const region = screen.getByRole("region", { name: /^pll$/i });
    const checkboxes = region.querySelectorAll("input[type='checkbox']");
    expect(checkboxes).toHaveLength(21);
  });

  it("toggling a checkbox updates the profile", async () => {
    const user = userEvent.setup();
    renderProfile();
    const box = screen.getByRole("checkbox", { name: /pll t perm/i });
    expect(box).not.toBeChecked();
    await user.click(box);
    expect(box).toBeChecked();
  });
});
