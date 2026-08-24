import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { Button, Card } from "../components/ui";
const loginSchema = z.object({
  email: z.email("Enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});
type Login = z.infer<typeof loginSchema>;
export function LoginPage() {
  const { login } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [error, setError] = useState("");
  const successMessage = (loc.state as { message?: string } | null)?.message;
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Login>({ resolver: zodResolver(loginSchema) });
  return (
    <main className="auth-page">
      <Card>
        <img
          className="auth-mark"
          src="/coat-of-arms-zimbabwe.svg"
          alt="Zimbabwe Coat of Arms"
          width="384"
          height="340"
        />
        <span className="eyebrow">Secure institution access</span>
        <h1>Welcome back</h1>
        {successMessage && <div className="notice success" role="status">{successMessage}</div>}
        <form
          onSubmit={handleSubmit(async (v) => {
            setError("");
            try {
              const u = await login(v.email, v.password);
              nav(
                u.mustChangePassword
                  ? "/app/change-password"
                  : (loc.state as { from?: string })?.from || "/app"
              );
            } catch (e) {
              setError((e as { message: string }).message);
            }
          })}
        >
          <label>
            Email address
            <input
              id="login-email"
              type="email"
              autoComplete="username"
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? "login-email-error" : undefined}
              {...register("email")}
            />
            <small id="login-email-error" className="field-error">
              {errors.email?.message}
            </small>
          </label>
          <label>
            Password
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              aria-invalid={Boolean(errors.password)}
              aria-describedby={
                errors.password ? "login-password-error" : undefined
              }
              {...register("password")}
            />
            <small id="login-password-error" className="field-error">
              {errors.password?.message}
            </small>
          </label>
          {error && (
            <div className="notice error" role="alert">
              {error}
            </div>
          )}
          <Button className="primary full" disabled={isSubmitting}>
            {isSubmitting ? "Signing in…" : "Sign in"}
          </Button>
        </form>
        <p>
          <Link to="/forgot-password">Forgot password?</Link>
        </p>
        <p>
          <Link to="/">Return to public site</Link>
        </p>
      </Card>
    </main>
  );
}
const passSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required."),
  newPassword: z.string().min(12, "Use at least 12 characters.")
    .regex(/[A-Z]/, "Include an uppercase letter.")
    .regex(/[a-z]/, "Include a lowercase letter.")
    .regex(/[0-9]/, "Include a number.")
    .regex(/[^A-Za-z0-9]/, "Include a special character."),
  confirmPassword: z.string().min(1, "Confirm your new password."),
}).refine((value) => value.newPassword === value.confirmPassword, {
  path: ["confirmPassword"], message: "Password confirmation does not match.",
});
type PasswordChange = z.infer<typeof passSchema>;
export function ChangePassword() {
  const nav = useNavigate();
  const { clearSession } = useAuth();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PasswordChange>({ resolver: zodResolver(passSchema) });
  const [error, setError] = useState("");
  return (
    <div className="page">
      <h1>Change password</h1>
      <Card>
        <form
          onSubmit={handleSubmit(async (v) => {
            setError("");
            try {
              await api.post("/auth/change-password", v);
              reset({ currentPassword: "", newPassword: "", confirmPassword: "" });
              clearSession();
              nav("/login", { replace: true, state: { message: "Password changed successfully. Please sign in again." } });
            } catch (failure) {
              setError((failure as { message?: string }).message || "The password could not be changed.");
            }
          })}
        >
          <label>
            Current password
            <input type="password" autoComplete="current-password" aria-invalid={Boolean(errors.currentPassword)} {...register("currentPassword")} />
            {errors.currentPassword && <small className="field-error">{errors.currentPassword.message}</small>}
          </label>
          <label>
            New password
            <input
              type="password"
              autoComplete="new-password"
              aria-invalid={Boolean(errors.newPassword)}
              aria-describedby={
                errors.newPassword ? "change-password-error" : undefined
              }
              {...register("newPassword")}
            />
            <small id="change-password-error" className="field-error">
              {errors.newPassword?.message as string}
            </small>
          </label>
          <label>
            Confirm new password
            <input type="password" autoComplete="new-password" aria-invalid={Boolean(errors.confirmPassword)} aria-describedby={errors.confirmPassword ? "change-password-confirm-error" : undefined} {...register("confirmPassword")} />
            <small id="change-password-confirm-error" className="field-error">{errors.confirmPassword?.message}</small>
          </label>
          <Button className="primary" disabled={isSubmitting}>
            {isSubmitting ? "Updating…" : "Update password"}
          </Button>
          {error && <div className="notice error" role="alert">{error}</div>}
        </form>
      </Card>
    </div>
  );
}
const forgotSchema = z.object({
  email: z.email("Enter a valid email address."),
});
export function ForgotPasswordPage() {
  const [msg, setMsg] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(forgotSchema) });
  return (
    <main className="auth-page">
      <Card>
        <span className="eyebrow">Account recovery</span>
        <h1>Forgot password</h1>
        <form
          onSubmit={handleSubmit(async (v) => {
            const r = await api.post("/auth/forgot-password", v);
            setMsg(r.data.message);
          })}
        >
          <label>
            Email address
            <input
              type="email"
              autoComplete="email"
              aria-invalid={Boolean(errors.email)}
              aria-describedby={
                errors.email ? "forgot-email-error" : undefined
              }
              {...register("email")}
            />
            <small id="forgot-email-error" className="field-error">
              {errors.email?.message as string}
            </small>
          </label>
          <Button className="primary full" disabled={isSubmitting}>
            {isSubmitting ? "Sending…" : "Send reset instructions"}
          </Button>
          {msg && <div className="notice success">{msg}</div>}
        </form>
        <p>
          <Link to="/login">Back to login</Link>
        </p>
      </Card>
    </main>
  );
}
const resetSchema = z
  .object({
    password: z.string().min(12, "Use at least 12 characters."),
    confirmPassword: z.string().min(1, "Confirm your password."),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Password confirmation does not match.",
  });
export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const [token] = useState(() => params.get("token") || "");
  const [show, setShow] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState(
    token ? "" : "The password reset link is invalid or expired."
  );
  useEffect(() => {
    if (token) window.history.replaceState({}, "", window.location.pathname);
  }, [token]);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(resetSchema) });
  return (
    <main className="auth-page">
      <Card>
        <span className="eyebrow">Account recovery</span>
        <h1>Reset password</h1>
        {!msg && (
          <form
            onSubmit={handleSubmit(async (v) => {
              setError("");
              try {
                const r = await api.post("/auth/reset-password", {
                  token,
                  ...v,
                });
                setMsg(r.data.message);
              } catch (e) {
                setError((e as { message: string }).message);
              }
            })}
          >
            <label>
              New password
              <input
                type={show ? "text" : "password"}
                autoComplete="new-password"
                aria-invalid={Boolean(errors.password)}
                aria-describedby={
                  errors.password ? "reset-password-error" : undefined
                }
                {...register("password")}
              />
              <small id="reset-password-error" className="field-error">
                {errors.password?.message as string}
              </small>
            </label>
            <label>
              Confirm password
              <input
                type={show ? "text" : "password"}
                autoComplete="new-password"
                aria-invalid={Boolean(errors.confirmPassword)}
                aria-describedby={
                  errors.confirmPassword
                    ? "reset-confirm-password-error"
                    : undefined
                }
                {...register("confirmPassword")}
              />
              <small id="reset-confirm-password-error" className="field-error">
                {errors.confirmPassword?.message as string}
              </small>
            </label>
            <button
              type="button"
              className="link-button"
              onClick={() => setShow((v) => !v)}
            >
              {show ? "Hide passwords" : "Show passwords"}
            </button>
            <Button className="primary full" disabled={isSubmitting || !token}>
              {isSubmitting ? "Resetting…" : "Reset password"}
            </Button>
            {error && (
              <div className="notice error" role="alert">
                {error}
              </div>
            )}
          </form>
        )}
        {msg && <div className="notice success">{msg}</div>}
        <p>
          <Link to="/login">Back to login</Link>
        </p>
      </Card>
    </main>
  );
}
