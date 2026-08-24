import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api, downloadBlob } from "../api/client";
import { CreatePage, CredentialDetail } from "../pages/Management";
vi.mock("../api/client", () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn() },
  downloadBlob: vi.fn(),
}));
vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "actor", role: "super_admin", institutionId: null },
  }),
}));
const detail = {
  id: "credential-1",
  status: "active",
  student_name: "Example Student",
  student_number: "ST-001",
  institution_name: "Example Institution",
  qualification: "Diploma",
  issue_date: "2026-01-01",
  certificate_hash: "a".repeat(64),
  ipfs_cid: "QmSafe",
  blockchain_tx: "0xsafe",
  blockchain_network: "localhost",
  contract_address: "0xcontract",
  block_number: 1,
  qr_code_path: "/generated/qr/safe.png",
};
const wrapper = (
  node: React.ReactNode,
  entry = "/app/credentials/credential-1"
) => (
  <QueryClientProvider
    client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
  >
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/app/credentials/:id" element={node} />
        <Route path="/app/credentials/new" element={node} />
      </Routes>
    </MemoryRouter>
  </QueryClientProvider>
);
describe("credential management", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("VITE_IPFS_GATEWAY", "https://ipfs.example.test/ipfs");
    vi.mocked(api.get).mockImplementation(async (path: string) =>
      path.startsWith("/credentials/")
        ? { data: { credential: detail } }
        : path === "/institutions"
        ? {
            data: {
              institutions: [{ id: "inst-1", name: "Example Institution" }],
            },
          }
        : path === "/students"
        ? {
            data: {
              students: [
                {
                  id: "student-1",
                  full_name: "Example Student",
                  student_number: "ST-001",
                },
              ],
            },
          }
        : ({ data: {} } as never)
    );
    vi.mocked(api.post).mockResolvedValue({ data: { success: true } });
    vi.mocked(api.patch).mockResolvedValue({
      data: { credential: { ...detail, status: "revoked" } },
    });
  });
  it("renders human-readable detail and safe evidence links", async () => {
    render(wrapper(<CredentialDetail />));
    expect(await screen.findByText("Example Student")).toBeInTheDocument();
    expect(screen.getByText("Example Institution")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /IPFS evidence/i })
    ).toHaveAttribute("rel", "noopener noreferrer");
    expect(screen.getByAltText(/verification QR/i)).toBeInTheDocument();
  });
  it("downloads the generated presentation PDF through authenticated API", async () => {
    render(wrapper(<CredentialDetail />));
    fireEvent.click(await screen.findByText(/Download presentation PDF/i));
    await waitFor(() =>
      expect(downloadBlob).toHaveBeenCalledWith(
        "/credentials/credential-1/pdf",
        "credential-credential-1.pdf"
      )
    );
  });
  it("shows safe missing PDF errors", async () => {
    vi.mocked(downloadBlob).mockRejectedValue({
      message: "Presentation certificate is unavailable.",
    });
    render(wrapper(<CredentialDetail />));
    fireEvent.click(await screen.findByText(/Download presentation PDF/i));
    expect(await screen.findByRole("alert")).toHaveTextContent(/unavailable/i);
  });
  it("uses institution and bounded student selectors instead of raw UUID fields", async () => {
    render(wrapper(<CreatePage kind="credentials" />, "/app/credentials/new"));
    expect(await screen.findByText("Example Institution")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Institution"), {
      target: { value: "inst-1" },
    });
    expect(
      await screen.findByText(/Example Student.*ST-001/)
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Student ID")).not.toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith("/students", {
      params: expect.objectContaining({ page: 1, limit: 20 }),
    });
  });
  it("requires revocation confirmation and refreshes through query invalidation", async () => {
    render(wrapper(<CredentialDetail />));
    fireEvent.click(await screen.findByText("Revoke credential"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Revocation reason"), {
      target: { value: "Issued in error" },
    });
    fireEvent.click(screen.getByText("Confirm"));
    await waitFor(() =>
      expect(api.patch).toHaveBeenCalledWith(
        "/credentials/credential-1/revoke",
        { reason: "Issued in error" }
      )
    );
  });
});
