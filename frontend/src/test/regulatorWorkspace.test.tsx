import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";

import {
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";

import { MemoryRouter } from "react-router-dom";

import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import App from "../App";
import { api } from "../api/client";
import type { Role } from "../types";


const actor = vi.hoisted(() => ({
  role: "regulator" as Role,
  blockchainAuthorised: false,
}));


vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({
    user: {
      id: "actor",
      fullName: "Test Actor",
      role: actor.role,
      institutionId: null,
    },
    loading: false,
    logout: vi.fn(),
  }),
}));


vi.mock("../api/client", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
  downloadBlob: vi.fn(),
}));


const row = {
  id: "record-1",
  institution_name: "Test University",
  institution_id: "institution-1",
  status: "accredited",
  valid_from: "2025-01-01",
  valid_to: null,
};


function mount(path = "/app") {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </QueryClientProvider>
  );
}


beforeEach(() => {
  vi.resetAllMocks();

  actor.role = "regulator";
  actor.blockchainAuthorised = false;

  vi.mocked(api.get).mockImplementation(
    async (url, config) => {
      /*
       * Accreditation history
       */
      if (String(url).endsWith("/history")) {
        return {
          data: {
            history: [
              {
                id: "audit-1",
                action: "ACCREDITATION_CREATED",
                created_at: "2025-01-01",
                details: {},
              },
            ],
          },
        } as never;
      }

      /*
       * Institution blockchain authorisation status.
       *
       * This deliberately reflects the result of the mocked
       * authorise/deactivate actions below.
       */
      if (String(url).endsWith("/blockchain/status")) {
        return {
          data: {
            success: true,
            authorised: actor.blockchainAuthorised,
          },
        } as never;
      }

      /*
       * Institution management listing
       */
      if (url === "/institutions") {
        return {
          data: {
            institutions: [
              {
                id: "institution-1",
                name: "Test University",
                status: true,
              },
            ],
            total: 1,
          },
        } as never;
      }

      /*
       * Accreditation listing / regulator dashboard totals
       */
      const totals: Record<string, number> = {
        accredited: 120,
        suspended: 20,
        revoked: 10,
      };

      const status = (
        config?.params as
          | {
              status?: string;
            }
          | undefined
      )?.status;

      return {
        data: {
          accreditations: [row],
          total:
            (status
              ? totals[status]
              : undefined) ?? 150,
        },
      } as never;
    }
  );


  /*
   * Mock blockchain actions while maintaining realistic
   * blockchain state transitions.
   */
  vi.mocked(api.post).mockImplementation(
    async (url) => {
      if (
        String(url).endsWith(
          "/blockchain/authorise"
        )
      ) {
        actor.blockchainAuthorised = true;
      }

      if (
        String(url).endsWith(
          "/blockchain/deactivate"
        )
      ) {
        actor.blockchainAuthorised = false;
      }

      return {
        data: {
          message: "Saved",
        },
      } as never;
    }
  );


  vi.mocked(api.patch).mockResolvedValue({
    data: {
      message: "Saved",
    },
  } as never);
});


describe("regulator workspace", () => {
  it(
    "renders the dedicated dashboard with server totals and only permitted navigation",
    async () => {
      mount();

      expect(
        await screen.findByRole("heading", {
          name: "Regulator Dashboard",
        })
      ).toBeInTheDocument();

      expect(
        await screen.findByText("150")
      ).toBeInTheDocument();

      for (const count of [
        "120",
        "20",
        "10",
      ]) {
        expect(
          screen.getByText(count)
        ).toBeInTheDocument();
      }

      for (const name of [
        "Dashboard",
        "Accreditations",
        "Verify",
        "Profile",
      ]) {
        expect(
          screen.getByRole("link", {
            name,
          })
        ).toBeInTheDocument();
      }

      for (const name of [
        "Institutions",
        "Users",
        "Students",
        "Credentials",
        "Audit logs",
        "Verification logs",
      ]) {
        expect(
          screen.queryByRole("link", {
            name,
          })
        ).not.toBeInTheDocument();
      }

      expect(
        screen.getByRole("link", {
          name: "Manage accreditations",
        })
      ).toHaveAttribute(
        "href",
        "/app/accreditations"
      );

      expect(
        screen.getByText(/not a live ZIMCHE/)
      ).toBeInTheDocument();

      expect(api.get).toHaveBeenCalledTimes(4);

      expect(
        vi
          .mocked(api.get)
          .mock.calls.every(
            ([url]) =>
              url === "/accreditations"
          )
      ).toBe(true);
    }
  );


  it.each([
    "institutions",
    "institutions/new",
    "users",
    "students",
    "credentials/new",
    "credentials/record-1",
    "verifications",
    "audit",
  ])(
    "denies regulator direct access to %s",
    async (path) => {
      mount(`/app/${path}`);

      expect(
        await screen.findByRole("heading", {
          name: "Access restricted",
        })
      ).toBeInTheDocument();

      expect(
        api.get
      ).not.toHaveBeenCalled();
    }
  );


  it.each([
    "institution_admin",
    "issuer",
    "verifier",
    "student",
  ] as Role[])(
    "denies %s access to the accreditation workspace",
    async (role) => {
      actor.role = role;

      mount("/app/accreditations");

      expect(
        await screen.findByRole("heading", {
          name: "Access restricted",
        })
      ).toBeInTheDocument();

      expect(
        api.get
      ).not.toHaveBeenCalled();
    }
  );


  it(
    "makes Super Admin accreditation oversight read-only, with history and pagination",
    async () => {
      actor.role = "super_admin";

      mount("/app/accreditations");

      expect(
        await screen.findByText(
          "Test University"
        )
      ).toBeInTheDocument();

      expect(
        screen.queryByRole("button", {
          name: "Create accreditation",
        })
      ).not.toBeInTheDocument();

      expect(
        screen.queryByRole("combobox")
      ).not.toBeInTheDocument();

      fireEvent.click(
        screen.getByRole("button", {
          name: "View history",
        })
      );

      expect(
        await screen.findByText(
          /ACCREDITATION CREATED/
        )
      ).toBeInTheDocument();

      fireEvent.click(
        screen.getByRole("button", {
          name: "Next records",
        })
      );

      await waitFor(() =>
        expect(api.get).toHaveBeenCalledWith(
          "/accreditations",
          {
            params: {
              limit: 20,
              offset: 20,
            },
          }
        )
      );

      expect(
        api.post
      ).not.toHaveBeenCalled();

      expect(
        api.patch
      ).not.toHaveBeenCalled();

      expect(
        api.get
      ).not.toHaveBeenCalledWith(
        "/institutions",
        expect.anything()
      );
    }
  );


  it(
    "lets regulator create and change status through accreditation endpoints",
    async () => {
      mount("/app/accreditations");

      await screen.findByRole("option", {
        name: "Test University",
      });

      fireEvent.change(
        screen.getByLabelText(
          "Institution"
        ),
        {
          target: {
            value: "institution-1",
          },
        }
      );

      fireEvent.change(
        screen.getByLabelText(
          "Valid from"
        ),
        {
          target: {
            value: "2025-01-01",
          },
        }
      );

      fireEvent.click(
        screen.getByRole("button", {
          name: "Create accreditation",
        })
      );

      await waitFor(() =>
        expect(api.post).toHaveBeenCalledWith(
          "/accreditations",
          {
            institutionId:
              "institution-1",
            programme: null,
            validFrom: "2025-01-01",
            validTo: null,
            status: "accredited",
          }
        )
      );

      fireEvent.change(
        screen.getByLabelText(
          "Status for Test University"
        ),
        {
          target: {
            value: "suspended",
          },
        }
      );

      await waitFor(() =>
        expect(
          api.patch
        ).toHaveBeenCalledWith(
          "/accreditations/record-1/status",
          {
            status: "suspended",
          }
        )
      );
    }
  );


  it(
    "surfaces accreditation API failures without requesting forbidden dashboard APIs",
    async () => {
      vi.mocked(
        api.get
      ).mockRejectedValue(
        new Error(
          "Accreditation service unavailable"
        )
      );

      mount();

      expect(
        await screen.findByRole("alert")
      ).toHaveTextContent(
        "Accreditation service unavailable"
      );

      expect(
        vi
          .mocked(api.get)
          .mock.calls.every(
            ([url]) =>
              url === "/accreditations"
          )
      ).toBe(true);
    }
  );


  it(
    "retains Super Admin wallet controls and distinct platform status actions",
    async () => {
      actor.role = "super_admin";
      actor.blockchainAuthorised = false;

      vi.spyOn(
        window,
        "confirm"
      ).mockReturnValue(true);

      mount("/app/institutions");

      /*
       * Wait for the protected Management lazy chunk to
       * finish loading before searching for its controls.
       */
      await vi.dynamicImportSettled();

      const authoriseButton =
        await screen.findByRole(
          "button",
          {
            name: "Authorise on blockchain",
          },
          {
            timeout: 15000,
          }
        );

      expect(
        authoriseButton
      ).toBeEnabled();

      fireEvent.click(
        authoriseButton
      );

      await waitFor(
        () =>
          expect(
            api.post
          ).toHaveBeenCalledWith(
            "/institutions/institution-1/blockchain/authorise",
            {},
            {
              timeout: 120000,
            }
          ),
        {
          timeout: 10000,
        }
      );


      /*
       * The blockchain status query should refresh after
       * authorisation and expose the opposite blockchain action.
       */
      const blockchainDeactivateButton =
        await screen.findByRole(
          "button",
          {
            name: "Deactivate on blockchain",
          },
          {
            timeout: 15000,
          }
        );

      expect(
        blockchainDeactivateButton
      ).toBeEnabled();

      fireEvent.click(
        blockchainDeactivateButton
      );

      await waitFor(
        () =>
          expect(
            api.post
          ).toHaveBeenCalledWith(
            "/institutions/institution-1/blockchain/deactivate",
            {},
            {
              timeout: 120000,
            }
          ),
        {
          timeout: 10000,
        }
      );


      /*
       * Platform database status remains a separate action
       * from blockchain authorisation status.
       */
      const institutionDeactivateButton =
        await screen.findByRole(
          "button",
          {
            name: "Deactivate institution",
          },
          {
            timeout: 15000,
          }
        );

      expect(
        institutionDeactivateButton
      ).toBeEnabled();

      fireEvent.click(
        institutionDeactivateButton
      );

      await waitFor(
        () =>
          expect(
            api.patch
          ).toHaveBeenCalledWith(
            "/institutions/institution-1/status",
            {
              status: false,
            }
          ),
        {
          timeout: 10000,
        }
      );
    },
    120000
  );
});