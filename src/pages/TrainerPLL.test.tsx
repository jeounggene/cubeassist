import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import TrainerPLL from "./TrainerPLL";
import { PLL_NAMES } from "../lib/pll";

// Math.random -> 0 makes the first case (Aa) and the empty AUF deterministic.
function renderQuiz() {
  vi.spyOn(Math, "random").mockReturnValue(0);
  return render(<TrainerPLL />);
}

afterEach(() => vi.restoreAllMocks());

describe("TrainerPLL", () => {
  it("shows a PLL diagram and a button for every PLL name", () => {
    renderQuiz();
    expect(screen.getByRole("img", { name: /pll case/i })).toBeInTheDocument();
    for (const name of PLL_NAMES) {
      expect(screen.getByRole("button", { name })).toBeInTheDocument();
    }
  });

  it("marks a correct answer and counts it", () => {
    renderQuiz();
    fireEvent.click(screen.getByRole("button", { name: "Aa" }));
    expect(screen.getByTestId("result")).toHaveTextContent(/correct/i);
    expect(screen.getByTestId("stat-correct")).toHaveTextContent("1");
    expect(screen.getByTestId("stat-total")).toHaveTextContent("1");
    expect(screen.getByTestId("stat-streak")).toHaveTextContent("1");
  });

  it("marks a wrong answer, reveals the right one, and resets the streak", () => {
    renderQuiz();
    fireEvent.click(screen.getByRole("button", { name: "Ab" }));
    const result = screen.getByTestId("result");
    expect(result).toHaveTextContent(/incorrect/i);
    expect(result).toHaveTextContent("Aa"); // reveals the correct answer
    expect(screen.getByTestId("stat-correct")).toHaveTextContent("0");
    expect(screen.getByTestId("stat-total")).toHaveTextContent("1");
    expect(screen.getByTestId("stat-streak")).toHaveTextContent("0");
  });

  it("does not change the verdict once answered", () => {
    renderQuiz();
    fireEvent.click(screen.getByRole("button", { name: "Aa" }));
    fireEvent.click(screen.getByRole("button", { name: "Ab" }));
    expect(screen.getByTestId("result")).toHaveTextContent(/correct/i);
    expect(screen.getByTestId("stat-total")).toHaveTextContent("1");
  });

  it("advances to a new prompt on Next, clearing the verdict", () => {
    renderQuiz();
    fireEvent.click(screen.getByRole("button", { name: "Aa" }));
    expect(screen.getByTestId("result")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    expect(screen.queryByTestId("result")).not.toBeInTheDocument();
  });

  describe("letter-only mode", () => {
    function enableLetterMode() {
      renderQuiz();
      fireEvent.click(screen.getByRole("checkbox", { name: /letter only/i }));
    }

    it("shows family letters instead of specific cases", () => {
      enableLetterMode();
      expect(screen.getByRole("button", { name: "A" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "G" })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Aa" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Ga" })).not.toBeInTheDocument();
    });

    it("accepts the family letter for an Aa case", () => {
      enableLetterMode();
      fireEvent.click(screen.getByRole("button", { name: "A" }));
      expect(screen.getByTestId("result")).toHaveTextContent(/correct/i);
      expect(screen.getByTestId("stat-correct")).toHaveTextContent("1");
    });

    it("rejects the wrong letter and still reveals the specific case", () => {
      enableLetterMode();
      fireEvent.click(screen.getByRole("button", { name: "E" }));
      expect(screen.getByTestId("result")).toHaveTextContent(/incorrect/i);
      expect(screen.getByText(/Aa perm/i)).toBeInTheDocument();
      expect(screen.getByTestId("stat-correct")).toHaveTextContent("0");
    });
  });

  describe("3D view", () => {
    it("swaps the flat diagram for a rotating cube and still grades answers", () => {
      renderQuiz();
      fireEvent.click(screen.getByRole("checkbox", { name: /3d view/i }));
      expect(screen.getByRole("img", { name: /cube/i })).toBeInTheDocument();
      expect(screen.queryByRole("img", { name: /pll case/i })).not.toBeInTheDocument();
      // Recognition logic is independent of how the case is drawn.
      fireEvent.click(screen.getByRole("button", { name: "Aa" }));
      expect(screen.getByTestId("result")).toHaveTextContent(/correct/i);
    });
  });
});
