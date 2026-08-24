import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  FileCheck2,
  Globe2,
  LockKeyhole,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { api } from "../api/client";
import { Badge, Button, Card, State } from "../components/ui";
export function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="public-nav">
        <Link className="brand" to="/" aria-label="VerifyZW home">
          <img
            className="brand-mark"
            src="/coat-of-arms-zimbabwe.svg"
            alt="Zimbabwe Coat of Arms"
            width="384"
            height="340"
          />
          <span>VerifyZW</span>
        </Link>
        <nav aria-label="Primary navigation">
          <Link to="/about">About</Link>
          <Link to="/verify">Verify</Link>
          <Link to="/institutions">Institutions</Link>
          <Link to="/contact">Contact</Link>
          <Link className="button" to="/login">
            Institution login
          </Link>
        </nav>
      </header>
      <main>{children}</main>
      <footer>
        <span>© 2026 VerifyZW</span>
        <nav aria-label="Footer navigation">
          <Link to="/privacy">Privacy</Link>
          <Link to="/terms">Terms</Link>
        </nav>
      </footer>
    </>
  );
}
export function Landing() {
  return (
    <>
      <section className="hero">
        <div>
          <span className="eyebrow">
            Trusted education. Verifiable achievement.
          </span>
          <h1>Credentials Zimbabwe can trust.</h1>
          <p>
            Verify academic awards against institution records, IPFS evidence,
            and blockchain proofs—quickly and securely.
          </p>
          <div className="actions">
            <Link className="button primary" to="/verify">
              Verify a credential
            </Link>
            <Link className="button" to="/about">
              How it works
            </Link>
          </div>
        </div>
        <div className="hero-mark">
          <ShieldCheckIcon />
        </div>
      </section>
      <section className="features">
        <Card title="Institution-issued">
          <FileCheck2 />
          <p>Credentials originate from authorised academic institutions.</p>
        </Card>
        <Card title="Tamper-evident">
          <LockKeyhole />
          <p>Document hashes and on-chain evidence expose modification.</p>
        </Card>
        <Card title="Accessible anywhere">
          <Globe2 />
          <p>
            Public verification needs no account and reveals only safe data.
          </p>
        </Card>
      </section>
    </>
  );
}
function ShieldCheckIcon() {
  return (
    <div className="seal">
      <ShieldCheck size={82} />
      <span>VERIFIED</span>
    </div>
  );
}
export function InfoPage({ kind }: { kind: string }) {
  const copy: Record<string, [string, string]> = {
    about: [
      "About VerifyZW",
      "A secure credential platform connecting Zimbabwean institutions, graduates, employers, and verifiers.",
    ],
    institutions: [
      "Participating institutions",
      "Authorised institutions issue independently verifiable digital credentials. Contact an institution directly for enrolment or academic-record questions.",
    ],
    privacy: [
      "Privacy",
      "Verification returns the minimum information needed to establish authenticity. Uploaded files are processed for verification and governed by platform retention controls.",
    ],
    terms: [
      "Terms of use",
      "Use verification results responsibly. A result confirms the platform record at the time checked and does not replace institution due diligence.",
    ],
    contact: [
      "Contact",
      "For credential corrections, contact the issuing institution. Platform administrators can assist with access and technical availability.",
    ],
  };
  const [t, b] = copy[kind];
  return (
    <div className="narrow page">
      <span className="eyebrow">VerifyZW</span>
      <h1>{t}</h1>
      <p className="lead">{b}</p>
      <Card>
        <h2>Need assistance?</h2>
        <p>
          Email{" "}
          <a href="mailto:support@verifyzw.example">support@verifyzw.example</a>
          . Do not send passwords or private keys.
        </p>
      </Card>
    </div>
  );
}
type Mode = "hash" | "credential" | "token" | "file";
export function VerifyPage() {
  const params = useParams();
  const [mode, setMode] = useState<Mode>(params.token ? "token" : "hash");
  const [value, setValue] = useState(params.token || "");
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<unknown>();
  const [loading, setLoading] = useState(false);
  const modes: Mode[] = ["hash", "credential", "token", "file"];
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(undefined);
    try {
      let r;
      if (mode === "file") {
        if (
          !file ||
          file.type !== "application/pdf" ||
          file.size > 10 * 1024 * 1024
        )
          throw { message: "Choose a PDF no larger than 10 MB." };
        const form = new FormData();
        form.append("certificate", file);
        r = await api.post("/verify/file", form);
      } else
        r = await api.get(
          `/verify/${mode}/${encodeURIComponent(value.trim())}`
        );
      setResult(r.data.data);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="narrow page">
      <span className="eyebrow">Public verification</span>
      <h1>Check a credential</h1>
      <p>No account required. Choose the evidence you have.</p>
      <div className="tabs" role="tablist">
        {modes.map((m, index) => (
          <button
            key={m}
            id={`verification-tab-${m}`}
            role="tab"
            aria-selected={mode === m}
            aria-controls={`verification-panel-${m}`}
            tabIndex={mode === m ? 0 : -1}
            onKeyDown={(event) => {
              let next = index;
              if (event.key === "ArrowRight") next = (index + 1) % modes.length;
              else if (event.key === "ArrowLeft")
                next = (index - 1 + modes.length) % modes.length;
              else if (event.key === "Home") next = 0;
              else if (event.key === "End") next = modes.length - 1;
              else return;
              event.preventDefault();
              setMode(modes[next]);
              setResult(null);
              const tabs =
                event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>(
                  '[role="tab"]'
                );
              tabs?.[next]?.focus();
            }}
            onClick={() => {
              setMode(m);
              setResult(null);
            }}
          >
            {m === "credential" ? "Credential ID" : m}
          </button>
        ))}
      </div>
      <div
        id={`verification-panel-${mode}`}
        role="tabpanel"
        aria-labelledby={`verification-tab-${mode}`}
      >
        <Card>
          <form onSubmit={submit}>
            {mode === "file" ? (
              <label>
                Certificate PDF
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
              </label>
            ) : (
              <label>
                {mode === "hash"
                  ? "SHA-256 certificate hash"
                  : mode === "credential"
                  ? "Credential ID"
                  : "Public token"}
                <input
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  required
                  autoComplete="off"
                />
              </label>
            )}
            <Button className="primary" disabled={loading}>
              {loading ? (
                "Verifying…"
              ) : (
                <>
                  <Upload size={17} /> Verify now
                </>
              )}
            </Button>
          </form>
        </Card>
      </div>
      <State loading={loading} error={error} empty={false}>
        {result && <VerificationResult data={result} />}
      </State>
    </div>
  );
}
export function VerificationResult({
  data,
}: {
  data: Record<string, unknown>;
}) {
  const outcome = String(
    data.outcome || data.result || data.status || "UNKNOWN"
  ).toUpperCase();
  return (
    <Card className="result">
      <Badge value={outcome} />
      <h2>
        {outcome === "VERIFIED"
          ? "Credential verified"
          : outcome === "REVOKED"
          ? "Credential revoked"
          : "Verification result"}
      </h2>
      <dl>
        {Object.entries(data)
          .filter(
            ([k, v]) =>
              v != null &&
              ![
                "certificate_hash",
                "public_token",
                "processing_error",
              ].includes(k)
          )
          .slice(0, 10)
          .map(([k, v]) => (
            <div key={k}>
              <dt>{k.replaceAll("_", " ")}</dt>
              <dd>{typeof v === "object" ? "Available" : String(v)}</dd>
            </div>
          ))}
      </dl>
    </Card>
  );
}
export function NotFound() {
  return (
    <div className="narrow page">
      <h1>Page not found</h1>
      <p>The page may have moved or you may not have access.</p>
      <Link className="button primary" to="/">
        Return home
      </Link>
    </div>
  );
}
