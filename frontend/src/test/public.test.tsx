import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
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
    expect(screen.getByText(/No PDF was submitted/)).toBeInTheDocument();
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
    expect(screen.getByText(/Document integrity was not assessed/)).toBeInTheDocument();
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
    expect(await screen.findByText("Credential verified")).toBeInTheDocument();
    expect(screen.queryByText(/No PDF was submitted/)).not.toBeInTheDocument();
  });
  it("shows holder-only localisation for a PDF supplied through a QR token URL", async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { data: { result: "TAMPERED", tamperAnalysis: {
      analysisAvailable: true, alteredFields: [{ field: "student_name", label: "Holder name", status: "ALTERED" }],
    } } } });
    render(<MemoryRouter initialEntries={["/verify/token/public-token"]}>
      <Routes><Route path="/verify/token/:token" element={<VerifyPage />} /></Routes>
    </MemoryRouter>);
    fireEvent.change(screen.getByLabelText("Certificate PDF (optional)"), {
      target: { files: [new File(["%PDF-1.4\n%%EOF"], "changed.pdf", { type: "application/pdf" })] },
    });
    fireEvent.submit(screen.getByText("Verify now").closest("form")!);
    await waitFor(() => expect(api.post).toHaveBeenCalledWith("/verify/token/public-token/file", expect.any(FormData)));
    const list = await screen.findByRole("list", { name: "Detected alterations" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(1);
    expect(list).toHaveTextContent("Holder name: ALTERED");
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
  it("shows only genuinely ALTERED fields without authoritative values", () => {
    render(<VerificationResult data={{ result: "TAMPERED", tamperAnalysis: {
      analysisAvailable: true, alteredFields: [
        { field: "student_name", label: "Holder name", status: "ALTERED", officialValue: "Private correct name" },
        { field: "institution_name", label: "Institution", status: "NOT_ASSESSABLE" },
        { field: "programme", label: "Programme", status: "UNCHANGED" },
        { field: "classification", label: "Degree classification", status: "NOT_AVAILABLE" },
      ],
    } }} />);
    const list = screen.getByRole("list", { name: "Detected alterations" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(1);
    expect(list).toHaveTextContent("Holder name: ALTERED");
    expect(list).not.toHaveTextContent(/Institution|Programme|classification/);
    expect(screen.queryByText("Private correct name")).not.toBeInTheDocument();
  });
  it("retains the metadata-only fallback without invented semantic changes", () => {
    render(<VerificationResult data={{ result: "TAMPERED", tamperAnalysis: {
      analysisAvailable: true, alteredFields: [], semanticTamperingDetected: false,
      structuralAnalysis: { changes: [{ type: "PDF_METADATA_CHANGED", label: "PDF metadata changed", count: 1 }] },
    } }} />);
    expect(screen.getByText(/no semantic credential field alteration could be localised/)).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Detected alterations" })).not.toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Document structure changes" })).toHaveTextContent("PDF metadata changed");
  });
  it("reports unavailable analysis without claiming any altered field", () => {
    render(<VerificationResult data={{ result: "TAMPERED", tamperAnalysis: { analysisAvailable: false, alteredFields: [] } }} />);
    expect(screen.getByText(/field-level localisation was unavailable/)).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Detected alterations" })).not.toBeInTheDocument();
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


