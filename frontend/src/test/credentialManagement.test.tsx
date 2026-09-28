import {
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";

import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";

import {
  MemoryRouter,
  Route,
  Routes,
} from "react-router-dom";

import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  api,
  downloadBlob,
} from "../api/client";

import {
  CreatePage,
  CredentialDetail,
} from "../pages/Management";

const authState = vi.hoisted(() => ({
  role: "super_admin",
  institutionId: null as string | null,
}));

vi.mock(
  "../api/client",
  () => ({
    api: {
      get: vi.fn(),
      post: vi.fn(),
      patch: vi.fn(),
    },

    downloadBlob:
      vi.fn(),
  })
);

vi.mock(
  "../context/AuthContext",
  () => ({
    useAuth: () => ({
      user: {
        id: "actor",
        fullName:
          "Test Actor",
        email:
          "actor@example.test",
        role:
          authState.role,
        institutionId:
          authState.institutionId,
      },
    }),
  })
);

const baseDetail = {
  id:
    "credential-1",

  student_id:
    "student-1",

  institution_id:
    "inst-1",

  status:
    "active",

  student_name:
    "Example Student",

  student_number:
    "ST-001",

  institution_name:
    "Example Institution",

  public_token:
    "11111111-1111-4111-8111-111111111111",

  qualification:
    "Diploma",

  issue_date:
    "2026-01-01",

  certificate_hash:
    "a".repeat(
      64
    ),

  ipfs_cid:
    "QmSafe",

  blockchain_tx:
    "0xsafe",

  blockchain_network:
    "localhost",

  contract_address:
    "0xcontract",

  block_number:
    1,

  qr_code_path:
    "/generated/qr/safe.png",
};

const replacementCredential = {
  id:
    "credential-2",

  student_id:
    "student-1",

  institution_id:
    "inst-1",

  status:
    "active",

  qualification:
    "Corrected Diploma",

  issue_date:
    "2026-02-01",

  student_name:
    "Example Student",

  student_number:
    "ST-001",

  institution_name:
    "Example Institution",
};

let detailResponse:
  Record<string, unknown>;

let replacementCandidates:
  Array<
    Record<
      string,
      unknown
    >
  >;

const setRole = (
  role: string
) => {
  authState.role =
    role;

  authState.institutionId =
    role ===
    "super_admin"
      ? null
      : "inst-1";
};

const wrapper = (
  node:
    React.ReactNode,

  entry =
    "/app/credentials/credential-1"
) => (
  <QueryClientProvider
    client={
      new QueryClient({
        defaultOptions: {
          queries: {
            retry:
              false,
          },
        },
      })
    }
  >
    <MemoryRouter
      initialEntries={[
        entry,
      ]}
    >
      <Routes>
        <Route
          path="/app/credentials/:id"
          element={
            node
          }
        />

        <Route
          path="/app/credentials/new"
          element={
            node
          }
        />
      </Routes>
    </MemoryRouter>
  </QueryClientProvider>
);

describe(
  "credential management",
  () => {
    beforeEach(() => {
      vi.clearAllMocks();

      setRole(
        "super_admin"
      );

      detailResponse =
        {
          ...baseDetail,
        };

      replacementCandidates =
        [
          {
            ...baseDetail,
          },

          {
            ...replacementCredential,
          },
        ];

      vi.stubEnv(
        "VITE_IPFS_GATEWAY",
        "https://ipfs.example.test/ipfs"
      );

      vi.mocked(
        api.get
      ).mockImplementation(
        async (
          path:
            string
        ) => {
          if (
            path.startsWith(
              "/credentials/"
            )
          ) {
            return {
              data: {
                credential:
                  detailResponse,
              },
            } as never;
          }

          if (
            path ===
            "/credentials"
          ) {
            return {
              data: {
                credentials:
                  replacementCandidates,

                pagination: {
                  page:
                    1,

                  limit:
                    100,

                  total:
                    replacementCandidates.length,

                  totalPages:
                    1,
                },
              },
            } as never;
          }

          if (
            path ===
            "/institutions"
          ) {
            return {
              data: {
                institutions:
                  [
                    {
                      id:
                        "inst-1",

                      name:
                        "Example Institution",
                    },
                  ],
              },
            } as never;
          }

          if (
            path ===
            "/students"
          ) {
            return {
              data: {
                students:
                  [
                    {
                      id:
                        "student-1",

                      institution_id:
                        "inst-1",

                      full_name:
                        "Example Student",

                      student_number:
                        "ST-001",
                    },
                  ],
              },
            } as never;
          }

          return {
            data: {},
          } as never;
        }
      );

      vi.mocked(
        api.post
      ).mockResolvedValue(
        {
          data: {
            success:
              true,
          },
        } as never
      );

      vi.mocked(
        api.patch
      ).mockResolvedValue(
        {
          data: {
            success:
              true,

            credential: {
              ...baseDetail,

              status:
                "revoked",
            },
          },
        } as never
      );

      vi.mocked(
        downloadBlob
      ).mockResolvedValue(
        undefined
      );
    });

    it(
      "renders human-readable detail and safe evidence links",
      async () => {
        render(
          wrapper(
            <CredentialDetail />
          )
        );

        expect(
          await screen.findByText(
            "Example Student"
          )
        ).toBeInTheDocument();

        expect(
          screen.getByText(
            "Example Institution"
          )
        ).toBeInTheDocument();

        expect(
          screen.getByRole(
            "link",
            {
              name:
                /IPFS evidence/i,
            }
          )
        ).toHaveAttribute(
          "rel",
          "noopener noreferrer"
        );

        expect(
          await screen.findByText(
            "11111111-1111-4111-8111-111111111111"
          )
        ).toBeInTheDocument();

        expect(
          screen.getByRole(
            "button",
            {
              name:
                /copy public token/i,
            }
          )
        ).toBeInTheDocument();

        expect(
          screen.getByRole(
            "link",
            {
              name:
                /open public verification/i,
            }
          )
        ).toHaveAttribute(
          "href",
          expect.stringContaining(
            "/verify/token/11111111-1111-4111-8111-111111111111"
          )
        );
      }
    );

    it(
      "downloads the generated presentation PDF through authenticated API",
      async () => {
        render(
          wrapper(
            <CredentialDetail />
          )
        );

        fireEvent.click(
          await screen.findByText(
            /Download presentation PDF/i
          )
        );

        await waitFor(
          () =>
            expect(
              downloadBlob
            ).toHaveBeenCalledWith(
              "/credentials/credential-1/pdf",
              "credential-credential-1.pdf"
            )
        );
      }
    );

    it(
      "shows safe missing PDF errors",
      async () => {
        vi.mocked(
          downloadBlob
        ).mockRejectedValue(
          {
            message:
              "Presentation certificate is unavailable.",
          }
        );

        render(
          wrapper(
            <CredentialDetail />
          )
        );

        fireEvent.click(
          await screen.findByText(
            /Download presentation PDF/i
          )
        );

        expect(
          await screen.findByRole(
            "alert"
          )
        ).toHaveTextContent(
          /unavailable/i
        );
      }
    );

    it(
      "uses institution and bounded student selectors instead of raw UUID fields",
      async () => {
        render(
          wrapper(
            <CreatePage kind="credentials" />,
            "/app/credentials/new"
          )
        );

        expect(
          await screen.findByText(
            "Example Institution"
          )
        ).toBeInTheDocument();

        fireEvent.change(
          screen.getByLabelText(
            "Institution"
          ),
          {
            target: {
              value:
                "inst-1",
            },
          }
        );

        expect(
          await screen.findByText(
            /Example Student.*ST-001/
          )
        ).toBeInTheDocument();

        expect(
          screen.queryByLabelText(
            "Student ID"
          )
        ).not.toBeInTheDocument();

        expect(
          api.get
        ).toHaveBeenCalledWith(
          "/students",
          {
            params:
              expect.objectContaining(
                {
                  page:
                    1,

                  limit:
                    20,
                }
              ),
          }
        );
      }
    );

    it(
      "requires revocation confirmation and refreshes through query invalidation",
      async () => {
        render(
          wrapper(
            <CredentialDetail />
          )
        );

        fireEvent.click(
          await screen.findByText(
            "Revoke credential"
          )
        );

        expect(
          screen.getByRole(
            "dialog"
          )
        ).toBeInTheDocument();

        fireEvent.change(
          screen.getByLabelText(
            "Revocation reason"
          ),
          {
            target: {
              value:
                "Issued in error",
            },
          }
        );

        fireEvent.click(
          screen.getByText(
            "Confirm"
          )
        );

        await waitFor(
          () => {
            expect(
              api.patch
            ).toHaveBeenCalledWith(
              "/credentials/credential-1/revoke",
              {
                reason:
                  "Issued in error",
              },
              {
                timeout:
                  120000,
              }
            );
          }
        );
      }
    );

    it(
      "shows the correction action to a super administrator",
      async () => {
        setRole(
          "super_admin"
        );

        render(
          wrapper(
            <CredentialDetail />
          )
        );

        expect(
          await screen.findByRole(
            "button",
            {
              name:
                /Correct \/ supersede credential/i,
            }
          )
        ).toBeInTheDocument();
      }
    );

    it(
      "shows the correction action to an issuer",
      async () => {
        setRole(
          "issuer"
        );

        render(
          wrapper(
            <CredentialDetail />
          )
        );

        expect(
          await screen.findByRole(
            "button",
            {
              name:
                /Correct \/ supersede credential/i,
            }
          )
        ).toBeInTheDocument();
      }
    );

    it(
      "does not expose correction action to a verifier",
      async () => {
        setRole(
          "verifier"
        );

        render(
          wrapper(
            <CredentialDetail />
          )
        );

        await screen.findByText(
          "Example Student"
        );

        expect(
          screen.queryByRole(
            "button",
            {
              name:
                /Correct \/ supersede credential/i,
            }
          )
        ).not.toBeInTheDocument();
      }
    );

    it(
      "does not expose correction action to a student",
      async () => {
        setRole(
          "student"
        );

        render(
          wrapper(
            <CredentialDetail />
          )
        );

        await screen.findByText(
          "Example Student"
        );

        expect(
          screen.queryByRole(
            "button",
            {
              name:
                /Correct \/ supersede credential/i,
            }
          )
        ).not.toBeInTheDocument();
      }
    );

    it(
      "does not expose correction action to a regulator",
      async () => {
        setRole(
          "regulator"
        );

        render(
          wrapper(
            <CredentialDetail />
          )
        );

        await screen.findByText(
          "Example Student"
        );

        expect(
          screen.queryByRole(
            "button",
            {
              name:
                /Correct \/ supersede credential/i,
            }
          )
        ).not.toBeInTheDocument();
      }
    );

    it(
      "renders replacement traceability for a superseded original credential",
      async () => {
        detailResponse =
          {
            ...baseDetail,

            status:
              "superseded",

            superseded_by:
              "credential-2",

            superseded_at:
              "2026-02-01T10:30:00.000Z",

            supersession_reason:
              "Correction of qualification details",
          };

        render(
          wrapper(
            <CredentialDetail />
          )
        );

        expect(
          await screen.findByText(
            /has been superseded and is no longer the current credential/i
          )
        ).toBeInTheDocument();

        expect(
          screen.getByText(
            "Correction of qualification details"
          )
        ).toBeInTheDocument();

        expect(
          screen.getByRole(
            "link",
            {
              name:
                /Open replacement credential/i,
            }
          )
        ).toHaveAttribute(
          "href",
          "/app/credentials/credential-2"
        );

        expect(
          screen.queryByRole(
            "button",
            {
              name:
                /Correct \/ supersede credential/i,
            }
          )
        ).not.toBeInTheDocument();
      }
    );

    it(
      "renders reverse traceability when viewing the replacement credential",
      async () => {
        detailResponse =
          {
            ...baseDetail,

            id:
              "credential-2",

            supersedes_credential_id:
              "credential-1",
          };

        render(
          wrapper(
            <CredentialDetail />,
            "/app/credentials/credential-2"
          )
        );

        expect(
          await screen.findByText(
            /replacement for a previous credential/i
          )
        ).toBeInTheDocument();

        expect(
          screen.getByRole(
            "link",
            {
              name:
                /Open original credential/i,
            }
          )
        ).toHaveAttribute(
          "href",
          "/app/credentials/credential-1"
        );
      }
    );

    it(
      "submits supersession with a valid replacement and excludes the current credential",
      async () => {
        render(
          wrapper(
            <CredentialDetail />
          )
        );

        fireEvent.click(
          await screen.findByRole(
            "button",
            {
              name:
                /Correct \/ supersede credential/i,
            }
          )
        );

        expect(
          screen.getByRole(
            "dialog"
          )
        ).toBeInTheDocument();

        const replacementSelect =
          await screen.findByLabelText(
            "Replacement credential"
          );

        await waitFor(
          () => {
            expect(
              screen.getByRole(
                "option",
                {
                  name:
                    /credential-2/i,
                }
              )
            ).toBeInTheDocument();
          }
        );

        expect(
          screen.queryByRole(
            "option",
            {
              name:
                /credential-1/i,
            }
          )
        ).not.toBeInTheDocument();

        expect(
          api.get
        ).toHaveBeenCalledWith(
          "/credentials",
          {
            params: {
              studentId:
                "student-1",

              institutionId:
                "inst-1",

              status:
                "active",

              page:
                1,

              limit:
                100,
            },
          }
        );

        fireEvent.change(
          replacementSelect,
          {
            target: {
              value:
                "credential-2",
            },
          }
        );

        fireEvent.change(
          screen.getByLabelText(
            "Supersession reason"
          ),
          {
            target: {
              value:
                "Correction of qualification details",
            },
          }
        );

        fireEvent.click(
          screen.getByText(
            "Confirm"
          )
        );

        await waitFor(
          () => {
            expect(
              api.patch
            ).toHaveBeenCalledWith(
              "/credentials/credential-1/supersede",
              {
                replacementCredentialId:
                  "credential-2",

                reason:
                  "Correction of qualification details",
              },
              {
                timeout:
                  120000,
              }
            );
          }
        );
      }
    );
  }
);