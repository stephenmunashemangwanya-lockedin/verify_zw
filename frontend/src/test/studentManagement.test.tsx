import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../api/client";
import { StudentDetail } from "../pages/Management";
vi.mock("../api/client", () => ({
  api: { get: vi.fn(), patch: vi.fn(), post: vi.fn() }, downloadBlob: vi.fn(),
}));
vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ user: { id: "actor", role: "super_admin", institutionId: "inst-1" } }),
}));
const student = {
  id: "student-1",
  student_number: "ST-001",
  full_name: "Student One",
  email: "student@example.test",
  programme: "Engineering",
  institution_id: "inst-1",
  institution_name: "Example Institution",
  created_at: "2026-01-01",
};
const view = () =>
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <MemoryRouter initialEntries={["/app/students/student-1"]}>
        <Routes>
          <Route path="/app/students/:id" element={<StudentDetail />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
describe("student management", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.get).mockImplementation(async (path: string) =>
      path.startsWith("/students/")
        ? { data: { student } }
        : path === "/institutions"
        ? {
            data: {
              institutions: [
                { id: "inst-1", name: "Example Institution" },
                { id: "inst-2", name: "Second Institution" },
              ],
            },
          }
        : ({
            data: { total: 0, pagination: { total: 0 }, credentials: [] },
          } as never)
    );
    vi.mocked(api.patch).mockResolvedValue({
      data: { message: "Student updated." },
    });
  });
  it("shows detail, credential summary, and prepopulated edit fields", async () => {
    view();
    expect(await screen.findByDisplayValue("Student One")).toBeInTheDocument();
    expect(screen.getAllByText("Example Institution").length).toBeGreaterThan(0);
    expect(screen.getByText("Related credentials")).toBeInTheDocument();
  });
  it("submits the whitelisted student identity fields", async () => {
    view();
    const name = await screen.findByDisplayValue("Student One");
    fireEvent.change(name, { target: { value: "Changed Student" } });
    fireEvent.click(screen.getByText("Save student"));
    await waitFor(() =>
      expect(api.patch).toHaveBeenCalledWith("/students/student-1", {
        studentNumber: "ST-001",
        fullName: "Changed Student",
        email: "student@example.test",
        programme: "Engineering",
      })
    );
  });
  it("uses institution names and confirms safe reassignment", async () => {
    view();
    const selector = await screen.findByLabelText("Reassign institution");
    fireEvent.change(selector, { target: { value: "inst-2" } });
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Confirm"));
    await waitFor(() =>
      expect(api.patch).toHaveBeenCalledWith(
        "/students/student-1/institution",
        { institutionId: "inst-2" }
      )
    );
  });
  it("shows controlled backend conflict messages", async () => {
    vi.mocked(api.patch).mockRejectedValue({
      message: "A student with credential history cannot be reassigned.",
    });
    view();
    fireEvent.change(await screen.findByLabelText("Reassign institution"), {
      target: { value: "inst-2" },
    });
    fireEvent.click(screen.getByText("Confirm"));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      /credential history/
    );
  });
});
