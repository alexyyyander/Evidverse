import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// Ensure mounted trees are unmounted between tests to avoid leaked timers/subscriptions.
afterEach(() => {
  cleanup();
});
