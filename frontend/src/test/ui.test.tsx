import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Badge, ConfirmDialog, State } from "../components/ui";
import { DataTable } from "../components/DataTable";

describe("shared accessible UI", () => {
  it.each([
    "active",
    "pending",
    "processing",
    "failed",
    "revoked",
    "verified",
    "unknown",
    "SYSTEM_INCONSISTENCY",
  ])("renders controlled %s badge", (value) => {
    render(<Badge value={value} />);
    expect(
      screen.getByText(value.replaceAll("_", " "), { exact: false })
    ).toBeInTheDocument();
  });
  it("renders loading state", () => {
    render(
      <State loading>
        <p>content</p>
      </State>
    );
    expect(screen.getByRole("status")).toHaveTextContent("Loading");
  });
  it("renders safe error state", () => {
    render(
      <State error={{ message: "Safe message" }}>
        <p>content</p>
      </State>
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Safe message");
  });
  it("renders empty state", () => {
    render(
      <State empty>
        <p>content</p>
      </State>
    );
    expect(screen.getByText("No matching records found.")).toBeInTheDocument();
  });
  it("dialog enters focus, handles Escape, and confirms", () => {
    const confirm = vi.fn();
    const cancel = vi.fn();
    render(
      <ConfirmDialog
        open
        title="Confirm action"
        onCancel={cancel}
        onConfirm={confirm}
      >
        <p>Permanent action</p>
      </ConfirmDialog>
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(screen.getByText("Cancel")).toHaveFocus();
    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(cancel).toHaveBeenCalled();
    fireEvent.click(screen.getByText("Confirm"));
    expect(confirm).toHaveBeenCalled();
  });
  it("dialog traps forward and reverse tab focus", () => {
    render(
      <ConfirmDialog
        open
        title="Confirm action"
        onCancel={() => {}}
        onConfirm={() => {}}
      >
        <p>Permanent action</p>
      </ConfirmDialog>
    );
    const dialog = screen.getByRole("dialog");
    const cancel = screen.getByText("Cancel");
    const confirm = screen.getByText("Confirm");
    confirm.focus();
    fireEvent.keyDown(dialog, { key: "Tab" });
    expect(cancel).toHaveFocus();
    fireEvent.keyDown(dialog, { key: "Tab", shiftKey: true });
    expect(confirm).toHaveFocus();
  });
  it("table renders rows and sortable controls", () => {
    const sort = vi.fn();
    render(
      <DataTable
        tableLabel="Records"
        rows={[{ id: "1", name: "Record" }]}
        columns={[
          { key: "name", label: "Name", sortable: true, render: (r) => r.name },
        ]}
        onSort={sort}
      />
    );
    expect(screen.getByRole("table", { name: "Records" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Sort by Name" }));
    expect(sort).toHaveBeenCalledWith("name");
    expect(screen.getByText("Record")).toBeInTheDocument();
  });
  it("pagination invokes server page changes", () => {
    const page = vi.fn();
    render(
      <DataTable
        tableLabel="Records"
        rows={[{ id: "1" }]}
        columns={[{ key: "id", label: "ID", render: (r) => r.id }]}
        page={2}
        totalPages={3}
        onPage={page}
      />
    );
    fireEvent.click(screen.getByText("Next"));
    expect(page).toHaveBeenCalledWith(3);
  });
});
