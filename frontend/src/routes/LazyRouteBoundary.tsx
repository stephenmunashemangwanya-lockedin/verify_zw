import { Component, Suspense, type ErrorInfo, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { State } from "../components/ui";

class LazyImportErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV)
      console.error("Lazy route failed to load", error, info);
  }

  render() {
    if (this.state.failed) {
      return (
        <main className="narrow page">
          <div className="notice error" role="alert">
            Unable to load this page. Please refresh and try again.
          </div>
        </main>
      );
    }
    return this.props.children;
  }
}

export function LazyRouteBoundary({ children }: { children: ReactNode }) {
  const location = useLocation();
  return (
    <LazyImportErrorBoundary key={location.pathname}>
      <Suspense
        fallback={
          <State loading empty={false}>
            {null}
          </State>
        }
      >
        {children}
      </Suspense>
    </LazyImportErrorBoundary>
  );
}
