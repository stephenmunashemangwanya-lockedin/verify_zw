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
import {
  Badge,
  Button,
  Card,
  State,
} from "../components/ui";

export function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <header className="public-nav">
        <Link
          className="brand"
          to="/"
          aria-label="VerifyZW home"
        >
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
          <Link to="/about">
            About
          </Link>

          <Link to="/verify">
            Verify
          </Link>

          <Link to="/institutions">
            Institutions
          </Link>

          <Link to="/contact">
            Contact
          </Link>

          <Link
            className="button"
            to="/login"
          >
            Institution login
          </Link>
        </nav>
      </header>

      <main>
        {children}
      </main>

      <footer>
        <span>
          © 2026 VerifyZW
        </span>

        <nav aria-label="Footer navigation">
          <Link to="/privacy">
            Privacy
          </Link>

          <Link to="/terms">
            Terms
          </Link>
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

          <h1>
            Credentials Zimbabwe can trust.
          </h1>

          <p>
            Verify academic awards against
            institution records, IPFS evidence,
            and blockchain proofs—quickly and
            securely.
          </p>

          <div className="actions">
            <Link
              className="button primary"
              to="/verify"
            >
              Verify a credential
            </Link>

            <Link
              className="button"
              to="/about"
            >
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

          <p>
            Credentials originate from
            authorised academic institutions.
          </p>
        </Card>

        <Card title="Tamper-evident">
          <LockKeyhole />

          <p>
            Document hashes and on-chain
            evidence expose modification.
          </p>
        </Card>

        <Card title="Accessible anywhere">
          <Globe2 />

          <p>
            Public verification needs no
            account and reveals only safe
            data.
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

export function InfoPage({
  kind,
}: {
  kind: string;
}) {
  const copy: Record<
    string,
    [string, string]
  > = {
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

  const [title, body] =
    copy[kind];

  return (
    <div className="narrow page">
      <span className="eyebrow">
        VerifyZW
      </span>

      <h1>{title}</h1>

      <p className="lead">
        {body}
      </p>

      <Card>
        <h2>
          Need assistance?
        </h2>

        <p>
          Email{" "}
          <a href="mailto:support@verifyzw.example">
            support@verifyzw.example
          </a>
          . Do not send passwords or
          private keys.
        </p>
      </Card>
    </div>
  );
}

type Mode =
  | "hash"
  | "credential"
  | "token"
  | "file";

const MAX_PDF_SIZE =
  10 * 1024 * 1024;

const validatePdf = (
  file: File | null
) => {
  if (!file) {
    throw {
      message:
        "Choose a certificate PDF.",
    };
  }

  if (
    file.type !==
    "application/pdf"
  ) {
    throw {
      message:
        "Only PDF certificate files are accepted.",
    };
  }

  if (
    file.size >
    MAX_PDF_SIZE
  ) {
    throw {
      message:
        "Choose a PDF no larger than 10 MB.",
    };
  }
};

export function VerifyPage() {
  const params =
    useParams();

  const [
    mode,
    setMode,
  ] = useState<Mode>(
    params.token
      ? "token"
      : "hash"
  );

  const [
    value,
    setValue,
  ] = useState(
    params.token || ""
  );

  const [
    file,
    setFile,
  ] = useState<File | null>(
    null
  );

  const [
    result,
    setResult,
  ] = useState<
    Record<string, unknown> | null
  >(null);

  const [
    error,
    setError,
  ] = useState<unknown>();

  const [
    loading,
    setLoading,
  ] = useState(false);

  const modes: Mode[] = [
    "hash",
    "credential",
    "token",
    "file",
  ];

  const submit =
    async (
      event: React.FormEvent
    ) => {
      event.preventDefault();

      setLoading(true);
      setError(undefined);
      setResult(null);

      try {
        let response;

        if (
          mode === "file"
        ) {
          validatePdf(file);

          const form =
            new FormData();

          form.append(
            "certificate",
            file as File
          );

          response =
            await api.post(
              "/verify/file",
              form
            );
        } else if (
          (
            mode ===
              "credential" ||
            mode ===
              "token"
          ) &&
          file
        ) {
          validatePdf(file);

          const identifier =
            value.trim();

          if (!identifier) {
            throw {
              message:
                mode ===
                "credential"
                  ? "Enter a credential ID."
                  : "Enter a public token.",
            };
          }

          const form =
            new FormData();

          form.append(
            "certificate",
            file
          );

          response =
            await api.post(
              `/verify/${mode}/${encodeURIComponent(
                identifier
              )}/file`,
              form
            );
        } else {
          const identifier =
            value.trim();

          if (!identifier) {
            throw {
              message:
                "Enter verification evidence.",
            };
          }

          response =
            await api.get(
              `/verify/${mode}/${encodeURIComponent(
                identifier
              )}`
            );
        }

        setResult(
          response.data.data
        );
      } catch (caught) {
        setError(caught);
      } finally {
        setLoading(false);
      }
    };

  const changeMode = (
    nextMode: Mode
  ) => {
    setMode(nextMode);
    setResult(null);
    setError(undefined);
    setFile(null);
  };

  const allowsClaimedFile =
    mode === "credential" ||
    mode === "token";

  return (
    <div className="narrow page">
      <span className="eyebrow">
        Public verification
      </span>

      <h1>
        Check a credential
      </h1>

      <p>
        No account required.
        Verify using a credential
        identifier, QR/public token,
        certificate hash, or PDF.
      </p>

      <div
        className="tabs"
        role="tablist"
      >
        {modes.map(
          (
            currentMode,
            index
          ) => (
            <button
              key={
                currentMode
              }
              id={`verification-tab-${currentMode}`}
              role="tab"
              aria-selected={
                mode ===
                currentMode
              }
              aria-controls={`verification-panel-${currentMode}`}
              tabIndex={
                mode ===
                currentMode
                  ? 0
                  : -1
              }
              onKeyDown={(
                event
              ) => {
                let next =
                  index;

                if (
                  event.key ===
                  "ArrowRight"
                ) {
                  next =
                    (
                      index +
                      1
                    ) %
                    modes.length;
                } else if (
                  event.key ===
                  "ArrowLeft"
                ) {
                  next =
                    (
                      index -
                      1 +
                      modes.length
                    ) %
                    modes.length;
                } else if (
                  event.key ===
                  "Home"
                ) {
                  next = 0;
                } else if (
                  event.key ===
                  "End"
                ) {
                  next =
                    modes.length -
                    1;
                } else {
                  return;
                }

                event.preventDefault();

                changeMode(
                  modes[next]
                );

                const tabs =
                  event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>(
                    '[role="tab"]'
                  );

                tabs?.[
                  next
                ]?.focus();
              }}
              onClick={() =>
                changeMode(
                  currentMode
                )
              }
            >
              {currentMode ===
              "credential"
                ? "Credential ID"
                : currentMode ===
                  "token"
                ? "QR / Public token"
                : currentMode ===
                  "file"
                ? "PDF only"
                : "Hash"}
            </button>
          )
        )}
      </div>

      <div
        id={`verification-panel-${mode}`}
        role="tabpanel"
        aria-labelledby={`verification-tab-${mode}`}
      >
        <Card>
          <form
            onSubmit={
              submit
            }
          >
            {mode ===
            "file" ? (
              <>
                <label>
                  Certificate PDF

                  <input
                    key="standalone-certificate"
                    type="file"
                    accept="application/pdf"
                    required
                    onChange={(
                      event
                    ) =>
                      setFile(
                        event
                          .target
                          .files?.[0] ||
                          null
                      )
                    }
                  />
                </label>

                <p className="notice">
                  PDF-only verification
                  checks whether the exact
                  uploaded document already
                  matches an official
                  credential record.
                </p>
              </>
            ) : (
              <>
                <label>
                  {mode ===
                  "hash"
                    ? "SHA-256 certificate hash"
                    : mode ===
                      "credential"
                    ? "Credential ID"
                    : "Public token"}

                  <input
                    value={
                      value
                    }
                    onChange={(
                      event
                    ) =>
                      setValue(
                        event
                          .target
                          .value
                      )
                    }
                    required
                    autoComplete="off"
                  />
                </label>

                {allowsClaimedFile && (
                  <>
                    <label>
                      Certificate PDF
                      (optional)

                      <input
                        key={`claimed-certificate-${mode}`}
                        type="file"
                        accept="application/pdf"
                        onChange={(
                          event
                        ) =>
                          setFile(
                            event
                              .target
                              .files?.[0] ||
                              null
                          )
                        }
                      />
                    </label>

                    <p className="notice">
                      Add the PDF supplied
                      by the credential
                      holder to compare it
                      directly with the
                      official certificate.
                      A modified document
                      will be reported as
                      TAMPERED.
                    </p>
                  </>
                )}
              </>
            )}

            <Button
              className="primary"
              disabled={
                loading
              }
            >
              {loading ? (
                "Verifying…"
              ) : (
                <>
                  <Upload
                    size={17}
                  />
                  Verify now
                </>
              )}
            </Button>
          </form>
        </Card>
      </div>

      <State
        loading={
          loading
        }
        error={
          error
        }
        empty={
          false
        }
      >
        {result && (
          <VerificationResult
            data={
              result
            }
          />
        )}
      </State>
    </div>
  );
}

export function VerificationResult({
  data,
}: {
  data: Record<
    string,
    unknown
  >;
}) {
  const outcome =
    String(
      data.outcome ||
        data.result ||
        data.status ||
        "UNKNOWN"
    ).toUpperCase();

  const credential =
    data.credential &&
    typeof data.credential ===
      "object"
      ? (data.credential as Record<
          string,
          unknown
        >)
      : null;

  const blockchain =
    data.blockchain &&
    typeof data.blockchain ===
      "object"
      ? (data.blockchain as Record<
          string,
          unknown
        >)
      : null;

  const ipfs =
    data.ipfs &&
    typeof data.ipfs ===
      "object"
      ? (data.ipfs as Record<
          string,
          unknown
        >)
      : null;

  const integrity =
    data.integrity &&
    typeof data.integrity ===
      "object"
      ? (data.integrity as Record<
          string,
          unknown
        >)
      : null;

  const display = (
    label: string,
    value: unknown
  ) => {
    if (
      value === null ||
      value ===
        undefined ||
      value === ""
    ) {
      return null;
    }

    return (
      <div>
        <dt>
          {label}
        </dt>

        <dd>
          {String(
            value
          )}
        </dd>
      </div>
    );
  };

  const ipfsStatus =
    ipfs?.available ===
    true
      ? "Available"
      : ipfs?.available ===
        false
      ? "Unavailable"
      : "Unknown";

  const integrityStatus =
    integrity?.matchesOfficialHash ===
    true
      ? "Matches official certificate"
      : integrity?.matchesOfficialHash ===
        false
      ? "Does not match official certificate"
      : null;

  const heading =
    outcome ===
    "VERIFIED"
      ? "Credential verified"
      : outcome ===
        "TAMPERED"
      ? "Certificate integrity mismatch"
      : outcome ===
        "REVOKED"
      ? "Credential revoked"
      : outcome ===
        "UNKNOWN"
      ? "Credential not found"
      : outcome ===
        "PENDING"
      ? "Credential verification pending"
      : outcome ===
        "FAILED"
      ? "Credential processing failed"
      : outcome ===
        "SYSTEM_INCONSISTENCY"
      ? "Credential requires review"
      : "Verification result";

  return (
    <Card className="result">
      <Badge
        value={
          outcome
        }
      />

      <h2>
        {heading}
      </h2>

      {outcome ===
        "TAMPERED" && (
        <div
          className="notice error"
          role="alert"
        >
          The uploaded PDF does not
          match the certificate stored
          for this credential. Do not
          treat the uploaded document as
          authentic.
        </div>
      )}

      {credential ? (
        <dl>
          {display(
            "Holder",
            credential.studentName
          )}

          {display(
            "Registration number",
            credential.maskedStudentNumber
          )}

          {display(
            "Institution",
            credential.institutionName
          )}

          {display(
            "Programme",
            credential.programme
          )}

          {display(
            "Qualification",
            credential.qualification
          )}

          {display(
            "Issue date",
            credential.issueDate
          )}

          {display(
            "Credential status",
            credential.status
          )}

          {integrityStatus &&
            display(
              "Document integrity",
              integrityStatus
            )}

          {display(
            "Blockchain proof",
            blockchain?.confirmed ===
              true
              ? "Confirmed"
              : "Not confirmed"
          )}

          {display(
            "IPFS evidence",
            ipfsStatus
          )}

          {display(
            "Verified at",
            data.verificationTime
          )}
        </dl>
      ) : (
        <p>
          No matching credential
          record was found.
        </p>
      )}
    </Card>
  );
}

export function NotFound() {
  return (
    <div className="narrow page">
      <h1>
        Page not found
      </h1>

      <p>
        The page may have
        moved or you may not
        have access.
      </p>

      <Link
        className="button primary"
        to="/"
      >
        Return home
      </Link>
    </div>
  );
}