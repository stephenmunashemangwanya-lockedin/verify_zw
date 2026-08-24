import { useRef, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  Award,
  BarChart3,
  Building2,
  FileCheck2,
  History,
  LogOut,
  Menu,
  ShieldCheck,
  Users,
  UserRound,
  X,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import type { Role } from "../types";
const nav: Array<
  [string, string, React.ComponentType<{ size?: number }>, Role[]?]
> = [
  ["/app", "Dashboard", BarChart3],
  [
    "/app/institutions",
    "Institutions",
    Building2,
    ["super_admin", "institution_admin"],
  ],
  ["/app/users", "Users", Users, ["super_admin", "institution_admin"]],
  [
    "/app/students",
    "Students",
    UserRound,
    ["super_admin", "institution_admin", "issuer"],
  ],
  ["/app/credentials", "Credentials", Award],
  ["/app/verify", "Verify", ShieldCheck],
  ["/app/verifications", "Verification logs", FileCheck2],
  ["/app/audit", "Audit logs", History, ["super_admin", "institution_admin"]],
  ["/app/profile", "Profile", UserRound],
];
export function AppLayout() {
  const [open, setOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const { user, logout } = useAuth();
  const go = useNavigate();
  return (
    <div className="shell">
      <a href="#main" className="skip">
        Skip to content
      </a>
      <aside
        className={open ? "sidebar open" : "sidebar"}
        onKeyDown={(event) => {
          if (event.key === "Escape" && open) {
            setOpen(false);
            menuButtonRef.current?.focus();
          }
        }}
      >
        <div className="brand">
          <img
            className="brand-mark"
            src="/coat-of-arms-zimbabwe.svg"
            alt="Zimbabwe Coat of Arms"
            width="384"
            height="340"
          />
          <span>VerifyZW</span>
          <button
            className="icon mobile"
            aria-label="Close menu"
            onClick={() => {
              setOpen(false);
              menuButtonRef.current?.focus();
            }}
          >
            <X />
          </button>
        </div>
        <nav aria-label="Workspace navigation">
          {nav
            .filter((n) => !n[3] || n[3]?.includes(user!.role))
            .map(([to, label, Icon]) => (
              <NavLink
                key={to}
                to={to}
                end={to === "/app"}
                onClick={() => setOpen(false)}
              >
                <Icon size={19} />
                {label}
              </NavLink>
            ))}
        </nav>
        <button
          className="logout"
          onClick={async () => {
            await logout();
            go("/");
          }}
        >
          <LogOut size={18} /> Sign out
        </button>
      </aside>
      <div className="workspace">
        <header>
          <button
            ref={menuButtonRef}
            className="icon mobile"
            aria-label="Open menu"
            onClick={() => setOpen(true)}
          >
            <Menu />
          </button>
          <div>
            <strong>{user?.fullName}</strong>
            <small>{user?.role.replaceAll("_", " ")}</small>
          </div>
        </header>
        <main id="main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
