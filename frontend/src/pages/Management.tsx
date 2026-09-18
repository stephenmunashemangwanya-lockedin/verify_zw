import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { api, downloadBlob } from "../api/client";
import { Badge, Button, Card, ConfirmDialog, State } from "../components/ui";
import { DataTable, type Column } from "../components/DataTable";
import { useAuth } from "../context/AuthContext";
import type { JsonRecord } from "../types";
type Kind =
  | "institutions"
  | "users"
  | "students"
  | "credentials"
  | "verification-logs"
  | "audit-logs";
const responseKey: Record<Kind, string> = {
  institutions: "institutions",
  users: "users",
  students: "students",
  credentials: "credentials",
  "verification-logs": "verificationLogs",
  "audit-logs": "auditLogs",
};
export function ManagementPage({ kind }: { kind: Kind }) {
  return <ManagementList key={kind} kind={kind} />;
}
function ManagementList({ kind }: { kind: Kind }) {
  const { user } = useAuth();
  const [blockchainMessage, setBlockchainMessage] = useState("");
  const [blockchainError, setBlockchainError] = useState("");
  const [pendingInstitutionId, setPendingInstitutionId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState("");
  const debounced = useDebounce(search);
  const path = kind;
  const q = useQuery({
    queryKey: [kind, page, debounced, status, sort],
    queryFn: async () => {
      const r = await api.get(`/${path}`, {
        params: {
          page,
          limit: 20,
          search: kind === "verification-logs" ? undefined : debounced || undefined,
          ...(kind === "verification-logs" ? { result: status || undefined } : ["institutions", "users", "credentials"].includes(kind) ? { status: status || undefined } : {}),
          sortBy: sort || undefined,
        },
      });
      return r.data;
    },
  });
  const authoriseInstitution = useMutation({
    mutationFn: async (institutionId: string) =>
      api.post(`/institutions/${institutionId}/blockchain/authorise`),

    onMutate: (institutionId) => {
      setPendingInstitutionId(institutionId);
      setBlockchainMessage("");
      setBlockchainError("");
    },

    onSuccess: (response) => {
      setBlockchainMessage(
        response.data.message ||
          "Institution blockchain wallet authorised successfully."
      );
      void q.refetch();
    },

    onError: (value: { message?: string }) => {
      setBlockchainError(
        value.message || "Institution blockchain authorisation failed."
      );
    },

    onSettled: () => {
      setPendingInstitutionId(null);
    },
  });
  const rows = (q.data?.[responseKey[kind]] || []) as JsonRecord[];
  const baseColumns = useMemo(() => columnsFor(kind), [kind]);

  const columns: Column<JsonRecord>[] =
    kind === "institutions" && user?.role === "super_admin"
      ? [
          ...baseColumns,
          {
            key: "blockchain",
            label: "Blockchain",
            render: (record) => {
              const institutionId = String(record.id);

              return (
                <Button
                  disabled={authoriseInstitution.isPending}
                  onClick={() => {
                    const confirmed = window.confirm(
                      `Authorise ${String(
                        record.name
                      )} to issue credentials on Sepolia?`
                    );

                    if (confirmed) {
                      authoriseInstitution.mutate(institutionId);
                    }
                  }}
                >
                  {authoriseInstitution.isPending &&
                  pendingInstitutionId === institutionId
                    ? "Authorising..."
                    : "Authorise on blockchain"}
                </Button>
              );
            },
          },
        ]
      : baseColumns;
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <span className="eyebrow">Records</span>
          <h1>{title(kind)}</h1>
        </div>
        {canCreate(kind) && (
          <Link className="button primary" to={`/app/${kind}/new`}>
            Create new
          </Link>
        )}
      </div>
      <Card>
        <div className="filters">
          {kind !== "verification-logs" && <label>
            Search
            <input
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </label>}
          {["institutions", "users", "credentials", "verification-logs"].includes(kind) && <label>
            {kind === "verification-logs" ? "Result" : "Status"}
            <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
              <option value="">All</option>
              {(kind === "verification-logs" ? ["VERIFIED", "REVOKED", "UNKNOWN", "PENDING", "FAILED", "SYSTEM_INCONSISTENCY", "INVALID_FILE"] : kind === "credentials" ? ["pending", "processing", "active", "failed", "revoked"] : ["active", "inactive"]).map(value => <option key={value}>{value}</option>)}
            </select>
          </label>}
        </div>
        {blockchainError && (
          <div className="notice error" role="alert">
            {blockchainError}
          </div>
        )}

        {blockchainMessage && (
          <div className="notice success">
            {blockchainMessage}
          </div>
        )}
        <DataTable
          rows={rows}
          columns={columns}
          loading={q.isLoading}
          error={q.error}
          page={page}
          totalPages={q.data?.pagination?.totalPages || 1}
          tableLabel={title(kind)}
          onPage={setPage}
          onSort={(value) => { setSort(value); setPage(1); }}
        />
      </Card>
    </div>
  );
}
function title(k: string) {
  return k
    .split("-")
    .map((x) => x[0].toUpperCase() + x.slice(1))
    .join(" ");
}
function canCreate(k: Kind) {
  return ["institutions", "users", "students", "credentials"].includes(k);
}
function columnsFor(k: Kind): Column<JsonRecord>[] {
  const text = (key: string, label: string, sortable = false, field = key): Column<JsonRecord> => ({ key, label, sortable, render: r => String(r[field] ?? "?") });
  const linked = (key: string, label: string, field = key): Column<JsonRecord> => ({ key, label, sortable: true, render: r => <Link to={`/app/${k}/${String(r.id)}`}>{String(r[field] ?? "?")}</Link> });
  const badge = (key: string, label: string, field = key): Column<JsonRecord> => ({ key, label, sortable: true, render: r => <Badge value={typeof r[field] === "boolean" ? r[field] ? "active" : "inactive" : String(r[field] ?? "Unknown")} /> });
  switch (k) {
    case "institutions": return [text("name", "Institution", true), text("email", "Email", true), badge("status", "Status"), text("created_at", "Created", true)];
    case "users": return [linked("full_name", "Name", "fullName"), text("email", "Email", true), text("role", "Role", true), badge("is_active", "Status", "isActive"), text("created_at", "Created", true, "createdAt")];
    case "students": return [linked("full_name", "Student"), text("student_number", "Student number", true), text("programme", "Programme", true), text("institution_name", "Institution"), text("created_at", "Created", true)];
    case "credentials": return [linked("qualification", "Qualification"), text("student_name", "Student"), text("institution_name", "Institution"), badge("status", "Status"), text("issue_date", "Issue date", true)];
    case "verification-logs": return [text("credential_id", "Credential ID"), {key: "result", label: "Result", sortable: true, render: r => <Badge value={String(r.result_code ?? r.result ?? "Unknown")} />}, text("verification_method", "Method", true), text("verification_time", "Verified at", true)];
    case "audit-logs": return [text("action", "Action", true), text("entity_type", "Entity type", true), text("entity_id", "Entity ID"), text("created_at", "Created", true)];
  }
}
function useDebounce(v: string) {
  const [state, setState] = useState(v);
  useEffect(() => {
    const t = setTimeout(() => setState(v), 350);
    return () => clearTimeout(t);
  }, [v]);
  return state;
}
export function CreatePage({
  kind,
}: {
  kind: "institutions" | "users" | "students" | "credentials";
}) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [credentialInstitutionId, setCredentialInstitutionId] = useState(
    user?.institutionId || ""
  );
  const [studentSearch, setStudentSearch] = useState("");
  const debouncedStudentSearch = useDebounce(studentSearch);
  const institutions = useQuery({
    queryKey: ["institutions", "provisioning"],
    queryFn: async () => {
      const r = await api.get("/institutions", {
        params: { limit: 100, status: "active" },
      });
      return r.data.institutions || [];
    },
    enabled:
      (kind === "users" || kind === "students" || kind === "credentials") &&
      user?.role === "super_admin",
  });
  const eligibleStudents = useQuery({
    queryKey: [
      "students",
      "issuance",
      credentialInstitutionId,
      debouncedStudentSearch,
    ],
    queryFn: async () =>
      (
        await api.get("/students", {
          params: {
            institutionId: credentialInstitutionId || undefined,
            search: debouncedStudentSearch || undefined,
            page: 1,
            limit: 20,
          },
        })
      ).data.students || [],
    enabled: kind === "credentials" && Boolean(credentialInstitutionId),
  });
  const mut = useMutation({
    mutationFn: async (form: HTMLFormElement) => {
      const data = new FormData(form);
      if (kind === "credentials") return api.post("/credentials/issue", data);
      const body = Object.fromEntries(data.entries());
      if (kind === "users" && user?.role === "institution_admin")
        delete body.institutionId;
      return api.post(`/${kind}`, body);
    },
    onSuccess: () => {
      setMsg(`${title(kind)} record created successfully.`);
      void qc.invalidateQueries({ queryKey: [kind] });
    },
    onError: (e: { message?: string }) =>
      setError(e.message || "Unable to create record."),
  });
  const roles =
    user?.role === "super_admin"
      ? ["institution_admin", "issuer", "verifier", "student", "super_admin"]
      : ["issuer", "verifier", "student"];
  return (
    <div className="page narrow">
      <h1>
        {kind === "credentials"
          ? "Issue credential"
          : `Create ${title(kind).slice(0, -1)}`}
      </h1>
      <Card>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError("");
            mut.mutate(e.currentTarget);
          }}
        >
          {kind === "institutions" && (
            <>
              <Field name="name" label="Institution name" />
              <Field name="walletAddress" label="Wallet address" />
              <Field name="email" label="Email" type="email" />
              <label>Phone (optional)<input name="phone" type="tel" maxLength={30} /></label>
            </>
          )}
          {kind === "users" && (
            <>
              <Field name="fullName" label="Full name" />
              <Field name="email" label="Email" type="email" />
              <label>
                Role
                <select required name="role">
                  {roles.map((role) => (
                    <option key={role} value={role}>
                      {role.replaceAll("_", " ")}
                    </option>
                  ))}
                </select>
              </label>
              {user?.role === "super_admin" ? (
                <label>
                  Institution
                  <select name="institutionId">
                    <option value="">Global (super administrator only)</option>
                    {(institutions.data || []).map((i: JsonRecord) => (
                      <option key={String(i.id)} value={String(i.id)}>
                        {String(i.name)}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <p className="notice">
                  Institution is fixed to your institution.
                </p>
              )}
            </>
          )}
          {kind === "students" && (
            <>
              <Field name="fullName" label="Full name" />
              <Field name="studentNumber" label="Student number" />
              <Field name="email" label="Email" type="email" />
              <Field name="programme" label="Programme" />
              {user?.role === "super_admin" ? (
                <label>
                  Institution
                  <select required name="institutionId">
                    <option value="">Select active institution</option>
                    {(institutions.data || []).map(
                      (institution: JsonRecord) => (
                        <option
                          key={String(institution.id)}
                          value={String(institution.id)}
                        >
                          {String(institution.name)}
                        </option>
                      )
                    )}
                  </select>
                </label>
              ) : (
                <>
                  <input
                    type="hidden"
                    name="institutionId"
                    value={user?.institutionId || ""}
                  />
                  <p className="notice">
                    Institution is fixed to your institution.
                  </p>
                </>
              )}
            </>
          )}
          {kind === "credentials" && (
            <>
              {user?.role === "super_admin" ? (
                <label>
                  Institution
                  <select
                    required
                    name="institutionId"
                    value={credentialInstitutionId}
                    onChange={(event) =>
                      setCredentialInstitutionId(event.target.value)
                    }
                  >
                    <option value="">Select active institution</option>
                    {(institutions.data || []).map(
                      (institution: JsonRecord) => (
                        <option
                          key={String(institution.id)}
                          value={String(institution.id)}
                        >
                          {String(institution.name)}
                        </option>
                      )
                    )}
                  </select>
                </label>
              ) : (
                <>
                  <input
                    type="hidden"
                    name="institutionId"
                    value={user?.institutionId || ""}
                  />
                  <p className="notice">
                    Institution is fixed to your institution.
                  </p>
                </>
              )}
              <label>
                Find student
                <input
                  type="search"
                  value={studentSearch}
                  maxLength={200}
                  onChange={(event) => setStudentSearch(event.target.value)}
                />
              </label>
              <label>
                Student
                <select required name="studentId">
                  <option value="">Select student</option>
                  {(eligibleStudents.data || []).map((student: JsonRecord) => (
                    <option key={String(student.id)} value={String(student.id)}>
                      {String(student.full_name || student.fullName)} —{" "}
                      {String(student.student_number || student.studentNumber)}
                    </option>
                  ))}
                </select>
              </label>
              <Field name="qualification" label="Qualification" />
              <Field name="issueDate" label="Issue date" type="date" />
              <Field
                name="certificate"
                label="Certificate PDF"
                type="file"
                accept="application/pdf"
              />
            </>
          )}
          <Button className="primary" disabled={mut.isPending}>
            {mut.isPending ? "Processing—wait for confirmation…" : "Submit"}
          </Button>
          {error && <div className="notice error">{error}</div>}
          {msg && <div className="notice success">{msg}</div>}
        </form>
      </Card>
    </div>
  );
}
function Field(p: {
  name: string;
  label: string;
  type?: string;
  accept?: string;
  defaultValue?: string;
}) {
  return (
    <label>
      {p.label}
      <input
        required
        name={p.name}
        type={p.type || "text"}
        accept={p.accept}
        defaultValue={p.defaultValue}
      />
    </label>
  );
}
export function StudentDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [institutionChange, setInstitutionChange] = useState<string | null>(
    null
  );
  const student = useQuery({
    queryKey: ["students", id],
    queryFn: async () => (await api.get(`/students/${id}`)).data.student,
  });
  const credentials = useQuery({
    queryKey: ["credentials", "student", id],
    queryFn: async () =>
      (await api.get("/credentials", { params: { studentId: id, limit: 20 } }))
        .data,
    enabled: Boolean(student.data),
  });
  const institutions = useQuery({
    queryKey: ["institutions", "student-edit"],
    queryFn: async () =>
      (
        await api.get("/institutions", {
          params: { limit: 100, status: "active" },
        })
      ).data.institutions || [],
    enabled: user?.role === "super_admin",
  });
  const complete = (text: string) => {
    setMessage(text);
    setError("");
    setInstitutionChange(null);
    void student.refetch();
    void queryClient.invalidateQueries({ queryKey: ["students"] });
  };
  const save = useMutation({
    mutationFn: (body: JsonRecord) => api.patch(`/students/${id}`, body),
    onSuccess: (response) =>
      complete(response.data.message || "Student updated."),
    onError: (value: { message?: string }) =>
      setError(value.message || "Unable to update student."),
  });
  const reassign = useMutation({
    mutationFn: (institutionId: string) =>
      api.patch(`/students/${id}/institution`, { institutionId }),
    onSuccess: (response) =>
      complete(response.data.message || "Student institution reassigned."),
    onError: (value: { message?: string }) =>
      setError(value.message || "Unable to reassign student."),
  });
  const record = (student.data || {}) as JsonRecord;
  const canEdit = ["super_admin", "institution_admin", "issuer"].includes(
    user?.role || ""
  );
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <span className="eyebrow">Student management</span>
          <h1>Student details</h1>
        </div>
        <Link className="button" to="/app/students">
          Back to students
        </Link>
      </div>
      <State
        loading={student.isLoading}
        error={student.error}
        empty={!student.data}
      >
        <div className="grid two">
          <Card title="Academic identity">
            {canEdit ? (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  const data = new FormData(event.currentTarget);
                  save.mutate({
                    studentNumber: data.get("studentNumber"),
                    fullName: data.get("fullName"),
                    email: data.get("email") || null,
                    programme: data.get("programme"),
                  });
                }}
              >
                <Field
                  name="studentNumber"
                  label="Student number"
                  defaultValue={String(record.student_number || "")}
                />
                <Field
                  name="fullName"
                  label="Full name"
                  defaultValue={String(record.full_name || "")}
                />
                <label>
                  Email
                  <input
                    name="email"
                    type="email"
                    defaultValue={String(record.email || "")}
                  />
                </label>
                <Field
                  name="programme"
                  label="Programme"
                  defaultValue={String(record.programme || "")}
                />
                <Button className="primary" disabled={save.isPending}>
                  {save.isPending ? "Saving…" : "Save student"}
                </Button>
              </form>
            ) : (
              <dl>
                <div>
                  <dt>Student number</dt>
                  <dd>{String(record.student_number)}</dd>
                </div>
                <div>
                  <dt>Full name</dt>
                  <dd>{String(record.full_name)}</dd>
                </div>
                <div>
                  <dt>Email</dt>
                  <dd>{String(record.email || "Not provided")}</dd>
                </div>
                <div>
                  <dt>Programme</dt>
                  <dd>{String(record.programme)}</dd>
                </div>
              </dl>
            )}
          </Card>
          <Card title="Institution and credentials">
            <dl>
              <div>
                <dt>Institution</dt>
                <dd>
                  {String(record.institution_name || "Unknown institution")}
                </dd>
              </div>
              <div>
                <dt>Related credentials</dt>
                <dd>
                  {Number(
                    credentials.data?.pagination?.total ??
                      credentials.data?.total ??
                      0
                  )}
                </dd>
              </div>
              <div>
                <dt>Created</dt>
                <dd>{String(record.created_at || "").slice(0, 10)}</dd>
              </div>
            </dl>
            {user?.role === "super_admin" && (
              <label>
                Reassign institution
                <select
                  aria-label="Reassign institution"
                  value={
                    institutionChange || String(record.institution_id || "")
                  }
                  onChange={(event) => setInstitutionChange(event.target.value)}
                >
                  <option value="" disabled>
                    Select active institution
                  </option>
                  {(institutions.data || []).map((institution: JsonRecord) => (
                    <option
                      key={String(institution.id)}
                      value={String(institution.id)}
                    >
                      {String(institution.name)}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </Card>
        </div>
        {error && (
          <div className="notice error" role="alert">
            {error}
          </div>
        )}
        {message && <div className="notice success">{message}</div>}
      </State>
      <ConfirmDialog
        open={Boolean(
          institutionChange && institutionChange !== record.institution_id
        )}
        title="Reassign this student?"
        onCancel={() => setInstitutionChange(null)}
        onConfirm={() =>
          institutionChange && reassign.mutate(institutionChange)
        }
      >
        <p>
          Reassignment is allowed only when the student has no credential
          history. Existing credentials are never moved or rewritten.
        </p>
      </ConfirmDialog>
    </div>
  );
}

export function CredentialDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const q = useQuery({
    queryKey: ["credentials", id],
    queryFn: async () => {
      const r = await api.get(`/credentials/${id}`);
      return r.data.credential;
    },
  });
  const revoke = useMutation({
    mutationFn: () => api.patch(`/credentials/${id}/revoke`, { reason }),
    onSuccess: () => {
      setOpen(false);
      void qc.invalidateQueries({ queryKey: ["credentials", id] });
    },
  });
  const pdf = useMutation({
    mutationFn: () => api.post(`/credentials/${id}/generate-pdf`),
  });
  const download = useMutation({
    mutationFn: () =>
      downloadBlob(`/credentials/${id}/pdf`, `credential-${id}.pdf`),
  });
  const c = (q.data || {}) as JsonRecord;
  const explorer = String(
    import.meta.env.VITE_BLOCK_EXPLORER_URL || ""
  ).replace(/\/$/, "");
  const gateway = String(import.meta.env.VITE_IPFS_GATEWAY || "").replace(
    /\/$/,
    ""
  );
  return (
    <div className="page">
      <h1>Credential details</h1>
      <State loading={q.isLoading} error={q.error} empty={!q.data}>
        <Card>
          <Badge value={String(c.status || "unknown")} />
          <dl>
            {[
              "student_name",
              "student_number",
              "institution_name",
              "qualification",
              "issue_date",
              "certificate_hash",
              "ipfs_cid",
              "blockchain_tx",
              "blockchain_network",
              "block_number",
              "contract_address",
              "revocation_reason",
              "revoked_at",
            ].map(
              (k) =>
                c[k] != null && (
                  <div key={k}>
                    <dt>{k.replaceAll("_", " ")}</dt>
                    <dd>
                      <code>{String(c[k])}</code>
                    </dd>
                  </div>
                )
            )}
          </dl>
          {Boolean(c.qr_code_path) && (
            <img
              className="qr"
              src={String(c.qr_code_path)}
              alt="Credential verification QR code"
            />
          )}
          <div className="actions">
            {Boolean(gateway && c.ipfs_cid) && (
              <a
                className="button"
                href={`${gateway}/${encodeURIComponent(String(c.ipfs_cid))}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                View IPFS evidence
              </a>
            )}
            {Boolean(explorer && c.blockchain_tx) && (
              <a
                className="button"
                href={`${explorer}/tx/${encodeURIComponent(
                  String(c.blockchain_tx)
                )}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                View transaction
              </a>
            )}
            {user?.role !== "verifier" && (
              <Button onClick={() => pdf.mutate()} disabled={pdf.isPending}>
                {pdf.isPending ? "Generating…" : "Generate PDF"}
              </Button>
            )}
            <Button
              onClick={() => download.mutate()}
              disabled={download.isPending}
            >
              {download.isPending
                ? "Downloading…"
                : "Download presentation PDF"}
            </Button>
            {c.status === "active" &&
              ["super_admin", "institution_admin"].includes(
                user?.role || ""
              ) && (
                <Button className="danger" onClick={() => setOpen(true)}>
                  Revoke credential
                </Button>
              )}
          </div>
          {pdf.isSuccess && (
            <div className="notice success">
              Certificate generation confirmed by the API.
            </div>
          )}
          {download.error && (
            <div className="notice error" role="alert">
              {(download.error as { message?: string }).message ||
                "Presentation certificate is unavailable."}
            </div>
          )}
        </Card>
      </State>
      <ConfirmDialog
        open={open}
        title="Revoke this credential?"
        onCancel={() => setOpen(false)}
        onConfirm={() => revoke.mutate()}
      >
        <p>
          This action is permanent and requires a confirmed blockchain
          transaction.
        </p>
        <label>
          Revocation reason
          <textarea
            value={reason}
            minLength={5}
            maxLength={1000}
            onChange={(e) => setReason(e.target.value)}
            required
          />
        </label>
        {revoke.error && (
          <div className="notice error">
            {(revoke.error as { message?: string }).message}
          </div>
        )}
      </ConfirmDialog>
    </div>
  );
}
export function Profile() {
  const { user } = useAuth();
  return (
    <div className="page narrow">
      <h1>Your profile</h1>
      <Card>
        <dl>
          <div>
            <dt>Name</dt>
            <dd>{user?.fullName}</dd>
          </div>
          <div>
            <dt>Email</dt>
            <dd>{user?.email}</dd>
          </div>
          <div>
            <dt>Role</dt>
            <dd>
              <Badge value={user?.role || ""} />
            </dd>
          </div>
        </dl>
        <Link className="button" to="/app/change-password">
          Change password
        </Link>
      </Card>
    </div>
  );
}

/* Replaced below with the readable Phase 5 implementation.
export function UserDetail(){const{id}=useParams();const{user:actor}=useAuth();const qc=useQueryClient();const[confirm,setConfirm]=useState<{title:string;path:string;body?:JsonRecord}|null>(null);const[message,setMessage]=useState('');const[error,setError]=useState('');const q=useQuery({queryKey:['users',id],queryFn:async()=>{const r=await api.get(`/users/${id}`);return r.data.user}});const institutions=useQuery({queryKey:['institutions','user-edit'],queryFn:async()=>{const r=await api.get('/institutions',{params:{limit:100,status:'active'}});return r.data.institutions||[]},enabled:actor?.role==='super_admin'});const action=useMutation({mutationFn:async(v:{path:string;body?:JsonRecord})=>api.post(v.path,v.body||{}),onSuccess:r=>{setConfirm(null);setMessage(r.data.message||'Account updated.');setError('');void q.refetch();void qc.invalidateQueries({queryKey:['users'])},onError:(e:{message?:string})=>setError(e.message||'Unable to update account.')});const patch=useMutation({mutationFn:async(v:{path:string;body:JsonRecord})=>api.patch(v.path,v.body),onSuccess:()=>{setMessage('Account updated.');setError('');void q.refetch();void qc.invalidateQueries({queryKey:['users'])},onError:(e:{message?:string})=>setError(e.message||'Unable to update account.')});const u=(q.data||{})as JsonRecord;const roles=actor?.role==='super_admin'?['super_admin','institution_admin','issuer','verifier']:['issuer','verifier'];const sensitive=(title:string,path:string,body?:JsonRecord)=>setConfirm({title,path,body});return <div className="page"><div className="page-head"><div><span className="eyebrow">User administration</span><h1>User details</h1></div><Link className="button" to="/app/users">Back to users</Link></div><State loading={q.isLoading} error={q.error} empty={!q.data}><div className="grid two"><Card title="Identity"><form onSubmit={e=>{e.preventDefault();const data=new FormData(e.currentTarget);patch.mutate({path:`/users/${id}`,body:{fullName:data.get('fullName'),email:data.get('email')}})}}><Field name="fullName" label="Full name" defaultValue={String(u.fullName||'')}/><label>Email<input required name="email" type="email" defaultValue={String(u.email||'')}/></label><Button className="primary" disabled={patch.isPending}>Save identity</Button></form></Card><Card title="Security status"><dl><div><dt>Role</dt><dd><Badge value={String(u.role||'')}/></dd></div><div><dt>Institution</dt><dd>{String(u.institutionName||u.institutionId||'Global')}</dd></div><div><dt>Account</dt><dd>{u.isActive?'Active':'Inactive'}</dd></div><div><dt>Lock</dt><dd>{u.isLocked?'Locked':'Unlocked'}</dd></div><div><dt>Password change</dt><dd>{u.mustChangePassword?'Required':'Not required'}</dd></div><div><dt>Last login</dt><dd>{u.lastLoginAt?new Date(String(u.lastLoginAt)).toLocaleString():'Never'}</dd></div></dl></Card></div><Card title="Administrative controls"><div className="actions"><label>Role<select aria-label="Role" defaultValue={String(u.role||'')} onChange={e=>sensitive('Change this user role?',`/users/${id}/role`,{role:e.target.value})}>{roles.map(r=><option key={r} value={r}>{r.replaceAll('_',' ')}</option>)}</select></label>{actor?.role==='super_admin'&&u.role!=='super_admin'&&<label>Institution<select aria-label="Institution" defaultValue={String(u.institutionId||'')} onChange={e=>sensitive('Reassign this user institution?',`/users/${id}/institution`,{institutionId:e.target.value})}><option value="" disabled>Select institution</option>{(institutions.data||[]).map((i:JsonRecord)=><option key={String(i.id)} value={String(i.id)}>{String(i.name)}</option>)}</select></label>}<Button onClick={()=>sensitive(u.isActive?'Deactivate this account?':'Activate this account?',`/users/${id}/status`,{isActive:!u.isActive})}>{u.isActive?'Deactivate':'Activate'}</Button>{u.isLocked&&<Button onClick={()=>sensitive('Unlock this account?',`/users/${id}/unlock`)}>Unlock</Button>}<Button onClick={()=>sensitive('Require a password change?',`/users/${id}/require-password-change`)}>Require password change</Button><Button onClick={()=>sensitive('Send password reset instructions?',`/users/${id}/reset-password`)}>Send password reset</Button></div>{error&&<div className="notice error" role="alert">{error}</div>}{message&&<div className="notice success">{message}</div>}</Card></State><ConfirmDialog open={Boolean(confirm)} title={confirm?.title||'Confirm action'} onCancel={()=>setConfirm(null)} onConfirm={()=>{if(!confirm)return;if(confirm.path.endsWith('/status')||confirm.path.endsWith('/role')||confirm.path.endsWith('/institution'))patch.mutate({path:confirm.path,body:confirm.body||{}});else action.mutate(confirm)}}><p>This security-sensitive action is recorded in the audit log and may invalidate existing sessions.</p></ConfirmDialog></div>}
*/

export function UserDetail() {
  const { id } = useParams();
  const { user: actor } = useAuth();
  const queryClient = useQueryClient();
  const [confirm, setConfirm] = useState<{
    title: string;
    path: string;
    body?: JsonRecord;
  } | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const query = useQuery({
    queryKey: ["users", id],
    queryFn: async () => (await api.get(`/users/${id}`)).data.user,
  });
  const institutions = useQuery({
    queryKey: ["institutions", "user-edit"],
    queryFn: async () =>
      (
        await api.get("/institutions", {
          params: { limit: 100, status: "active" },
        })
      ).data.institutions || [],
    enabled: actor?.role === "super_admin",
  });
  const complete = (text: string) => {
    setConfirm(null);
    setMessage(text);
    setError("");
    void query.refetch();
    void queryClient.invalidateQueries({ queryKey: ["users"] });
  };
  const fail = (value: { message?: string }) =>
    setError(value.message || "Unable to update account.");
  const postAction = useMutation({
    mutationFn: (value: { path: string; body?: JsonRecord }) =>
      api.post(value.path, value.body || {}),
    onSuccess: (response) =>
      complete(response.data.message || "Account updated."),
    onError: fail,
  });
  const patchAction = useMutation({
    mutationFn: (value: { path: string; body: JsonRecord }) =>
      api.patch(value.path, value.body),
    onSuccess: () => complete("Account updated."),
    onError: fail,
  });
  const target = (query.data || {}) as JsonRecord;
  const roles =
    actor?.role === "super_admin"
      ? ["super_admin", "institution_admin", "issuer", "verifier", "student"]
      : ["issuer", "verifier", "student"];
  const sensitive = (title: string, path: string, body?: JsonRecord) =>
    setConfirm({ title, path, body });
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <span className="eyebrow">User administration</span>
          <h1>User details</h1>
        </div>
        <Link className="button" to="/app/users">
          Back to users
        </Link>
      </div>
      <State loading={query.isLoading} error={query.error} empty={!query.data}>
        <div className="grid two">
          <Card title="Identity">
            <form
              onSubmit={(event) => {
                event.preventDefault();
                const data = new FormData(event.currentTarget);
                patchAction.mutate({
                  path: `/users/${id}`,
                  body: {
                    fullName: data.get("fullName"),
                    email: data.get("email"),
                  },
                });
              }}
            >
              <Field
                name="fullName"
                label="Full name"
                defaultValue={String(target.fullName || "")}
              />
              <label>
                Email
                <input
                  required
                  name="email"
                  type="email"
                  defaultValue={String(target.email || "")}
                />
              </label>
              <Button className="primary" disabled={patchAction.isPending}>
                Save identity
              </Button>
            </form>
          </Card>
          <Card title="Security status">
            <dl>
              <div>
                <dt>Role</dt>
                <dd>
                  <Badge value={String(target.role || "")} />
                </dd>
              </div>
              <div>
                <dt>Institution</dt>
                <dd>
                  {String(
                    target.institutionName || target.institutionId || "Global"
                  )}
                </dd>
              </div>
              <div>
                <dt>Account</dt>
                <dd>{target.isActive ? "Active" : "Inactive"}</dd>
              </div>
              <div>
                <dt>Lock</dt>
                <dd>{target.isLocked ? "Locked" : "Unlocked"}</dd>
              </div>
              <div>
                <dt>Password change</dt>
                <dd>
                  {target.mustChangePassword ? "Required" : "Not required"}
                </dd>
              </div>
              <div>
                <dt>Last login</dt>
                <dd>
                  {target.lastLoginAt
                    ? new Date(String(target.lastLoginAt)).toLocaleString()
                    : "Never"}
                </dd>
              </div>
            </dl>
          </Card>
        </div>
        <Card title="Administrative controls">
          <div className="actions">
            <label>
              Role
              <select
                aria-label="Role"
                value={String(target.role || "")}
                onChange={(event) =>
                  sensitive("Change this user role?", `/users/${id}/role`, {
                    role: event.target.value,
                  })
                }
              >
                {roles.map((role) => (
                  <option key={role} value={role}>
                    {role.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </label>
            {actor?.role === "super_admin" && target.role !== "super_admin" && (
              <label>
                Institution
                <select
                  aria-label="Institution"
                  value={String(target.institutionId || "")}
                  onChange={(event) =>
                    sensitive(
                      "Reassign this user institution?",
                      `/users/${id}/institution`,
                      { institutionId: event.target.value }
                    )
                  }
                >
                  <option value="" disabled>
                    Select institution
                  </option>
                  {(institutions.data || []).map((institution: JsonRecord) => (
                    <option
                      key={String(institution.id)}
                      value={String(institution.id)}
                    >
                      {String(institution.name)}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <Button
              onClick={() =>
                sensitive(
                  target.isActive
                    ? "Deactivate this account?"
                    : "Activate this account?",
                  `/users/${id}/status`,
                  { isActive: !target.isActive }
                )
              }
            >
              {target.isActive ? "Deactivate" : "Activate"}
            </Button>
            {Boolean(target.isLocked) && (
              <Button
                onClick={() =>
                  sensitive("Unlock this account?", `/users/${id}/unlock`)
                }
              >
                Unlock
              </Button>
            )}
            <Button
              onClick={() =>
                sensitive(
                  "Require a password change?",
                  `/users/${id}/require-password-change`
                )
              }
            >
              Require password change
            </Button>
            <Button
              onClick={() =>
                sensitive(
                  "Send password reset instructions?",
                  `/users/${id}/reset-password`
                )
              }
            >
              Send password reset
            </Button>
          </div>
          {error && (
            <div className="notice error" role="alert">
              {error}
            </div>
          )}
          {message && <div className="notice success">{message}</div>}
        </Card>
      </State>
      <ConfirmDialog
        open={Boolean(confirm)}
        title={confirm?.title || "Confirm action"}
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          if (!confirm) return;
          if (/\/(status|role|institution)$/.test(confirm.path))
            patchAction.mutate({
              path: confirm.path,
              body: confirm.body || {},
            });
          else postAction.mutate(confirm);
        }}
      >
        <p>
          This security-sensitive action is recorded in the audit log and may
          invalidate existing sessions.
        </p>
      </ConfirmDialog>
    </div>
  );
}
