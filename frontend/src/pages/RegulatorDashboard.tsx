import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { Badge, Card, State } from "../components/ui";
import type { JsonRecord } from "../types";

export function RegulatorDashboard() {
  const overview = useQuery({
    queryKey: ["accreditations", "regulator-overview"],
    queryFn: async () => {
      // The API's total counts all matching records, not just this page.
      const responses = await Promise.all([
        api.get("/accreditations", { params: { limit: 5, offset: 0 } }),
        ...["accredited", "suspended", "revoked"].map(status =>
          api.get("/accreditations", { params: { status, limit: 1, offset: 0 } })),
      ]);
      return {
        counts: responses.map(response => Number(response.data.total)),
        records: responses[0].data.accreditations as JsonRecord[],
      };
    },
  });
  return (
    <div className="page">
      <div className="page-head">
        <div><span className="eyebrow">Regulatory oversight</span><h1>Regulator Dashboard</h1></div>
        <Link className="button primary" to="/app/accreditations">Manage accreditations</Link>
      </div>
      <p className="notice" role="note">
        These are simulated/ZIMCHE-modelled regulator records used by the research prototype and are not a live ZIMCHE accreditation feed.
      </p>
      <State loading={overview.isLoading} error={overview.error}>
        <div className="stat-grid">
          {["Total accreditation records", "Accredited records", "Suspended records", "Revoked records"].map((label, i) => (
            <Card key={label}><span>{label}</span><strong>{overview.data?.counts[i] ?? "—"}</strong></Card>
          ))}
        </div>
        <Card title="Recent accreditation records">
          <p>Ordered by most recent valid-from date. Accreditation is independent of technical blockchain wallet authorisation.</p>
          <State empty={overview.data?.records.length === 0}>
            <div className="table-wrap"><table aria-label="Recent accreditation records">
              <thead><tr><th>Institution</th><th>Programme</th><th>Status</th><th>Valid from</th><th>Valid to</th></tr></thead>
              <tbody>{overview.data?.records.map(row => (
                <tr key={String(row.id)}>
                  <td>{String(row.institution_name || row.institution_id)}</td>
                  <td>{String(row.programme || "Institution-wide")}</td>
                  <td><Badge value={String(row.status)} /></td>
                  <td>{String(row.valid_from).slice(0, 10)}</td>
                  <td>{row.valid_to ? String(row.valid_to).slice(0, 10) : "Open-ended"}</td>
                </tr>
              ))}</tbody>
            </table></div>
          </State>
        </Card>
      </State>
    </div>
  );
}
