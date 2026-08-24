import {
  useEffect,
  useRef,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";
export function Button(p: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...p} className={`button ${p.className || ""}`} />;
}
export function Card({
  title,
  children,
  className = "",
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`card ${className}`}>
      {title && <h2>{title}</h2>}
      {children}
    </section>
  );
}
export function Badge({ value }: { value: string }) {
  return (
    <span className={`badge badge-${value.toLowerCase()}`}>
      {value.replaceAll("_", " ")}
    </span>
  );
}
export function State({
  loading,
  error,
  empty,
  children,
}: {
  loading?: boolean;
  error?: unknown;
  empty?: boolean;
  children: ReactNode;
}) {
  if (loading)
    return (
      <div className="skeleton" role="status">
        Loading…
      </div>
    );
  if (error)
    return (
      <div className="notice error" role="alert">
        {(error as { message?: string }).message ||
          "Unable to load this information."}
      </div>
    );
  if (empty) return <div className="empty">No matching records found.</div>;
  return <>{children}</>;
}
export function ConfirmDialog({
  open,
  title,
  children,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    returnFocusRef.current = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    const focusable = dialog?.querySelector<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    focusable?.focus();
    return () => returnFocusRef.current?.focus();
  }, [open]);

  if (!open) return null;
  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={onCancel}>
      <div
        ref={dialogRef}
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            onCancel();
            return;
          }
          if (event.key !== "Tab") return;
          const controls = Array.from(
            dialogRef.current?.querySelectorAll<HTMLElement>(
              'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
            ) || []
          );
          if (!controls.length) return;
          const first = controls[0];
          const last = controls[controls.length - 1];
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
          }
        }}
      >
        <h2 id="dialog-title">{title}</h2>
        {children}
        <div className="actions">
          <Button onClick={onCancel}>Cancel</Button>
          <Button className="danger" onClick={onConfirm}>
            Confirm
          </Button>
        </div>
      </div>
    </div>
  );
}
