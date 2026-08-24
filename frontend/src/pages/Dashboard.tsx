import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "../api/client";
import { Card, State } from "../components/ui";
import { useAuth } from "../context/AuthContext";
const get = async (path: string) => (await api.get(path)).data.data;
export function Dashboard() {
  const { user } = useAuth();
  const summary = useQuery({
    queryKey: ["dashboard", "summary"],
    queryFn: () => get("/dashboard/summary"),
  });
  const ct = useQuery({
    queryKey: ["dashboard", "credential-trends"],
    queryFn: () => get("/dashboard/credential-trends?period=30days&groupBy=day"),
    enabled: user?.role !== "verifier",
  });
  const vt = useQuery({
    queryKey: ["dashboard", "verification-trends"],
    queryFn: () =>
      get("/dashboard/verification-trends?period=30days&groupBy=day"),
  });
  const top = useQuery({
    queryKey: ["dashboard", "top"],
    queryFn: () => get("/dashboard/top-institutions"),
    enabled: user?.role === "super_admin",
  });
  const values =
    summary.data && typeof summary.data === "object"
      ? Object.entries(summary.data)
          .filter(([, v]) => typeof v === "number")
          .slice(0, 8)
      : [];
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <span className="eyebrow">Live overview</span>
          <h1>Dashboard</h1>
        </div>
      </div>
      <State
        loading={summary.isLoading}
        error={summary.error}
        empty={!values.length}
      >
        {
          <div className="stat-grid">
            {values.map(([k, v]) => (
              <Card key={k}>
                <span>{k.replaceAll("_", " ")}</span>
                <strong>{String(v)}</strong>
              </Card>
            ))}
          </div>
        }
      </State>
      <div className="chart-grid">
        {user?.role !== "verifier" && (
          <ChartCard title="Credential activity" query={ct} type="area" />
        )}
        <ChartCard title="Verification activity" query={vt} type="bar" />
        {user?.role === "super_admin" && (
          <ChartCard title="Top institutions" query={top} type="bar" />
        )}
      </div>
    </div>
  );
}
function ChartCard({
  title,
  query,
  type,
}: {
  title: string;
  query: { isLoading: boolean; error: unknown; data: unknown };
  type: "area" | "bar";
}) {
  const raw = query.data as Record<string, unknown> | unknown[] | undefined;
  const data = Array.isArray(raw)
    ? raw
    : (raw && (Object.values(raw).find(Array.isArray) as unknown[])) || [];
  return (
    <Card title={title}>
      <State loading={query.isLoading} error={query.error} empty={!data.length}>
        <div className="chart" aria-label={`${title} chart`} role="img">
          <ResponsiveContainer width="100%" height="100%">
            {type === "area" ? (
              <AreaChart data={data as object[]}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis />
                <Tooltip />
                <Area dataKey="total" stroke="#08775d" fill="#b9eadc" />
              </AreaChart>
            ) : (
              <BarChart data={data as object[]}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="total" fill="#08775d" />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </State>
    </Card>
  );
}
