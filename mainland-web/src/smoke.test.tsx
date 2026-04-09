import { expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import { App } from "./App";

test("renders mainland site shell", () => {
  render(<App />);
  expect(screen.getByText("QUESTION FLOW")).toBeInTheDocument();
});
