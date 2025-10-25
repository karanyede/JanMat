import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import LoadingSpinner from "../../components/LoadingSpinner";

describe("LoadingSpinner Component", () => {
  it("renders loading spinner", () => {
    render(<LoadingSpinner />);

    // Check for the spinner element by text
    const spinner = screen.getByText(/loading janmat/i);
    expect(spinner).toBeInTheDocument();
  });

  it("displays correct loading text", () => {
    render(<LoadingSpinner />);

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it("has correct styling classes", () => {
    const { container } = render(<LoadingSpinner />);

    const spinnerElement = container.querySelector(".animate-spin");
    expect(spinnerElement).toBeInTheDocument();
  });
});
