import {
  useState,
} from "react";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  api,
} from "../api/client";

import {
  Badge,
  Button,
  Card,
  State,
} from "../components/ui";

import { useAuth } from "../context/AuthContext";

import type {
  JsonRecord,
} from "../types";

export function AccreditationsPage() {
  const { user } = useAuth();
  const canManageAccreditation =
    user?.role === "regulator";
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

  const [page, setPage] =
    useState(1);


  const institutions =
    useQuery({
      queryKey: [
        "institutions",
        "accreditation-management",
      ],
      enabled: canManageAccreditation,

      queryFn:
        async () =>
          (
            await api.get(
              "/institutions",
              {
                params: {
                  limit: 100,
                },
              }
            )
          ).data
            .institutions ||
          [],
    });

  const accreditations =
    useQuery({
      queryKey: [
        "accreditations",
        page,
      ],

      queryFn:
        async () =>
          (
            await api.get(
              "/accreditations",
              {
                params: {
                  limit: 20,
                  offset:
                    (page - 1) * 20,
                },
              }
            )
          ).data,
    });

  const create =
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

          const programme =
            String(
              data.get(
                "programme"
              ) || ""
            ).trim();

          const validTo =
            String(
              data.get(
                "validTo"
              ) || ""
            ).trim();

          return api.post(
            "/accreditations",
            {
              institutionId:
                data.get(
                  "institutionId"
                ),

              programme:
                programme ||
                null,

              validFrom:
                data.get(
                  "validFrom"
                ),

              validTo:
                validTo ||
                null,

              status:
                data.get(
                  "status"
                ),
            }
          );
        },

      onSuccess:
        (
          response,
          form
        ) => {
          setError("");

          setMessage(
            response.data
              .message ||
              "Accreditation record created."
          );

          form.reset();

          void queryClient.invalidateQueries(
            {
              queryKey: [
                "accreditations",
              ],
            }
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
          setMessage("");

          setError(
            value.response
              ?.data
              ?.message ||
              value.message ||
              "Unable to create accreditation record."
          );
        },
    });

  const updateStatus =
    useMutation({
      mutationFn:
        async ({
          id,
          status,
        }: {
          id: string;
          status: string;
        }) =>
          api.patch(
            `/accreditations/${id}/status`,
            {
              status,
            }
          ),

      onSuccess:
        () => {
          setError("");

          setMessage(
            "Accreditation status updated."
          );

          void queryClient.invalidateQueries(
            {
              queryKey: [
                "accreditations",
              ],
            }
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
          setError(
            value.response
              ?.data
              ?.message ||
              value.message ||
              "Unable to update accreditation status."
          );
        },
    });

  const history =
    useMutation({
      mutationFn:
        async (
          id: string
        ) =>
          (
            await api.get(
              `/accreditations/${id}/history`
            )
          ).data as {
            history?: JsonRecord[];
          },

      onMutate:
        () => {
          setError("");
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
          setError(
            value.response
              ?.data
              ?.message ||
              value.message ||
              "Unable to load accreditation history."
          );
        },
    });

  const rows =
    (
      accreditations.data
        ?.accreditations ||
      []
    ) as JsonRecord[];

  const accreditationTotal =
    Number(
      accreditations.data
        ?.total ??
      rows.length
    );

  const hasNextPage =
    page * 20 <
    accreditationTotal;

  const historyRows =
    (
      history.data
        ?.history ||
      []
    ) as JsonRecord[];


  return (
    <div className="page">
      <div className="page-head">
        <div>
          <span className="eyebrow">
            Regulatory trust
          </span>

          <h1>
            Accreditation records
          </h1>
        </div>
      </div>

      <div
        className="notice"
        role="note"
      >
        These are{" "}
        <strong>
          simulated regulator
          records
        </strong>{" "}
        used by the research
        prototype. They are not a
        live ZIMCHE accreditation
        feed.
      </div>

      <div className="grid two">
        {canManageAccreditation && (
<Card title="Create accreditation record">
          <form
            onSubmit={(
              event
            ) => {
              event.preventDefault();

              setMessage("");
              setError("");

              create.mutate(
                event.currentTarget
              );
            }}
          >
            <label>
              Institution

              <select
                required
                name="institutionId"
              >
                <option value="">
                  Select institution
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

            <label>
              Programme
              (optional)

              <input
                name="programme"
                type="text"
                maxLength={
                  300
                }
                placeholder="Leave blank for institution-wide accreditation"
              />
            </label>

            <label>
              Valid from

              <input
                required
                name="validFrom"
                type="date"
              />
            </label>

            <label>
              Valid to
              (optional)

              <input
                name="validTo"
                type="date"
              />
            </label>

            <label>
              Status

              <select
                required
                name="status"
                defaultValue="accredited"
              >
                <option value="accredited">
                  Accredited
                </option>

                <option value="suspended">
                  Suspended
                </option>

                <option value="revoked">
                  Revoked
                </option>
              </select>
            </label>

            <Button
              className="primary"
              disabled={
                create.isPending
              }
            >
              {create.isPending
                ? "Creating…"
                : "Create accreditation"}
            </Button>
          </form>
        </Card>
        )}

        <Card title="Decision rule">
          <p>
            During issuance and
            verification, VerifyZW
            checks whether an
            accredited regulator
            record covers the
            institution and the
            student's programme on
            the credential's award
            date.
          </p>

          <p>
            Institution-wide
            records use a blank
            programme. A
            programme-specific
            record takes
            precedence when both
            are valid.
          </p>

          <p>
            This regulator check is
            independent of the
            institution's
            blockchain wallet
            authorisation.
          </p>
        </Card>
      </div>

      {error && (
        <div
          className="notice error"
          role="alert"
        >
          {error}
        </div>
      )}

      {message && (
        <div className="notice success">
          {message}
        </div>
      )}

      <Card title="Configured accreditation records">
        <State
          loading={
            accreditations.isLoading
          }
          error={
            accreditations.error
          }
          empty={
            !accreditations.isLoading &&
            rows.length === 0
          }
        >
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>
                    Institution
                  </th>

                  <th>
                    Programme
                  </th>

                  <th>
                    Valid from
                  </th>

                  <th>
                    Valid to
                  </th>

                  <th>
                    Status
                  </th>

                  <th>
                    Source
                  </th>

                  <th>
                    Change status
                  </th>

                  <th>
                    History
                  </th>
                </tr>
              </thead>

              <tbody>
                {rows.map(
                  (
                    row
                  ) => (
                    <tr
                      key={String(
                        row.id
                      )}
                    >
                      <td>
                        {String(
                          row.institution_name ||
                            row.institution_id
                        )}
                      </td>

                      <td>
                        {String(
                          row.programme ||
                            "Institution-wide"
                        )}
                      </td>

                      <td>
                        {String(
                          row.valid_from ||
                            ""
                        ).slice(
                          0,
                          10
                        )}
                      </td>

                      <td>
                        {row.valid_to
                          ? String(
                              row.valid_to
                            ).slice(
                              0,
                              10
                            )
                          : "Open-ended"}
                      </td>

                      <td>
                        <Badge
                          value={String(
                            row.status ||
                              "unknown"
                          )}
                        />
                      </td>

                      <td>
                        {String(
                          row.source_label ||
                            "SIMULATED_REGULATOR"
                        )}
                      </td>

                      <td>
                        {canManageAccreditation ? (
                          <select
                          aria-label={`Status for ${String(
                            row.institution_name ||
                              row.id
                          )}`}
                          value={String(
                            row.status ||
                              "accredited"
                          )}
                          disabled={
                            updateStatus.isPending
                          }
                          onChange={(
                            event
                          ) =>
                            updateStatus.mutate(
                              {
                                id:
                                  String(
                                    row.id
                                  ),

                                status:
                                  event
                                    .target
                                    .value,
                              }
                            )
                          }
                        >
                          <option value="accredited">
                            Accredited
                          </option>

                          <option value="suspended">
                            Suspended
                          </option>

                          <option value="revoked">
                            Revoked
                          </option>
                        </select>
                        ) : (
                          <span>Read only</span>
                        )}
                      </td>

                      <td>
                        <Button
                          disabled={
                            history.isPending
                          }
                          onClick={() =>
                            history.mutate(
                              String(
                                row.id
                              )
                            )
                          }
                        >
                          View history
                        </Button>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>

          <div className="actions">
            <Button
              disabled={
                page <= 1
              }
              onClick={() =>
                setPage(
                  (current) =>
                    Math.max(
                      1,
                      current - 1
                    )
                )
              }
            >
              Previous records
            </Button>

            <Button
              disabled={
                !hasNextPage
              }
              onClick={() =>
                setPage(
                  (current) =>
                    current + 1
                )
              }
            >
              Next records
            </Button>
          </div>
        </State>
      </Card>

      {(history.isPending ||
        historyRows.length > 0) && (
        <Card title="Accreditation history">
          {history.isPending ? (
            <p>
              Loading history?
            </p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>
                      Action
                    </th>

                    <th>
                      Date
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {historyRows.map(
                    (
                      item
                    ) => (
                      <tr
                        key={String(
                          item.id
                        )}
                      >
                        <td>
                          {String(
                            item.action ||
                              "UNKNOWN"
                          ).replaceAll(
                            "_",
                            " "
                          )}
                        </td>

                        <td>
                          {String(
                            item.created_at ||
                              ""
                          )}
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}