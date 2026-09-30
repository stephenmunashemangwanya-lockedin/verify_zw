import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  Link,
  useParams,
} from "react-router-dom";

import QRCode from "qrcode";

import {
  api,
  downloadBlob,
} from "../api/client";

import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  State,
} from "../components/ui";

import {
  DataTable,
  type Column,
} from "../components/DataTable";

import {
  useAuth,
} from "../context/AuthContext";

import type {
  JsonRecord,
} from "../types";

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

export function ManagementPage({
  kind,
}: {
  kind: Kind;
}) {
  return (
    <ManagementList
      key={kind}
      kind={kind}
    />
  );
}


function InstitutionBlockchainControl({
  record,
  onMessage,
  onError,
}: {
  record: JsonRecord;
  onMessage: (message: string) => void;
  onError: (message: string) => void;
}) {
  const institutionId =
    String(record.id);

  const [
    localAuthorised,
    setLocalAuthorised,
  ] = useState<boolean | null>(
    null
  );

  const blockchainStatus =
    useQuery({
      queryKey: [
        "institution-blockchain-status",
        institutionId,
      ],

      queryFn:
        async () =>
          (
            await api.get(
              `/institutions/${institutionId}/blockchain/status`
            )
          ).data as {
            authorised?: boolean;
          },

      retry: false,
    });

  const authorise =
    useMutation({
      mutationFn:
        async () =>
          api.post(
            `/institutions/${institutionId}/blockchain/authorise`,
            {},
            {
              timeout: 120000,
            }
          ),

      onMutate:
        () => {
          onMessage("");
          onError("");
        },

      onSuccess:
        (response) => {
          setLocalAuthorised(
            true
          );

          onError("");

          onMessage(
            response.data
              ?.message ||
              "Institution blockchain wallet authorised successfully."
          );
        },

      onError:
        (
          value: {
            message?: string;
            response?: {
              data?: {
                message?: string;
              };
            };
          }
        ) => {
          onError(
            value.response
              ?.data
              ?.message ||
              value.message ||
              "Institution blockchain authorisation failed."
          );
        },
    });

  const deactivate =
    useMutation({
      mutationFn:
        async () =>
          api.post(
            `/institutions/${institutionId}/blockchain/deactivate`,
            {},
            {
              timeout: 120000,
            }
          ),

      onMutate:
        () => {
          onMessage("");
          onError("");
        },

      onSuccess:
        (response) => {
          setLocalAuthorised(
            false
          );

          onError("");

          onMessage(
            response.data
              ?.message ||
              "Institution blockchain wallet deactivated successfully."
          );
        },

      onError:
        (
          value: {
            message?: string;
            response?: {
              data?: {
                message?: string;
              };
            };
          }
        ) => {
          onError(
            value.response
              ?.data
              ?.message ||
              value.message ||
              "Institution blockchain deactivation failed."
          );
        },
    });

  if (
    blockchainStatus.isLoading
  ) {
    return (
      <span>
        Checking blockchain status...
      </span>
    );
  }

  if (
    blockchainStatus.isError
  ) {
    return (
      <Button disabled>
        Blockchain status unavailable
      </Button>
    );
  }

  const authorised =
    localAuthorised ??
    blockchainStatus.data
      ?.authorised === true;

  if (
    authorised
  ) {
    return (
      <Button
        disabled={
          deactivate.isPending
        }
        onClick={() => {
          const confirmed =
            window.confirm(
              `Deactivate ${String(
                record.name
              )} on Sepolia?`
            );

          if (
            confirmed
          ) {
            deactivate.mutate();
          }
        }}
      >
        {deactivate.isPending
          ? "Deactivating..."
          : "Deactivate on blockchain"}
      </Button>
    );
  }

  return (
    <Button
      disabled={
        authorise.isPending
      }
      onClick={() => {
        const confirmed =
          window.confirm(
            `Authorise ${String(
              record.name
            )} to issue credentials on Sepolia?`
          );

        if (
          confirmed
        ) {
          authorise.mutate();
        }
      }}
    >
      {authorise.isPending
        ? "Authorising..."
        : "Authorise on blockchain"}
    </Button>
  );
}

function InstitutionPlatformAction({
  record,
  onMessage,
  onError,
  onChanged,
}: {
  record: JsonRecord;
  onMessage: (message: string) => void;
  onError: (message: string) => void;
  onChanged: () => void;
}) {
  const institutionId =
    String(record.id);

  const platformActive =
    typeof record.status ===
    "boolean"
      ? record.status
      : String(
          record.status ||
            "active"
        ).toLowerCase() !==
        "inactive";

  const changeStatus =
    useMutation({
      mutationFn:
        async (
          nextStatus: boolean
        ) =>
          api.patch(
            `/institutions/${institutionId}/status`,
            {
              status:
                nextStatus,
            }
          ),

      onMutate:
        () => {
          onMessage("");
          onError("");
        },

      onSuccess:
        (response) => {
          onError("");

          onMessage(
            response.data
              ?.message ||
              "Institution status updated successfully."
          );

          onChanged();
        },

      onError:
        (
          value: {
            message?: string;
            response?: {
              data?: {
                message?: string;
              };
            };
          }
        ) => {
          onError(
            value.response
              ?.data
              ?.message ||
              value.message ||
              "Institution status update failed."
          );
        },
    });

  return (
    <Button
      disabled={
        changeStatus.isPending
      }
      onClick={() => {
        const nextStatus =
          !platformActive;

        const confirmed =
          window.confirm(
            platformActive
              ? `Deactivate ${String(
                  record.name
                )} as a platform institution?`
              : `Activate ${String(
                  record.name
                )} as a platform institution?`
          );

        if (
          confirmed
        ) {
          changeStatus.mutate(
            nextStatus
          );
        }
      }}
    >
      {changeStatus.isPending
        ? "Updating..."
        : platformActive
          ? "Deactivate institution"
          : "Activate institution"}
    </Button>
  );
}

function ManagementList({
  kind,
}: {
  kind: Kind;
}) {
  const { user } = useAuth();

  const [
    blockchainMessage,
    setBlockchainMessage,
  ] = useState("");

  const [
    blockchainError,
    setBlockchainError,
  ] = useState("");
const [
    page,
    setPage,
  ] = useState(1);

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    status,
    setStatus,
  ] = useState("");

  const [
    sort,
    setSort,
  ] = useState("");

  const debounced =
    useDebounce(search);

  const path =
    kind;

  const q = useQuery({
    queryKey: [
      kind,
      page,
      debounced,
      status,
      sort,
    ],

    queryFn: async () => {
      const r =
        await api.get(
          `/${path}`,
          {
            params: {
              page,
              limit: 20,

              search:
                kind ===
                "verification-logs"
                  ? undefined
                  : debounced ||
                    undefined,

              ...(kind ===
              "verification-logs"
                ? {
                    result:
                      status ||
                      undefined,
                  }
                : [
                      "institutions",
                      "users",
                      "credentials",
                    ].includes(
                      kind
                    )
                  ? {
                      status:
                        status ||
                        undefined,
                    }
                  : {}),

              sortBy:
                sort ||
                undefined,
            },
          }
        );

      return r.data;
    },
  });

  const rows =
    (
      q.data?.[
        responseKey[
          kind
        ]
      ] ||
      []
    ) as JsonRecord[];

  const baseColumns =
    useMemo(
      () =>
        columnsFor(
          kind
        ),
      [
        kind,
      ]
    );

  const columns: Column<JsonRecord>[] =
    kind === "institutions" &&
    user?.role === "super_admin"
      ? [
          ...baseColumns,

          {
            key: "blockchain",
            label: "Blockchain",

            render: (
              record
            ) => (
              <InstitutionBlockchainControl
                record={
                  record
                }
                onMessage={
                  setBlockchainMessage
                }
                onError={
                  setBlockchainError
                }
              />
            ),
          },

          {
            key:
              "platform-status-action",

            label:
              "Platform status",

            render: (
              record
            ) => (
              <InstitutionPlatformAction
                record={
                  record
                }
                onMessage={
                  setBlockchainMessage
                }
                onError={
                  setBlockchainError
                }
                onChanged={() => {
                  void q.refetch();
                }}
              />
            ),
          },
        ]
      : baseColumns;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <span className="eyebrow">
            Records
          </span>

          <h1>
            {title(
              kind
            )}
          </h1>
        </div>

        {canCreate(
          kind,
          user?.role
        ) && (
          <Link
            className="button primary"
            to={`/app/${kind}/new`}
          >
            Create new
          </Link>
        )}
      </div>

      <Card>
        <div className="filters">
          {kind !==
            "verification-logs" && (
            <label>
              Search

              <input
                type="search"
                value={
                  search
                }
                onChange={(
                  event
                ) => {
                  setSearch(
                    event
                      .target
                      .value
                  );

                  setPage(
                    1
                  );
                }}
              />
            </label>
          )}

          {[
            "institutions",
            "users",
            "credentials",
            "verification-logs",
          ].includes(
            kind
          ) && (
            <label>
              {kind ===
              "verification-logs"
                ? "Result"
                : "Status"}

              <select
                value={
                  status
                }
                onChange={(
                  event
                ) => {
                  setStatus(
                    event
                      .target
                      .value
                  );

                  setPage(
                    1
                  );
                }}
              >
                <option value="">
                  All
                </option>

                {(kind ===
                "verification-logs"
                  ? [
                      "VERIFIED",
                      "REVOKED",
                      "UNKNOWN",
                      "PENDING",
                      "FAILED",
                      "SYSTEM_INCONSISTENCY",
                      "INVALID_FILE",
                    ]
                  : kind ===
                      "credentials"
                    ? [
                        "pending",
                        "processing",
                        "active",
                        "failed",
                        "revoked",
                        "superseded",
                      ]
                    : [
                        "active",
                        "inactive",
                      ]
                ).map(
                  (
                    value
                  ) => (
                    <option
                      key={
                        value
                      }
                      value={
                        value
                      }
                    >
                      {
                        value
                      }
                    </option>
                  )
                )}
              </select>
            </label>
          )}
        </div>

        {blockchainError && (
          <div
            className="notice error"
            role="alert"
          >
            {
              blockchainError
            }
          </div>
        )}

        {blockchainMessage && (
          <div className="notice success">
            {
              blockchainMessage
            }
          </div>
        )}

        <DataTable
          rows={
            rows
          }
          columns={
            columns
          }
          loading={
            q.isLoading
          }
          error={
            q.error
          }
          page={
            page
          }
          totalPages={
            q.data
              ?.pagination
              ?.totalPages ||
            1
          }
          tableLabel={title(
            kind
          )}
          onPage={
            setPage
          }
          onSort={(
            value
          ) => {
            setSort(
              value
            );

            setPage(
              1
            );
          }}
        />
      </Card>
    </div>
  );
}

function title(
  k: string
) {
  return k
    .split("-")
    .map(
      (
        value
      ) =>
        value[0]
          .toUpperCase() +
        value.slice(
          1
        )
    )
    .join(" ");
}

function canCreate(
  kind: Kind,
  role?: string
) {
  if (
    !role
  ) {
    return false;
  }

  if (
    kind ===
    "institutions"
  ) {
    return (
      role ===
      "super_admin"
    );
  }

  if (
    kind ===
    "users"
  ) {
    return [
      "super_admin",
      "institution_admin",
    ].includes(
      role
    );
  }

  if (
    kind ===
      "students" ||
    kind ===
      "credentials"
  ) {
    return [
      "super_admin",
      "institution_admin",
      "issuer",
    ].includes(
      role
    );
  }

  return false;
}

function columnsFor(
  kind: Kind
): Column<JsonRecord>[] {
  const text = (
    key: string,
    label: string,
    sortable = false,
    field = key
  ): Column<JsonRecord> => ({
    key,
    label,
    sortable,

    render:
      (
        record
      ) =>
        String(
          record[
            field
          ] ??
            "?"
        ),
  });

  const linked = (
    key: string,
    label: string,
    field = key
  ): Column<JsonRecord> => ({
    key,
    label,
    sortable: true,

    render:
      (
        record
      ) => (
        <Link
          to={`/app/${kind}/${String(
            record.id
          )}`}
        >
          {String(
            record[
              field
            ] ??
              "?"
          )}
        </Link>
      ),
  });

  const badge = (
    key: string,
    label: string,
    field = key
  ): Column<JsonRecord> => ({
    key,
    label,
    sortable: true,

    render:
      (
        record
      ) => (
        <Badge
          value={
            typeof record[
              field
            ] ===
            "boolean"
              ? record[
                    field
                  ]
                ? "active"
                : "inactive"
              : String(
                  record[
                    field
                  ] ??
                    "Unknown"
                )
          }
        />
      ),
  });

  switch (
    kind
  ) {
    case "institutions":
      return [
        text(
          "name",
          "Institution",
          true
        ),

        text(
          "email",
          "Email",
          true
        ),

        badge(
          "status",
          "Status"
        ),

        text(
          "created_at",
          "Created",
          true
        ),
      ];

    case "users":
      return [
        linked(
          "full_name",
          "Name",
          "fullName"
        ),

        text(
          "email",
          "Email",
          true
        ),

        text(
          "role",
          "Role",
          true
        ),

        badge(
          "is_active",
          "Status",
          "isActive"
        ),

        text(
          "created_at",
          "Created",
          true,
          "createdAt"
        ),
      ];

    case "students":
      return [
        linked(
          "full_name",
          "Student"
        ),

        text(
          "student_number",
          "Student number",
          true
        ),

        text(
          "programme",
          "Programme",
          true
        ),

        text(
          "institution_name",
          "Institution"
        ),

        text(
          "created_at",
          "Created",
          true
        ),
      ];

    case "credentials":
      return [
        linked(
          "qualification",
          "Qualification"
        ),

        text(
          "student_name",
          "Student"
        ),

        text(
          "institution_name",
          "Institution"
        ),

        badge(
          "status",
          "Status"
        ),

        text(
          "issue_date",
          "Issue date",
          true
        ),
      ];

    case "verification-logs":
      return [
        text(
          "credential_id",
          "Credential ID"
        ),

        {
          key:
            "result",

          label:
            "Result",

          sortable:
            true,

          render:
            (
              record
            ) => (
              <Badge
                value={String(
                  record
                    .result_code ??
                    record
                      .result ??
                    "Unknown"
                )}
              />
            ),
        },

        text(
          "verification_method",
          "Method",
          true
        ),

        text(
          "verification_time",
          "Verified at",
          true
        ),
      ];

    case "audit-logs":
      return [
        text(
          "action",
          "Action",
          true
        ),

        text(
          "entity_type",
          "Entity type",
          true
        ),

        text(
          "entity_id",
          "Entity ID"
        ),

        text(
          "created_at",
          "Created",
          true
        ),
      ];
  }
}

function useDebounce(
  value: string
) {
  const [
    state,
    setState,
  ] = useState(
    value
  );

  useEffect(() => {
    const timer =
      window.setTimeout(
        () =>
          setState(
            value
          ),
        350
      );

    return () =>
      window.clearTimeout(
        timer
      );
  }, [
    value,
  ]);

  return state;
}

export function CreatePage({
  kind,
}: {
  kind:
    | "institutions"
    | "users"
    | "students"
    | "credentials";
}) {
  const qc =
    useQueryClient();

  const {
    user,
  } = useAuth();

  const [
    msg,
    setMsg,
  ] = useState("");

  const [
    error,
    setError,
  ] = useState("");

  const [
    credentialInstitutionId,
    setCredentialInstitutionId,
  ] = useState(
    user?.institutionId ||
      ""
  );

  const [
    studentSearch,
    setStudentSearch,
  ] = useState("");

  const debouncedStudentSearch =
    useDebounce(
      studentSearch
    );

  const institutions =
    useQuery({
      queryKey: [
        "institutions",
        "provisioning",
      ],

      queryFn:
        async () => {
          const response =
            await api.get(
              "/institutions",
              {
                params: {
                  limit:
                    100,

                  status:
                    "active",
                },
              }
            );

          return (
            response
              .data
              .institutions ||
            []
          );
        },

      enabled:
        (
          kind ===
            "users" ||
          kind ===
            "students" ||
          kind ===
            "credentials"
        ) &&
        user?.role ===
          "super_admin",
    });

  const eligibleStudents =
    useQuery({
      queryKey: [
        "students",
        "issuance",
        credentialInstitutionId,
        debouncedStudentSearch,
      ],

      queryFn:
        async () =>
          (
            await api.get(
              "/students",
              {
                params: {
                  institutionId:
                    credentialInstitutionId ||
                    undefined,

                  search:
                    debouncedStudentSearch ||
                    undefined,

                  page:
                    1,

                  limit:
                    20,
                },
              }
            )
          ).data
            .students ||
          [],

      enabled:
        kind ===
          "credentials" &&
        Boolean(
          credentialInstitutionId
        ),
    });

  const mut =
    useMutation({
      mutationFn:
        async (
          form:
            HTMLFormElement
        ) => {
          const data =
            new FormData(
              form
            );

          if (
            kind ===
            "credentials"
          ) {
            return api.post(
              "/credentials/issue",
              data,
              {
                timeout:
                  120000,
              }
            );
          }

          const body =
            Object.fromEntries(
              data.entries()
            );

          if (kind === "users") {
            const selectedRole = String(body.role || "");
            const institutionId = String(body.institutionId || "").trim();

            if (
              user?.role === "institution_admin" ||
              selectedRole === "super_admin" ||
              selectedRole === "regulator" ||
              !institutionId
            ) {
              delete body.institutionId;
            }
          }

          return api.post(
            `/${kind}`,
            body
          );
        },

      onSuccess:
        () => {
          setError(
            ""
          );

          setMsg(
            `${title(
              kind
            )} record created successfully.`
          );

          void qc.invalidateQueries(
            {
              queryKey: [
                kind,
              ],
            }
          );
        },

      onError:
        (
          value: {
            message?: string;
          }
        ) => {
          setMsg(
            ""
          );

          setError(
            value.message ||
              "Unable to create record."
          );
        },
    });

  const roles =
    user?.role ===
    "super_admin"
      ? [
          "institution_admin",
          "issuer",
          "verifier",
          "student",
          "regulator",
          "super_admin",
        ]
      : [
          "issuer",
          "verifier",
          "student",
        ];

  return (
    <div className="page narrow">
      <h1>
        {kind ===
        "credentials"
          ? "Issue credential"
          : `Create ${title(
              kind
            ).slice(
              0,
              -1
            )}`}
      </h1>

      <Card>
        <form
          onSubmit={(
            event
          ) => {
            event.preventDefault();

            setError(
              ""
            );

            setMsg(
              ""
            );

            mut.mutate(
              event
                .currentTarget
            );
          }}
        >
          {kind ===
            "institutions" && (
            <>
              <Field
                name="name"
                label="Institution name"
              />

              <Field
                name="walletAddress"
                label="Wallet address"
              />

              <Field
                name="email"
                label="Email"
                type="email"
              />

              <label>
                Phone
                (optional)

                <input
                  name="phone"
                  type="tel"
                  maxLength={
                    30
                  }
                />
              </label>
            </>
          )}

          {kind ===
            "users" && (
            <>
              <Field
                name="fullName"
                label="Full name"
              />

              <Field
                name="email"
                label="Email"
                type="email"
              />

              <label>
                Role

                <select
                  required
                  name="role"
                >
                  {roles.map(
                    (
                      role
                    ) => (
                      <option
                        key={
                          role
                        }
                        value={
                          role
                        }
                      >
                        {role.replaceAll(
                          "_",
                          " "
                        )}
                      </option>
                    )
                  )}
                </select>
              </label>

              {user?.role ===
              "super_admin" ? (
                <label>
                  Institution

                  <select name="institutionId">
                    <option value="">
                      Global
                      role
                      (super
                      administrator
                      or
                      regulator)
                    </option>

                    {(
                      institutions.data ||
                      []
                    ).map(
                      (
                        institution:
                          JsonRecord
                      ) => (
                        <option
                          key={String(
                            institution.id
                          )}
                          value={String(
                            institution.id
                          )}
                        >
                          {String(
                            institution.name
                          )}
                        </option>
                      )
                    )}
                  </select>
                </label>
              ) : (
                <p className="notice">
                  Institution
                  is fixed to
                  your
                  institution.
                </p>
              )}
            </>
          )}

          {kind ===
            "students" && (
            <>
              <Field
                name="fullName"
                label="Full name"
              />

              <Field
                name="studentNumber"
                label="Student number"
              />

              <Field
                name="email"
                label="Email"
                type="email"
              />

              <Field
                name="programme"
                label="Programme"
              />

              {user?.role ===
              "super_admin" ? (
                <label>
                  Institution

                  <select
                    required
                    name="institutionId"
                  >
                    <option value="">
                      Select
                      active
                      institution
                    </option>

                    {(
                      institutions.data ||
                      []
                    ).map(
                      (
                        institution:
                          JsonRecord
                      ) => (
                        <option
                          key={String(
                            institution.id
                          )}
                          value={String(
                            institution.id
                          )}
                        >
                          {String(
                            institution.name
                          )}
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
                    value={
                      user?.institutionId ||
                      ""
                    }
                  />

                  <p className="notice">
                    Institution
                    is fixed to
                    your
                    institution.
                  </p>
                </>
              )}
            </>
          )}

          {kind ===
            "credentials" && (
            <>
              {user?.role ===
              "super_admin" ? (
                <label>
                  Institution

                  <select
                    required
                    name="institutionId"
                    value={
                      credentialInstitutionId
                    }
                    onChange={(
                      event
                    ) =>
                      setCredentialInstitutionId(
                        event
                          .target
                          .value
                      )
                    }
                  >
                    <option value="">
                      Select
                      active
                      institution
                    </option>

                    {(
                      institutions.data ||
                      []
                    ).map(
                      (
                        institution:
                          JsonRecord
                      ) => (
                        <option
                          key={String(
                            institution.id
                          )}
                          value={String(
                            institution.id
                          )}
                        >
                          {String(
                            institution.name
                          )}
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
                    value={
                      user?.institutionId ||
                      ""
                    }
                  />

                  <p className="notice">
                    Institution
                    is fixed to
                    your
                    institution.
                  </p>
                </>
              )}

              <label>
                Find student

                <input
                  type="search"
                  value={
                    studentSearch
                  }
                  maxLength={
                    200
                  }
                  onChange={(
                    event
                  ) =>
                    setStudentSearch(
                      event
                        .target
                        .value
                    )
                  }
                />
              </label>

              <label>
                Student

                <select
                  required
                  name="studentId"
                >
                  <option value="">
                    Select
                    student
                  </option>

                  {(
                    eligibleStudents.data ||
                    []
                  ).map(
                    (
                      student:
                        JsonRecord
                    ) => (
                      <option
                        key={String(
                          student.id
                        )}
                        value={String(
                          student.id
                        )}
                      >
                        {String(
                          student
                            .full_name ||
                            student
                              .fullName
                        )}{" "}
                        —{" "}
                        {String(
                          student
                            .student_number ||
                            student
                              .studentNumber
                        )}
                      </option>
                    )
                  )}
                </select>
              </label>

              <Field
                name="qualification"
                label="Qualification"
              />

              <Field
                name="issueDate"
                label="Issue date"
                type="date"
              />

              <Field
                name="certificate"
                label="Certificate PDF"
                type="file"
                accept="application/pdf"
              />
            </>
          )}

          <Button
            className="primary"
            disabled={
              mut.isPending
            }
          >
            {mut.isPending
              ? "Processing—wait for confirmation…"
              : "Submit"}
          </Button>

          {error && (
            <div
              className="notice error"
              role="alert"
            >
              {
                error
              }
            </div>
          )}

          {msg && (
            <div className="notice success">
              {
                msg
              }
            </div>
          )}
        </form>
      </Card>
    </div>
  );
}

function Field(
  props: {
    name: string;
    label: string;
    type?: string;
    accept?: string;
    defaultValue?: string;
  }
) {
  return (
    <label>
      {
        props.label
      }

      <input
        required
        name={
          props.name
        }
        type={
          props.type ||
          "text"
        }
        accept={
          props.accept
        }
        defaultValue={
          props.defaultValue
        }
      />
    </label>
  );
}

export function StudentDetail() {
  const {
    id,
  } = useParams();

  const {
    user,
  } = useAuth();

  const queryClient =
    useQueryClient();

  const [
    message,
    setMessage,
  ] = useState("");

  const [
    error,
    setError,
  ] = useState("");

  const [
    institutionChange,
    setInstitutionChange,
  ] = useState<
    string |
    null
  >(
    null
  );

  const [
    accountUserId,
    setAccountUserId,
  ] = useState("");

  const student =
    useQuery({
      queryKey: [
        "students",
        id,
      ],

      queryFn:
        async () =>
          (
            await api.get(
              `/students/${id}`
            )
          ).data
            .student,
    });

  const credentials =
    useQuery({
      queryKey: [
        "credentials",
        "student",
        id,
      ],

      queryFn:
        async () =>
          (
            await api.get(
              "/credentials",
              {
                params: {
                  studentId:
                    id,

                  limit:
                    20,
                },
              }
            )
          ).data,

      enabled:
        Boolean(
          student.data
        ),
    });

  const institutions =
    useQuery({
      queryKey: [
        "institutions",
        "student-edit",
      ],

      queryFn:
        async () =>
          (
            await api.get(
              "/institutions",
              {
                params: {
                  limit:
                    100,

                  status:
                    "active",
                },
              }
            )
          ).data
            .institutions ||
          [],

      enabled:
        user?.role ===
        "super_admin",
    });

  const record =
    (
      student.data ||
      {}
    ) as JsonRecord;

  const canEdit =
    [
      "super_admin",
      "institution_admin",
      "issuer",
    ].includes(
      user?.role ||
        ""
    );

  const canLinkAccount =
    [
      "super_admin",
      "institution_admin",
    ].includes(
      user?.role ||
        ""
    );

  const studentAccounts =
    useQuery({
      queryKey: [
        "users",
        "student-account-link",
        id,
      ],

      queryFn:
        async () =>
          (
            await api.get(
              "/users",
              {
                params: {
                  page:
                    1,

                  limit:
                    100,

                  status:
                    "active",
                },
              }
            )
          ).data
            .users ||
          [],

      enabled:
        Boolean(
          student.data
        ) &&
        !record.user_id &&
        canLinkAccount,
    });

  const complete =
    (
      text:
        string
    ) => {
      setMessage(
        text
      );

      setError(
        ""
      );

      setInstitutionChange(
        null
      );

      setAccountUserId(
        ""
      );

      void student.refetch();

      void queryClient
        .invalidateQueries(
          {
            queryKey: [
              "students",
            ],
          }
        );
    };

  const save =
    useMutation({
      mutationFn:
        (
          body:
            JsonRecord
        ) =>
          api.patch(
            `/students/${id}`,
            body
          ),

      onSuccess:
        (
          response
        ) =>
          complete(
            response.data
              .message ||
              "Student updated."
          ),

      onError:
        (
          value: {
            message?: string;
          }
        ) =>
          setError(
            value.message ||
              "Unable to update student."
          ),
    });

  const reassign =
    useMutation({
      mutationFn:
        (
          institutionId:
            string
        ) =>
          api.patch(
            `/students/${id}/institution`,
            {
              institutionId,
            }
          ),

      onSuccess:
        (
          response
        ) =>
          complete(
            response.data
              .message ||
              "Student institution reassigned."
          ),

      onError:
        (
          value: {
            message?: string;
          }
        ) =>
          setError(
            value.message ||
              "Unable to reassign student."
          ),
    });

  const linkAccount =
    useMutation({
      mutationFn:
        (
          userId:
            string
        ) =>
          api.post(
            `/students/${id}/account`,
            {
              userId,
            }
          ),

      onSuccess:
        (
          response
        ) => {
          complete(
            response.data
              .message ||
              "Student account linked successfully."
          );

          void queryClient
            .invalidateQueries(
              {
                queryKey: [
                  "users",
                ],
              }
            );
        },

      onError:
        (
          value: {
            message?: string;
          }
        ) =>
          setError(
            value.message ||
              "Unable to link student account."
          ),
    });

  const eligibleStudentAccounts =
    (
      studentAccounts.data ||
      []
    ).filter(
      (
        account:
          JsonRecord
      ) => {
        const role =
          String(
            account.role ||
              ""
          );

        const institutionId =
          String(
            account
              .institutionId ??
              account
                .institution_id ??
              ""
          );

        const active =
          account
            .isActive ??
          account
            .is_active ??
          true;

        return (
          role ===
            "student" &&
          active !==
            false &&
          institutionId ===
            String(
              record
                .institution_id ||
                ""
            )
        );
      }
    );

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <span className="eyebrow">
            Student management
          </span>

          <h1>
            Student details
          </h1>
        </div>

        <Link
          className="button"
          to="/app/students"
        >
          Back to students
        </Link>
      </div>

      <State
        loading={
          student.isLoading
        }
        error={
          student.error
        }
        empty={
          !student.data
        }
      >
        <div className="grid two">
          <Card title="Academic identity">
            {canEdit ? (
              <form
                onSubmit={(
                  event
                ) => {
                  event.preventDefault();

                  const data =
                    new FormData(
                      event
                        .currentTarget
                    );

                  save.mutate(
                    {
                      studentNumber:
                        data.get(
                          "studentNumber"
                        ),

                      fullName:
                        data.get(
                          "fullName"
                        ),

                      email:
                        data.get(
                          "email"
                        ) ||
                        null,

                      programme:
                        data.get(
                          "programme"
                        ),
                    }
                  );
                }}
              >
                <Field
                  name="studentNumber"
                  label="Student number"
                  defaultValue={String(
                    record
                      .student_number ||
                      ""
                  )}
                />

                <Field
                  name="fullName"
                  label="Full name"
                  defaultValue={String(
                    record
                      .full_name ||
                      ""
                  )}
                />

                <label>
                  Email

                  <input
                    name="email"
                    type="email"
                    defaultValue={String(
                      record
                        .email ||
                        ""
                    )}
                  />
                </label>

                <Field
                  name="programme"
                  label="Programme"
                  defaultValue={String(
                    record
                      .programme ||
                      ""
                  )}
                />

                <Button
                  className="primary"
                  disabled={
                    save.isPending
                  }
                >
                  {save.isPending
                    ? "Saving…"
                    : "Save student"}
                </Button>
              </form>
            ) : (
              <dl>
                <div>
                  <dt>
                    Student
                    number
                  </dt>

                  <dd>
                    {String(
                      record
                        .student_number
                    )}
                  </dd>
                </div>

                <div>
                  <dt>
                    Full
                    name
                  </dt>

                  <dd>
                    {String(
                      record
                        .full_name
                    )}
                  </dd>
                </div>

                <div>
                  <dt>
                    Email
                  </dt>

                  <dd>
                    {String(
                      record
                        .email ||
                        "Not provided"
                    )}
                  </dd>
                </div>

                <div>
                  <dt>
                    Programme
                  </dt>

                  <dd>
                    {String(
                      record
                        .programme
                    )}
                  </dd>
                </div>
              </dl>
            )}
          </Card>

          <Card title="Institution and credentials">
            <dl>
              <div>
                <dt>
                  Institution
                </dt>

                <dd>
                  {String(
                    record
                      .institution_name ||
                      "Unknown institution"
                  )}
                </dd>
              </div>

              <div>
                <dt>
                  Related
                  credentials
                </dt>

                <dd>
                  {Number(
                    credentials
                      .data
                      ?.pagination
                      ?.total ??
                      credentials
                        .data
                        ?.total ??
                      0
                  )}
                </dd>
              </div>

              <div>
                <dt>
                  Student
                  login
                  account
                </dt>

                <dd>
                  {record
                    .user_id
                    ? "Linked"
                    : "Not linked"}
                </dd>
              </div>

              <div>
                <dt>
                  Created
                </dt>

                <dd>
                  {String(
                    record
                      .created_at ||
                      ""
                  ).slice(
                    0,
                    10
                  )}
                </dd>
              </div>
            </dl>

            {canLinkAccount &&
              !record.user_id && (
                <>
                  <label>
                    Link
                    student
                    login
                    account

                    <select
                      aria-label="Student login account"
                      value={
                        accountUserId
                      }
                      disabled={
                        studentAccounts
                          .isLoading ||
                        linkAccount
                          .isPending
                      }
                      onChange={(
                        event
                      ) =>
                        setAccountUserId(
                          event
                            .target
                            .value
                        )
                      }
                    >
                      <option value="">
                        Select
                        active
                        student
                        account
                      </option>

                      {eligibleStudentAccounts.map(
                        (
                          account:
                            JsonRecord
                        ) => (
                          <option
                            key={String(
                              account.id
                            )}
                            value={String(
                              account.id
                            )}
                          >
                            {String(
                              account
                                .fullName ??
                                account
                                  .full_name ??
                                account
                                  .email ??
                                "Student account"
                            )}

                            {account
                              .email
                              ? ` — ${String(
                                  account
                                    .email
                                )}`
                              : ""}
                          </option>
                        )
                      )}
                    </select>
                  </label>

                  {!studentAccounts
                    .isLoading &&
                    eligibleStudentAccounts
                      .length ===
                      0 && (
                      <p className="notice">
                        No
                        eligible
                        active
                        student
                        account
                        is
                        currently
                        available
                        for
                        this
                        institution.
                        Create
                        the
                        student
                        user
                        account
                        first,
                        then
                        return
                        here
                        to
                        link
                        it.
                      </p>
                    )}

                  <Button
                    disabled={
                      !accountUserId ||
                      linkAccount
                        .isPending
                    }
                    onClick={() => {
                      if (
                        !accountUserId
                      ) {
                        return;
                      }

                      const confirmed =
                        window.confirm(
                          "Link this login account to the student record? This establishes credential ownership for the account."
                        );

                      if (
                        confirmed
                      ) {
                        linkAccount
                          .mutate(
                            accountUserId
                          );
                      }
                    }}
                  >
                    {linkAccount
                      .isPending
                      ? "Linking…"
                      : "Link account"}
                  </Button>
                </>
              )}

            {canLinkAccount &&
              Boolean(
                record
                  .user_id
              ) && (
                <p className="notice">
                  A student
                  login
                  account is
                  already
                  linked to
                  this
                  student
                  record.
                </p>
              )}

            {user?.role ===
              "super_admin" && (
              <label>
                Reassign
                institution

                <select
                  aria-label="Reassign institution"
                  value={
                    institutionChange ||
                    String(
                      record
                        .institution_id ||
                        ""
                    )
                  }
                  onChange={(
                    event
                  ) =>
                    setInstitutionChange(
                      event
                        .target
                        .value
                    )
                  }
                >
                  <option
                    value=""
                    disabled
                  >
                    Select
                    active
                    institution
                  </option>

                  {(
                    institutions.data ||
                    []
                  ).map(
                    (
                      institution:
                        JsonRecord
                    ) => (
                      <option
                        key={String(
                          institution.id
                        )}
                        value={String(
                          institution.id
                        )}
                      >
                        {String(
                          institution.name
                        )}
                      </option>
                    )
                  )}
                </select>
              </label>
            )}
          </Card>
        </div>

        {error && (
          <div
            className="notice error"
            role="alert"
          >
            {
              error
            }
          </div>
        )}

        {message && (
          <div className="notice success">
            {
              message
            }
          </div>
        )}
      </State>

      <ConfirmDialog
        open={Boolean(
          institutionChange &&
            institutionChange !==
              record
                .institution_id
        )}
        title="Reassign this student?"
        onCancel={() =>
          setInstitutionChange(
            null
          )
        }
        onConfirm={() => {
          if (
            institutionChange
          ) {
            reassign.mutate(
              institutionChange
            );
          }
        }}
      >
        <p>
          Reassignment
          is allowed
          only when
          the student
          has no
          credential
          history.
          Existing
          credentials
          are never
          moved or
          rewritten.
        </p>
      </ConfirmDialog>
    </div>
  );
}

function CredentialPublicVerification({
  publicToken,
}: {
  publicToken: string;
}) {
  const [
    qrSrc,
    setQrSrc,
  ] = useState("");

  const [
    copied,
    setCopied,
  ] = useState(
    false
  );

  const verificationUrl =
    `${window.location.origin}/verify/token/${encodeURIComponent(
      publicToken
    )}`;

  useEffect(() => {
    let mounted =
      true;

    QRCode
      .toDataURL(
        verificationUrl,
        {
          errorCorrectionLevel:
            "M",

          margin:
            2,

          width:
            320,
        }
      )
      .then(
        (
          dataUrl
        ) => {
          if (
            mounted
          ) {
            setQrSrc(
              dataUrl
            );
          }
        }
      )
      .catch(
        () => {
          if (
            mounted
          ) {
            setQrSrc(
              ""
            );
          }
        }
      );

    return () => {
      mounted =
        false;
    };
  }, [
    verificationUrl,
  ]);

  const copyToken =
    async () => {
      try {
        await navigator
          .clipboard
          .writeText(
            publicToken
          );

        setCopied(
          true
        );

        window.setTimeout(
          () => {
            setCopied(
              false
            );
          },
          2000
        );
      } catch {
        setCopied(
          false
        );
      }
    };

  const copyUrl =
    async () => {
      try {
        await navigator
          .clipboard
          .writeText(
            verificationUrl
          );
      } catch {
        // Clipboard access may be unavailable.
      }
    };

  return (
    <div>
      <dl>
        <div>
          <dt>
            Public token
          </dt>

          <dd>
            <code>
              {
                publicToken
              }
            </code>
          </dd>
        </div>

        <div>
          <dt>
            Public
            verification
            URL
          </dt>

          <dd>
            <code>
              {
                verificationUrl
              }
            </code>
          </dd>
        </div>
      </dl>

      {qrSrc ? (
        <img
          className="qr"
          src={
            qrSrc
          }
          alt="Credential verification QR code"
        />
      ) : (
        <div className="notice">
          Preparing
          verification
          QR code…
        </div>
      )}

      <div className="actions">
        <button
          type="button"
          className="button"
          onClick={() => {
            void copyToken();
          }}
        >
          {copied
            ? "Copied"
            : "Copy public token"}
        </button>

        <button
          type="button"
          className="button"
          onClick={() => {
            void copyUrl();
          }}
        >
          Copy
          verification
          URL
        </button>

        <a
          className="button"
          href={
            verificationUrl
          }
          target="_blank"
          rel="noopener noreferrer"
        >
          Open public
          verification
        </a>
      </div>
    </div>
  );
}

export function CredentialDetail() {
  const {
    id,
  } = useParams();

  const {
    user,
  } = useAuth();

  const qc =
    useQueryClient();

  const [
    open,
    setOpen,
  ] = useState(
    false
  );

  const [
    reason,
    setReason,
  ] = useState("");

  const [
    supersedeOpen,
    setSupersedeOpen,
  ] = useState(
    false
  );

  const [
    replacementCredentialId,
    setReplacementCredentialId,
  ] = useState("");

  const [
    supersessionReason,
    setSupersessionReason,
  ] = useState("");

  const [
    correctionMessage,
    setCorrectionMessage,
  ] = useState("");

  const [
    correctionError,
    setCorrectionError,
  ] = useState("");

  useEffect(() => {
    setOpen(
      false
    );

    setReason(
      ""
    );

    setSupersedeOpen(
      false
    );

    setReplacementCredentialId(
      ""
    );

    setSupersessionReason(
      ""
    );

    setCorrectionMessage(
      ""
    );

    setCorrectionError(
      ""
    );
  }, [
    id,
  ]);

  const q =
    useQuery({
      queryKey: [
        "credentials",
        id,
      ],

      queryFn:
        async () => {
          const response =
            await api.get(
              `/credentials/${id}`
            );

          return response
            .data
            .credential;
        },
    });

  const c =
    (
      q.data ||
      {}
    ) as JsonRecord;

  const canGeneratePdf =
    [
      "super_admin",
      "institution_admin",
      "issuer",
    ].includes(
      user?.role ||
        ""
    );

  const canRevoke =
    c.status ===
      "active" &&
    [
      "super_admin",
      "institution_admin",
    ].includes(
      user?.role ||
        ""
    );

  const canSupersede =
    c.status ===
      "active" &&
    [
      "super_admin",
      "institution_admin",
      "issuer",
    ].includes(
      user?.role ||
        ""
    );

  const replacements =
    useQuery({
      queryKey: [
        "credentials",
        "replacement-candidates",
        id,
        c.student_id,
        c.institution_id,
      ],

      enabled:
        Boolean(
          q.data
        ) &&
        Boolean(
          c.student_id
        ) &&
        canSupersede &&
        supersedeOpen,

      queryFn:
        async () =>
          (
            await api.get(
              "/credentials",
              {
                params: {
                  studentId:
                    c.student_id,

                  institutionId:
                    c.institution_id,

                  status:
                    "active",

                  page:
                    1,

                  limit:
                    100,
                },
              }
            )
          ).data,
    });

  const candidates =
    (
      (
        replacements
          .data
          ?.credentials ||
        []
      ) as JsonRecord[]
    ).filter(
      (
        candidate
      ) => {
        const candidateId =
          String(
            candidate.id ||
              ""
          );

        const candidateStudentId =
          String(
            candidate
              .student_id ||
              ""
          );

        const candidateInstitutionId =
          String(
            candidate
              .institution_id ||
              ""
          );

        return (
          candidateId !==
            String(
              id ||
                ""
            ) &&
          candidate
            .status ===
            "active" &&
          candidateStudentId ===
            String(
              c.student_id ||
                ""
            ) &&
          candidateInstitutionId ===
            String(
              c.institution_id ||
                ""
            )
        );
      }
    );

  const revoke =
    useMutation({
      mutationFn:
        () =>
          api.patch(
            `/credentials/${id}/revoke`,
            {
              reason,
            },
            {
              timeout:
                120000,
            }
          ),

      onSuccess:
        () => {
          setOpen(
            false
          );

          setReason(
            ""
          );

          void qc
            .invalidateQueries(
              {
                queryKey: [
                  "credentials",
                  id,
                ],
              }
            );

          void qc
            .invalidateQueries(
              {
                queryKey: [
                  "credentials",
                ],
              }
            );

          void qc
            .invalidateQueries(
              {
                queryKey: [
                  "my-credentials",
                ],
              }
            );
        },
    });

  const supersede =
    useMutation({
      mutationFn:
        () =>
          api.patch(
            `/credentials/${id}/supersede`,
            {
              replacementCredentialId,
              reason:
                supersessionReason
                  .trim(),
            },
            {
              timeout:
                120000,
            }
          ),

      onMutate:
        () => {
          setCorrectionMessage(
            ""
          );

          setCorrectionError(
            ""
          );
        },

      onSuccess:
        () => {
          setSupersedeOpen(
            false
          );

          setReplacementCredentialId(
            ""
          );

          setSupersessionReason(
            ""
          );

          setCorrectionError(
            ""
          );

          setCorrectionMessage(
            "Credential superseded successfully. The replacement remains the current credential."
          );

          void qc
            .invalidateQueries(
              {
                queryKey: [
                  "credentials",
                  id,
                ],
              }
            );

          void qc
            .invalidateQueries(
              {
                queryKey: [
                  "credentials",
                ],
              }
            );

          void qc
            .invalidateQueries(
              {
                queryKey: [
                  "my-credentials",
                ],
              }
            );

          void q.refetch();
        },

      onError:
        (
          value: {
            message?: string;
          }
        ) => {
          setCorrectionError(
            value.message ||
              "Unable to supersede credential."
          );
        },
    });

  const pdf =
    useMutation({
      mutationFn:
        () =>
          api.post(
            `/credentials/${id}/generate-pdf`
          ),
    });

  const download =
    useMutation({
      mutationFn:
        () =>
          downloadBlob(
            `/credentials/${id}/pdf`,
            `credential-${id}.pdf`
          ),
    });

  const publicToken =
    typeof c
      .public_token ===
    "string"
      ? c.public_token
      : "";

  const explorer =
    String(
      import.meta
        .env
        .VITE_BLOCK_EXPLORER_URL ||
        ""
    ).replace(
      /\/$/,
      ""
    );

  const gateway =
    String(
      import.meta
        .env
        .VITE_IPFS_GATEWAY ||
        ""
    ).replace(
      /\/$/,
      ""
    );

  return (
    <div className="page">
      <h1>
        Credential details
      </h1>

      <State
        loading={
          q.isLoading
        }
        error={
          q.error
        }
        empty={
          !q.data
        }
      >
        <Card>
          <Badge
            value={String(
              c.status ||
                "unknown"
            )}
          />

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
              (
                key
              ) =>
                c[
                  key
                ] !=
                  null && (
                  <div
                    key={
                      key
                    }
                  >
                    <dt>
                      {key.replaceAll(
                        "_",
                        " "
                      )}
                    </dt>

                    <dd>
                      <code>
                        {String(
                          c[
                            key
                          ]
                        )}
                      </code>
                    </dd>
                  </div>
                )
            )}
          </dl>

          {c.status ===
            "superseded" && (
            <section
              aria-label="Supersession history"
              className="notice"
            >
              <p>
                This
                credential
                has been
                superseded
                and is no
                longer the
                current
                credential.
              </p>

              <dl>
                <div>
                  <dt>
                    Superseded
                    at
                  </dt>

                  <dd>
                    {c
                      .superseded_at
                      ? new Date(
                          String(
                            c
                              .superseded_at
                          )
                        ).toLocaleString()
                      : "Not available"}
                  </dd>
                </div>

                <div>
                  <dt>
                    Supersession
                    reason
                  </dt>

                  <dd>
                    {String(
                      c
                        .supersession_reason ||
                        "Not available"
                    )}
                  </dd>
                </div>

                <div>
                  <dt>
                    Replacement
                    credential
                  </dt>

                  <dd>
                    {String(
                      c
                        .superseded_by ||
                        "Not available"
                    )}
                  </dd>
                </div>
              </dl>

              {typeof c
                .superseded_by ===
                "string" &&
                c
                  .superseded_by && (
                  <Link
                    className="button"
                    to={`/app/credentials/${encodeURIComponent(
                      c
                        .superseded_by
                    )}`}
                  >
                    Open
                    replacement
                    credential
                  </Link>
                )}
            </section>
          )}

          {typeof c
            .supersedes_credential_id ===
            "string" &&
            c
              .supersedes_credential_id && (
              <section
                aria-label="Original credential"
                className="notice"
              >
                <p>
                  This
                  credential
                  is the
                  replacement
                  for a
                  previous
                  credential.
                </p>

                <p>
                  Original
                  credential:{" "}
                  <code>
                    {
                      c
                        .supersedes_credential_id
                    }
                  </code>
                </p>

                <Link
                  className="button"
                  to={`/app/credentials/${encodeURIComponent(
                    c
                      .supersedes_credential_id
                  )}`}
                >
                  Open
                  original
                  credential
                </Link>
              </section>
            )}

          {publicToken ? (
            <CredentialPublicVerification
              publicToken={
                publicToken
              }
            />
          ) : c.status ===
            "active" ? (
            <div
              className="notice error"
              role="alert"
            >
              This active
              credential
              does not have
              a public
              verification
              token. Check
              the
              credential
              API response
              before using
              QR
              verification.
            </div>
          ) : null}

          <div className="actions">
            {Boolean(
              gateway &&
                c.ipfs_cid
            ) && (
              <a
                className="button"
                href={`${gateway}/${encodeURIComponent(
                  String(
                    c.ipfs_cid
                  )
                )}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                View IPFS
                evidence
              </a>
            )}

            {Boolean(
              explorer &&
                c.blockchain_tx
            ) && (
              <a
                className="button"
                href={`${explorer}/tx/${encodeURIComponent(
                  String(
                    c.blockchain_tx
                  )
                )}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                View
                transaction
              </a>
            )}

            {canGeneratePdf && (
              <Button
                onClick={() =>
                  pdf.mutate()
                }
                disabled={
                  pdf.isPending
                }
              >
                {pdf.isPending
                  ? "Generating…"
                  : "Generate PDF"}
              </Button>
            )}

            <Button
              onClick={() =>
                download.mutate()
              }
              disabled={
                download.isPending
              }
            >
              {download.isPending
                ? "Downloading…"
                : "Download presentation PDF"}
            </Button>

            {canSupersede && (
              <Button
                disabled={
                  supersede
                    .isPending ||
                  revoke
                    .isPending
                }
                onClick={() => {
                  setReplacementCredentialId(
                    ""
                  );

                  setSupersessionReason(
                    ""
                  );

                  setCorrectionError(
                    ""
                  );

                  setCorrectionMessage(
                    ""
                  );

                  setSupersedeOpen(
                    true
                  );
                }}
              >
                Correct /
                supersede
                credential
              </Button>
            )}

            {canRevoke && (
              <Button
                className="danger"
                disabled={
                  revoke
                    .isPending ||
                  supersede
                    .isPending
                }
                onClick={() => {
                  setReason(
                    ""
                  );

                  setOpen(
                    true
                  );
                }}
              >
                Revoke
                credential
              </Button>
            )}
          </div>

          {correctionMessage && (
            <div
              className="notice success"
              role="status"
            >
              {
                correctionMessage
              }
            </div>
          )}

          {pdf.isSuccess && (
            <div className="notice success">
              Certificate
              generation
              confirmed
              by the API.
            </div>
          )}

          {pdf.error && (
            <div
              className="notice error"
              role="alert"
            >
              {(pdf.error as {
                message?: string;
              }).message ||
                "Unable to generate presentation certificate."}
            </div>
          )}

          {download.error && (
            <div
              className="notice error"
              role="alert"
            >
              {(download.error as {
                message?: string;
              }).message ||
                "Presentation certificate is unavailable."}
            </div>
          )}
        </Card>
      </State>

      <ConfirmDialog
        open={
          supersedeOpen
        }
        title="Correct / supersede this credential?"
        onCancel={() => {
          if (
            supersede
              .isPending
          ) {
            return;
          }

          setSupersedeOpen(
            false
          );

          setReplacementCredentialId(
            ""
          );

          setSupersessionReason(
            ""
          );

          setCorrectionError(
            ""
          );
        }}
        onConfirm={() => {
          if (
            !replacementCredentialId ||
            supersessionReason
              .trim()
              .length <
              5 ||
            supersede
              .isPending
          ) {
            return;
          }

          supersede.mutate();
        }}
      >
        <p>
          This marks
          the current
          credential as
          SUPERSEDED.
          The selected
          replacement
          remains the
          current
          credential.
          The old
          credential is
          retained for
          audit and
          verification
          history.
        </p>

        <label>
          Replacement
          credential

          <select
            aria-label="Replacement credential"
            value={
              replacementCredentialId
            }
            disabled={
              replacements
                .isLoading ||
              supersede
                .isPending
            }
            onChange={(
              event
            ) =>
              setReplacementCredentialId(
                event
                  .target
                  .value
              )
            }
          >
            <option value="">
              Select an
              active
              replacement
            </option>

            {candidates.map(
              (
                candidate
              ) => (
                <option
                  key={String(
                    candidate.id
                  )}
                  value={String(
                    candidate.id
                  )}
                >
                  {String(
                    candidate
                      .qualification ||
                      "Credential"
                  )}{" "}
                  —{" "}
                  {String(
                    candidate
                      .issue_date ||
                      ""
                  ).slice(
                    0,
                    10
                  )}{" "}
                  —{" "}
                  {String(
                    candidate.id
                  )}
                </option>
              )
            )}
          </select>
        </label>

        {replacements.isLoading && (
          <div className="notice">
            Loading
            eligible
            replacement
            credentials…
          </div>
        )}

        {!replacements
          .isLoading &&
          !replacements
            .error &&
          candidates
            .length ===
            0 && (
            <div className="notice">
              No other
              active
              credential
              is
              currently
              available
              for this
              student.
              Issue the
              corrected
              credential
              first, then
              return here
              to link it
              as the
              replacement.
            </div>
          )}

        {replacements.error && (
          <div
            className="notice error"
            role="alert"
          >
            {(replacements.error as {
              message?: string;
            }).message ||
              "Unable to load replacement credentials."}
          </div>
        )}

        <label>
          Correction /
          supersession
          reason

          <textarea
            aria-label="Supersession reason"
            value={
              supersessionReason
            }
            minLength={
              5
            }
            maxLength={
              1000
            }
            required
            onChange={(
              event
            ) =>
              setSupersessionReason(
                event
                  .target
                  .value
              )
            }
          />
        </label>

        {supersessionReason
          .length >
          0 &&
          supersessionReason
            .trim()
            .length <
            5 && (
            <div className="notice error">
              Supersession
              reason must
              be at least
              5
              characters.
            </div>
          )}

        {supersede.isPending && (
          <div className="notice">
            Publishing
            the
            supersession
            status and
            waiting for
            confirmation…
          </div>
        )}

        {correctionError && (
          <div
            className="notice error"
            role="alert"
          >
            {
              correctionError
            }
          </div>
        )}
      </ConfirmDialog>

      <ConfirmDialog
        open={
          open
        }
        title="Revoke this credential?"
        onCancel={() => {
          setOpen(
            false
          );

          setReason(
            ""
          );
        }}
        onConfirm={() => {
          if (
            reason
              .trim()
              .length >=
              5 &&
            !revoke
              .isPending
          ) {
            revoke
              .mutate();
          }
        }}
      >
        <p>
          This action
          is permanent
          and requires
          a confirmed
          blockchain
          transaction.
        </p>

        <label>
          Revocation
          reason

          <textarea
            aria-label="Revocation reason"
            value={
              reason
            }
            minLength={
              5
            }
            maxLength={
              1000
            }
            onChange={(
              event
            ) =>
              setReason(
                event
                  .target
                  .value
              )
            }
            required
          />
        </label>

        {reason.length >
          0 &&
          reason
            .trim()
            .length <
            5 && (
            <div className="notice error">
              Revocation
              reason
              must be at
              least 5
              characters.
            </div>
          )}

        {revoke.isPending && (
          <div className="notice">
            Waiting for
            blockchain
            confirmation…
          </div>
        )}

        {revoke.error && (
          <div
            className="notice error"
            role="alert"
          >
            {(revoke.error as {
              message?: string;
            }).message ||
              "Credential revocation failed."}
          </div>
        )}
      </ConfirmDialog>
    </div>
  );
}

export function Profile() {
  const {
    user,
  } = useAuth();

  return (
    <div className="page narrow">
      <h1>
        Your profile
      </h1>

      <Card>
        <dl>
          <div>
            <dt>
              Name
            </dt>

            <dd>
              {
                user?.fullName
              }
            </dd>
          </div>

          <div>
            <dt>
              Email
            </dt>

            <dd>
              {
                user?.email
              }
            </dd>
          </div>

          <div>
            <dt>
              Role
            </dt>

            <dd>
              <Badge
                value={
                  user?.role ||
                  ""
                }
              />
            </dd>
          </div>
        </dl>

        <Link
          className="button"
          to="/app/change-password"
        >
          Change
          password
        </Link>
      </Card>
    </div>
  );
}

export function UserDetail() {
  const {
    id,
  } = useParams();

  const {
    user: actor,
  } = useAuth();

  const queryClient =
    useQueryClient();

  const [
    confirm,
    setConfirm,
  ] = useState<{
    title: string;
    path: string;
    body?: JsonRecord;
  } | null>(
    null
  );

  const [
    message,
    setMessage,
  ] = useState("");

  const [
    error,
    setError,
  ] = useState("");

  const query =
    useQuery({
      queryKey: [
        "users",
        id,
      ],

      queryFn:
        async () =>
          (
            await api.get(
              `/users/${id}`
            )
          ).data
            .user,
    });

  const institutions =
    useQuery({
      queryKey: [
        "institutions",
        "user-edit",
      ],

      queryFn:
        async () =>
          (
            await api.get(
              "/institutions",
              {
                params: {
                  limit:
                    100,

                  status:
                    "active",
                },
              }
            )
          ).data
            .institutions ||
          [],

      enabled:
        actor?.role ===
        "super_admin",
    });

  const complete =
    (
      text:
        string
    ) => {
      setConfirm(
        null
      );

      setMessage(
        text
      );

      setError(
        ""
      );

      void query.refetch();

      void queryClient
        .invalidateQueries(
          {
            queryKey: [
              "users",
            ],
          }
        );
    };

  const fail =
    (
      value: {
        message?: string;
      }
    ) =>
      setError(
        value.message ||
          "Unable to update account."
      );

  const postAction =
    useMutation({
      mutationFn:
        (
          value: {
            path:
              string;

            body?:
              JsonRecord;
          }
        ) =>
          api.post(
            value.path,
            value.body ||
              {}
          ),

      onSuccess:
        (
          response
        ) =>
          complete(
            response.data
              .message ||
              "Account updated."
          ),

      onError:
        fail,
    });

  const patchAction =
    useMutation({
      mutationFn:
        (
          value: {
            path:
              string;

            body:
              JsonRecord;
          }
        ) =>
          api.patch(
            value.path,
            value.body
          ),

      onSuccess:
        () =>
          complete(
            "Account updated."
          ),

      onError:
        fail,
    });

  const target =
    (
      query.data ||
      {}
    ) as JsonRecord;

  const roles =
    actor?.role ===
    "super_admin"
      ? [
          "super_admin",
          "regulator",
          "institution_admin",
          "issuer",
          "verifier",
          "student",
        ]
      : [
          "issuer",
          "verifier",
          "student",
        ];

  const sensitive =
    (
      titleText:
        string,

      path:
        string,

      body?:
        JsonRecord
    ) =>
      setConfirm(
        {
          title:
            titleText,

          path,

          body,
        }
      );

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <span className="eyebrow">
            User
            administration
          </span>

          <h1>
            User details
          </h1>
        </div>

        <Link
          className="button"
          to="/app/users"
        >
          Back to
          users
        </Link>
      </div>

      <State
        loading={
          query.isLoading
        }
        error={
          query.error
        }
        empty={
          !query.data
        }
      >
        <div className="grid two">
          <Card title="Identity">
            <form
              onSubmit={(
                event
              ) => {
                event.preventDefault();

                const data =
                  new FormData(
                    event
                      .currentTarget
                  );

                patchAction
                  .mutate(
                    {
                      path:
                        `/users/${id}`,

                      body: {
                        fullName:
                          data.get(
                            "fullName"
                          ),

                        email:
                          data.get(
                            "email"
                          ),
                      },
                    }
                  );
              }}
            >
              <Field
                name="fullName"
                label="Full name"
                defaultValue={String(
                  target
                    .fullName ||
                    ""
                )}
              />

              <label>
                Email

                <input
                  required
                  name="email"
                  type="email"
                  defaultValue={String(
                    target
                      .email ||
                      ""
                  )}
                />
              </label>

              <Button
                className="primary"
                disabled={
                  patchAction
                    .isPending
                }
              >
                Save
                identity
              </Button>
            </form>
          </Card>

          <Card title="Security status">
            <dl>
              <div>
                <dt>
                  Role
                </dt>

                <dd>
                  <Badge
                    value={String(
                      target
                        .role ||
                        ""
                    )}
                  />
                </dd>
              </div>

              <div>
                <dt>
                  Institution
                </dt>

                <dd>
                  {String(
                    target
                      .institutionName ||
                      target
                        .institutionId ||
                      "Global"
                  )}
                </dd>
              </div>

              <div>
                <dt>
                  Account
                </dt>

                <dd>
                  {target
                    .isActive
                    ? "Active"
                    : "Inactive"}
                </dd>
              </div>

              <div>
                <dt>
                  Lock
                </dt>

                <dd>
                  {target
                    .isLocked
                    ? "Locked"
                    : "Unlocked"}
                </dd>
              </div>

              <div>
                <dt>
                  Password
                  change
                </dt>

                <dd>
                  {target
                    .mustChangePassword
                    ? "Required"
                    : "Not required"}
                </dd>
              </div>

              <div>
                <dt>
                  Last login
                </dt>

                <dd>
                  {target
                    .lastLoginAt
                    ? new Date(
                        String(
                          target
                            .lastLoginAt
                        )
                      ).toLocaleString()
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
                value={String(
                  target
                    .role ||
                    ""
                )}
                onChange={(
                  event
                ) =>
                  sensitive(
                    "Change this user role?",
                    `/users/${id}/role`,
                    {
                      role:
                        event
                          .target
                          .value,
                    }
                  )
                }
              >
                {roles.map(
                  (
                    role
                  ) => (
                    <option
                      key={
                        role
                      }
                      value={
                        role
                      }
                    >
                      {role.replaceAll(
                        "_",
                        " "
                      )}
                    </option>
                  )
                )}
              </select>
            </label>

            {actor?.role ===
              "super_admin" &&
              ![
                "super_admin",
                "regulator",
              ].includes(
                String(
                  target
                    .role ||
                    ""
                )
              ) && (
                <label>
                  Institution

                  <select
                    aria-label="Institution"
                    value={String(
                      target
                        .institutionId ||
                        ""
                    )}
                    onChange={(
                      event
                    ) =>
                      sensitive(
                        "Reassign this user institution?",
                        `/users/${id}/institution`,
                        {
                          institutionId:
                            event
                              .target
                              .value,
                        }
                      )
                    }
                  >
                    <option
                      value=""
                      disabled
                    >
                      Select
                      institution
                    </option>

                    {(
                      institutions.data ||
                      []
                    ).map(
                      (
                        institution:
                          JsonRecord
                      ) => (
                        <option
                          key={String(
                            institution.id
                          )}
                          value={String(
                            institution.id
                          )}
                        >
                          {String(
                            institution.name
                          )}
                        </option>
                      )
                    )}
                  </select>
                </label>
              )}

            <Button
              onClick={() =>
                sensitive(
                  target
                    .isActive
                    ? "Deactivate this account?"
                    : "Activate this account?",

                  `/users/${id}/status`,

                  {
                    isActive:
                      !target
                        .isActive,
                  }
                )
              }
            >
              {target
                .isActive
                ? "Deactivate"
                : "Activate"}
            </Button>

            {Boolean(
              target
                .isLocked
            ) && (
              <Button
                onClick={() =>
                  sensitive(
                    "Unlock this account?",
                    `/users/${id}/unlock`
                  )
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
              Require
              password
              change
            </Button>

            <Button
              onClick={() =>
                sensitive(
                  "Send password reset instructions?",
                  `/users/${id}/reset-password`
                )
              }
            >
              Send
              password
              reset
            </Button>
          </div>

          {error && (
            <div
              className="notice error"
              role="alert"
            >
              {
                error
              }
            </div>
          )}

          {message && (
            <div className="notice success">
              {
                message
              }
            </div>
          )}
        </Card>
      </State>

      <ConfirmDialog
        open={Boolean(
          confirm
        )}
        title={
          confirm
            ?.title ||
          "Confirm action"
        }
        onCancel={() =>
          setConfirm(
            null
          )
        }
        onConfirm={() => {
          if (
            !confirm
          ) {
            return;
          }

          if (
            /\/(status|role|institution)$/.test(
              confirm.path
            )
          ) {
            patchAction
              .mutate(
                {
                  path:
                    confirm.path,

                  body:
                    confirm.body ||
                    {},
                }
              );
          } else {
            postAction
              .mutate(
                confirm
              );
          }
        }}
      >
        <p>
          This
          security-sensitive
          action is
          recorded in
          the audit log
          and may
          invalidate
          existing
          sessions.
        </p>
      </ConfirmDialog>
    </div>
  );
}