import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  VerifyPage,
  VerificationResult,
  Landing,
  NotFound,
} from "../pages/PublicPages";
import { api } from "../api/client";
vi.mock("../api/client", () => ({ api: { get: vi.fn(), post: vi.fn() } }));

describe("public experience", () => {
  beforeEach(() => vi.clearAllMocks());
  it("renders landing call to action", () => {
    render(
      <MemoryRouter>
        <Landing />
      </MemoryRouter>
    );
    expect(
      screen.getByRole("link", { name: /verify a credential/i })
    ).toHaveAttribute("href", "/verify");
  });
  it("verifies by hash using the existing API path", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: { data: { outcome: "VERIFIED" } },
    });
    render(
      <MemoryRouter>
        <VerifyPage />
      </MemoryRouter>
    );
    fireEvent.change(screen.getByLabelText(/SHA-256/), {
      target: { value: "a".repeat(64) },
    });
    fireEvent.click(screen.getByText("Verify now"));
    await waitFor(() =>
      expect(api.get).toHaveBeenCalledWith(`/verify/hash/${"a".repeat(64)}`)
    );
    expect(await screen.findByText("Credential verified")).toBeInTheDocument();
  });
  it("verifies by credential ID", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: { data: { outcome: "UNKNOWN" } },
    });
    render(
      <MemoryRouter>
        <VerifyPage />
      </MemoryRouter>
    );
    fireEvent.click(screen.getByRole("tab", { name: "Credential ID" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Credential ID" }), {
      target: { value: "abc" },
    });
    fireEvent.click(screen.getByText("Verify now"));
    await waitFor(() =>
      expect(api.get).toHaveBeenCalledWith("/verify/credential/abc")
    );
  });
  it("supports arrow-key navigation between verification tabs", () => {
    render(
      <MemoryRouter>
        <VerifyPage />
      </MemoryRouter>
    );
    const hash = screen.getByRole("tab", { name: /hash/i });
    hash.focus();
    fireEvent.keyDown(hash, { key: "ArrowRight" });
    expect(screen.getByRole("tab", { name: "Credential ID" })).toHaveFocus();
    expect(screen.getByRole("tabpanel")).toHaveAccessibleName("Credential ID");
  });
  it("loads QR/public token URL", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: { data: { outcome: "REVOKED" } },
    });
    render(
      <MemoryRouter initialEntries={["/verify/token/public-token"]}>
        <Routes>
          <Route path="/verify/token/:token" element={<VerifyPage />} />
        </Routes>
      </MemoryRouter>
    );
    fireEvent.click(screen.getByText("Verify now"));
    await waitFor(() =>
      expect(api.get).toHaveBeenCalledWith("/verify/token/public-token")
    );
    expect(await screen.findByText("Credential revoked")).toBeInTheDocument();
  });
  it("uploads PDF as multipart form data", async () => {
    vi.mocked(api.post).mockResolvedValue({
      data: { data: { outcome: "VERIFIED" } },
    });
    render(
      <MemoryRouter>
        <VerifyPage />
      </MemoryRouter>
    );
    fireEvent.click(screen.getByRole("tab", { name: /pdf only/i }));
    const file = new File(["%PDF-1.4`n%%EOF"], "award.pdf", { type: "application/pdf" });
    fireEvent.change(screen.getByLabelText("Certificate PDF"), {
      target: { files: [file] },
    });

    const verifyButton = screen.getByText("Verify now");
    const form = verifyButton.closest("form");

    expect(form).not.toBeNull();
    fireEvent.submit(form!);

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith(
        "/verify/file",
        expect.any(FormData)
      )
    );
  });
  it("rejects unsafe uploads before API submission", async () => {
    render(
      <MemoryRouter>
        <VerifyPage />
      </MemoryRouter>
    );
    fireEvent.click(screen.getByRole("tab", { name: /pdf only/i }));
    const fileInput = screen.getByLabelText(
      "Certificate PDF"
    ) as HTMLInputElement;

    expect(fileInput).toHaveAttribute(
      "accept",
      "application/pdf"
    );

    const unsafeFile = new File(
      ["not-a-pdf"],
      "bad.txt",
      {
        type: "text/plain",
      }
    );

    fireEvent.change(fileInput, {
      target: {
        files: [unsafeFile],
      },
    });

    fireEvent.click(
      screen.getByText("Verify now")
    );

    expect(api.post).not.toHaveBeenCalled();
  });
  it.each([
    "VERIFIED",
    "REVOKED",
    "UNKNOWN",
    "PENDING",
    "FAILED",
    "SYSTEM_INCONSISTENCY",
  ])("renders controlled %s outcome", (outcome) => {
    render(<VerificationResult data={{ outcome }} />);
    expect(
      screen.getAllByText(outcome.replaceAll("_", " "), { exact: false }).length
    ).toBeGreaterThan(0);
  });
  it("does not render sensitive verification fields", () => {
    render(
      <VerificationResult
        data={{
          outcome: "VERIFIED",
          certificate_hash: "secret-hash",
          public_token: "secret-token",
          processing_error: "provider stack",
        }}
      />
    );
    expect(
      screen.queryByText(/secret-hash|secret-token|provider stack/)
    ).not.toBeInTheDocument();
  });
  it("renders a usable 404 page", () => {
    render(
      <MemoryRouter>
        <NotFound />
      </MemoryRouter>
    );
    expect(
      screen.getByRole("heading", { name: "Page not found" })
    ).toBeInTheDocument();
  });
});
