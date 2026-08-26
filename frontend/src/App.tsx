import { lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { LazyRouteBoundary } from "./routes/LazyRouteBoundary";
import { AuthGuard, RoleGuard } from "./routes/guards";
import {
  Landing,
  PublicLayout,
  InfoPage,
  VerifyPage,
  NotFound,
} from "./pages/PublicPages";
const AppLayout = lazy(() =>
  import("./layouts/AppLayout").then((module) => ({
    default: module.AppLayout,
  }))
);
const LoginPage = lazy(() =>
  import("./pages/AuthPages").then((module) => ({ default: module.LoginPage }))
);
const ChangePassword = lazy(() =>
  import("./pages/AuthPages").then((module) => ({
    default: module.ChangePassword,
  }))
);
const ForgotPasswordPage = lazy(() =>
  import("./pages/AuthPages").then((module) => ({
    default: module.ForgotPasswordPage,
  }))
);
const ResetPasswordPage = lazy(() =>
  import("./pages/AuthPages").then((module) => ({
    default: module.ResetPasswordPage,
  }))
);
const Dashboard = lazy(() =>
  import("./pages/Dashboard").then((module) => ({ default: module.Dashboard }))
);
const ManagementPage = lazy(() =>
  import("./pages/Management").then((module) => ({
    default: module.ManagementPage,
  }))
);
const CreatePage = lazy(() =>
  import("./pages/Management").then((module) => ({
    default: module.CreatePage,
  }))
);
const CredentialDetail = lazy(() =>
  import("./pages/Management").then((module) => ({
    default: module.CredentialDetail,
  }))
);
const Profile = lazy(() =>
  import("./pages/Management").then((module) => ({ default: module.Profile }))
);
const UserDetail = lazy(() =>
  import("./pages/Management").then((module) => ({
    default: module.UserDetail,
  }))
);
const StudentDetail = lazy(() =>
  import("./pages/Management").then((module) => ({
    default: module.StudentDetail,
  }))
);
const MyCredentials = lazy(() => import("./pages/MyCredentials").then((module) => ({ default: module.MyCredentials })));
const Public = ({ children }: { children: React.ReactNode }) => (
  <PublicLayout>{children}</PublicLayout>
);
export default function App() {
  return (
    <LazyRouteBoundary>
      <Routes>
        <Route
          path="/"
          element={
            <Public>
              <Landing />
            </Public>
          }
        />
        <Route
          path="/about"
          element={
            <Public>
              <InfoPage kind="about" />
            </Public>
          }
        />
        <Route
          path="/institutions"
          element={
            <Public>
              <InfoPage kind="institutions" />
            </Public>
          }
        />
        <Route
          path="/privacy"
          element={
            <Public>
              <InfoPage kind="privacy" />
            </Public>
          }
        />
        <Route
          path="/terms"
          element={
            <Public>
              <InfoPage kind="terms" />
            </Public>
          }
        />
        <Route
          path="/contact"
          element={
            <Public>
              <InfoPage kind="contact" />
            </Public>
          }
        />
        <Route
          path="/verify"
          element={
            <Public>
              <VerifyPage />
            </Public>
          }
        />
        <Route
          path="/verify/token/:token"
          element={
            <Public>
              <VerifyPage />
            </Public>
          }
        />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route element={<AuthGuard />}>
          <Route path="/logout" element={<Navigate to="/" replace />} />
          <Route path="/app" element={<AppLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="verify" element={<VerifyPage />} />
            <Route path="profile" element={<Profile />} />
            <Route path="change-password" element={<ChangePassword />} />
            <Route
              path="students"
              element={<ManagementPage kind="students" />}
            />
            <Route
              path="students/new"
              element={<CreatePage kind="students" />}
            />
            <Route path="students/:id" element={<StudentDetail />} />
            <Route
              path="credentials"
              element={<ManagementPage kind="credentials" />}
            />
            <Route
              path="credentials/new"
              element={<CreatePage kind="credentials" />}
            />
            <Route path="credentials/:id" element={<CredentialDetail />} />
            <Route element={<RoleGuard roles={["student"]} />}>
              <Route path="my-credentials" element={<MyCredentials />} />
            </Route>
            <Route
              path="verifications"
              element={<ManagementPage kind="verification-logs" />}
            />
            <Route
              element={
                <RoleGuard roles={["super_admin", "institution_admin"]} />
              }
            >
              <Route path="users" element={<ManagementPage kind="users" />} />
              <Route path="users/new" element={<CreatePage kind="users" />} />
              <Route path="users/:id" element={<UserDetail />} />
              <Route
                path="audit"
                element={<ManagementPage kind="audit-logs" />}
              />
            </Route>
            <Route element={<RoleGuard roles={["super_admin"]} />}>
              <Route
                path="institutions"
                element={<ManagementPage kind="institutions" />}
              />
              <Route
                path="institutions/new"
                element={<CreatePage kind="institutions" />}
              />
            </Route>
          </Route>
        </Route>
        <Route
          path="/forbidden"
          element={
            <Public>
              <div className="narrow page">
                <h1>Access restricted</h1>
                <p>Your current role cannot access this area.</p>
              </div>
            </Public>
          }
        />
        <Route
          path="*"
          element={
            <Public>
              <NotFound />
            </Public>
          }
        />
      </Routes>
    </LazyRouteBoundary>
  );
}
