import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import App from "../App";
import { LazyRouteBoundary } from "../routes/LazyRouteBoundary";

vi.mock("../api/client", () => ({
  api: {
    get: vi.fn(async () => ({ data: { data: { totalCredentials: 1 } } })),
    post: vi.fn(),
    patch: vi.fn(),
  },
  downloadBlob: vi.fn(),
}));
vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({
    user: {
      id: "actor",
      fullName: "Example Administrator",
      role: "super_admin",
      institutionId: null,
    },
    loading: false,
    login: vi.fn(),
    logout: vi.fn(),
  }),
}));

describe("lazy route boundaries", () => {
  it("preserves the eager public landing route", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>
    );
    expect(
      screen.getByRole("heading", { name: "Credentials Zimbabwe can trust." })
    ).toBeInTheDocument();
  });

  it("loads the login route from its authentication chunk", async () => {
    render(
      <MemoryRouter initialEntries={["/login"]}>
        <App />
      </MemoryRouter>
    );
    expect(
      await screen.findByRole("heading", { name: "Welcome back" })
    ).toBeInTheDocument();
  });

  it("loads the authenticated dashboard and keeps navigation labels", async () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter initialEntries={["/app"]}>
          <App />
        </MemoryRouter>
      </QueryClientProvider>
    );
    expect(
      await screen.findByRole(
        "heading",
        { name: "Dashboard" },
        { timeout: 5000 }
      )
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Credentials" })).toHaveAttribute(
      "href",
      "/app/credentials"
    );
  });

  it("shows the existing loading treatment while a route module resolves", () => {
    const Pending = () => {
      throw new Promise(() => undefined);
    };
    render(
      <MemoryRouter>
        <LazyRouteBoundary>
          <Pending />
        </LazyRouteBoundary>
      </MemoryRouter>
    );
    expect(screen.getByRole("status")).toHaveTextContent("Loading");
  });

  it("turns a lazy import failure into a controlled page error", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const Broken = () => {
      throw new Error("chunk unavailable");
    };
    render(
      <MemoryRouter>
        <LazyRouteBoundary>
          <Broken />
        </LazyRouteBoundary>
      </MemoryRouter>
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Unable to load this page. Please refresh and try again."
    );
  });
});
