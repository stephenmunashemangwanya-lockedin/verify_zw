import type { ReactNode } from "react";
import { Button, State } from "./ui";
export interface Column<T> {
  key: string;
  label: string;
  render: (row: T) => ReactNode;
  sortable?: boolean;
}
export function DataTable<T extends { id?: string }>({
  rows,
  columns,
  loading,
  error,
  page = 1,
  totalPages = 1,
  tableLabel,
  onPage,
  onSort,
}: {
  rows: T[];
  columns: Column<T>[];
  loading?: boolean;
  error?: unknown;
  page?: number;
  totalPages?: number;
  tableLabel: string;
  onPage?: (p: number) => void;
  onSort?: (k: string) => void;
}) {
  return (
    <State loading={loading} error={error} empty={!rows.length}>
      <div className="table-wrap">
        <table aria-label={tableLabel}>
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.key} scope="col">
                  {c.sortable ? (
                    <button
                      className="sort"
                      aria-label={`Sort by ${c.label}`}
                      onClick={() => onSort?.(c.key)}
                    >
                      {c.label} ↕
                    </button>
                  ) : (
                    c.label
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id || i}>
                {columns.map((c) => (
                  <td key={c.key}>{c.render(r)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <nav className="pagination" aria-label="Pagination">
          <Button disabled={page <= 1} onClick={() => onPage?.(page - 1)}>
            Previous
          </Button>
          <span>
            Page {page} of {totalPages}
          </span>
          <Button
            disabled={page >= totalPages}
            onClick={() => onPage?.(page + 1)}
          >
            Next
          </Button>
        </nav>
      )}
    </State>
  );
}
