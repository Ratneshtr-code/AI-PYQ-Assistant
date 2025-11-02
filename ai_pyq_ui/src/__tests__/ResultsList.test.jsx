import { render, screen, fireEvent } from "@testing-library/react";
import ResultsList from "../components/ResultsList";

const mockResults = [
  {
    question_id: 1,
    question_text: "What is 2 + 2?",
    option_a: "3",
    option_b: "4",
    option_c: "5",
    option_d: "6",
    correct_option: "4",
  },
];

describe("ResultsList Component", () => {
  test("renders question text", () => {
    render(<ResultsList results={mockResults} />);
    expect(screen.getByText(/What is 2 \+ 2/i)).toBeInTheDocument();
  });

  test("toggles answer visibility", () => {
    render(<ResultsList results={mockResults} />);
    const showButton = screen.getByText(/Show Answer/i);
    fireEvent.click(showButton);
    expect(screen.getByText(/Correct Answer/i)).toBeInTheDocument();
    fireEvent.click(screen.getByText(/Hide Answer/i));
    expect(screen.queryByText(/Correct Answer/i)).toBeNull();
  });
});
