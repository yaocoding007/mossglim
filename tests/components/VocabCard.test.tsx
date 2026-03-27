import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import VocabCard from "../../src/components/vocab/VocabCard";

const mockVocab = {
  id: 1, word: "fundamental", type: "word" as const,
  definition: "adj. 基本的，根本的", phonetic: "/ˌfʌndəˈmentl/",
  status: "learning" as const, tags: "[]",
  created_at: "2026-03-28", updated_at: "2026-03-28",
};

describe("VocabCard", () => {
  it("renders word and definition", () => {
    render(<VocabCard vocab={mockVocab} sourceCount={3} onClick={() => {}} />);
    expect(screen.getByText("fundamental")).toBeInTheDocument();
    expect(screen.getByText("adj. 基本的，根本的")).toBeInTheDocument();
  });
  it("renders status badge", () => {
    render(<VocabCard vocab={mockVocab} sourceCount={3} onClick={() => {}} />);
    expect(screen.getByText("学习中")).toBeInTheDocument();
  });
  it("renders source count", () => {
    render(<VocabCard vocab={mockVocab} sourceCount={3} onClick={() => {}} />);
    expect(screen.getByText(/3 个来源句子/)).toBeInTheDocument();
  });
});
