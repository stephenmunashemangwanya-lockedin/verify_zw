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
  const metrics: Record<string, string[]> = {
    institutions: ["total", "active", "inactive"],
    users: ["total", "active", "inactive"],
    students: ["total"],
    credentials: ["total", "pending", "processing", "active", "failed", "revoked"],
    verifications: ["total", "verified", "revoked", "unknown", "pending", "failed", "inconsistency"],
  };
  const values = Object.entries(metrics).flatMap(([group, fields]) =>
    fields.filter(field => typeof summary.data?.[group]?.[field] === "number")
      .map(field => [`${group} ${field}`, summary.data[group][field]] as const));
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
          <ChartCard title="Credential activity" query={ct} type="area" kind="credentials" />
        )}
        <ChartCard title="Verification activity" query={vt} type="bar" kind="verifications" />
        {user?.role === "super_admin" && (
          <ChartCard title="Top institutions" query={top} type="bar" kind="institutions" />
        )}
      </div>
    </div>
  );
}
function ChartCard({
  title,
  query,
  type,
  kind,
}: {
  title: string;
  query: { isLoading: boolean; error: unknown; data: unknown };
  type: "area" | "bar";
  kind: "credentials" | "verifications" | "institutions";
}) {
  const raw = query.data as { series?: Record<string, unknown>[] } | Record<string, unknown>[] | undefined;
  const data = kind === "institutions" ? (Array.isArray(raw) ? raw : []) : (!Array.isArray(raw) && Array.isArray(raw?.series) ? raw.series : []);
  const axis = kind === "institutions" ? "institution_name" : "period";
  const series = kind === "credentials" ? ["issued", "activated", "failed", "revoked"] : kind === "institutions" ? ["total_credentials"] : ["total"];
  const colors = ["#08775d", "#315db0", "#b5252d", "#805019"];
  return (
    <Card title={title}>
      <State loading={query.isLoading} error={query.error}>
        {!data.length ? <div className="empty">No {title.toLowerCase()} data available.</div> : <>
        <div className="chart" aria-label={`${title} chart`} role="img">
          <ResponsiveContainer width="100%" height="100%">
            {type === "area" ? (
              <AreaChart data={data as object[]}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey={axis} />
                <YAxis />
                <Tooltip />
                {series.map((key, i) => <Area key={key} dataKey={key} stroke={colors[i]} fill={colors[i]} fillOpacity={0.15} />)}
              </AreaChart>
            ) : (
              <BarChart data={data as object[]}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey={axis} />
                <YAxis />
                <Tooltip />
                {series.map((key, i) => <Bar key={key} dataKey={key} fill={colors[i]} />)}
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
        <details><summary>View {title.toLowerCase()} data</summary><div className="table-wrap"><table aria-label={`${title} data`}>
          <thead><tr><th scope="col">{kind === "institutions" ? "Institution" : "Period"}</th>{series.map(key => <th scope="col" key={key}>{key.replaceAll("_", " ")}</th>)}</tr></thead>
          <tbody>{data.map((row, index) => <tr key={index}><th scope="row">{String(row[axis])}</th>{series.map(key => <td key={key}>{String(row[key] ?? "?")}</td>)}</tr>)}</tbody>
        </table></div></details></>}
      </State>
    </Card>
  );
}
