import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api, downloadBlob } from "../api/client";

type Credential = { id: string; qualification: string; institution_name: string; issue_date: string; status: string };

export function MyCredentials() {
  const query = useQuery({ queryKey: ["my-credentials"], queryFn: async () => (await api.get("/credentials/me")).data as { credentials: Credential[] } });
  if (query.isLoading) return <main className="page"><p>Loading your credentials…</p></main>;
  if (query.isError) return <main className="page"><h1>My Credentials</h1><p role="alert">Your credentials could not be loaded.</p></main>;
  const credentials = query.data?.credentials ?? [];
  return <main className="page"><h1>My Credentials</h1>{credentials.length === 0 ? <p>No credentials are available for this account.</p> : <div className="card-grid">{credentials.map((credential) => <article className="card" key={credential.id}><h2>{credential.qualification}</h2><p>{credential.institution_name}</p><p>Award date: {credential.issue_date}</p><p>Status: {credential.status}</p><div className="actions"><Link className="button secondary" to={`/app/credentials/${credential.id}`}>View Certificate</Link><button className="button" onClick={() => downloadBlob(`/credentials/${credential.id}/pdf`, `credential-${credential.id}.pdf`)}>Download PDF</button><Link className="button secondary" to={`/verify`}>Verify</Link></div></article>)}</div>}</main>;
}
