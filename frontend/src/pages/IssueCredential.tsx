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
  api,
} from "../api/client";

import {
  Button,
  Card,
} from "../components/ui";

import {
  useAuth,
} from "../context/AuthContext";

import type {
  JsonRecord,
} from "../types";

export function IssueCredentialPage() {
  const { user } =
    useAuth();

  const queryClient =
    useQueryClient();

  const [
    institutionId,
    setInstitutionId,
  ] = useState(
    user?.institutionId ||
      ""
  );

  const [
    studentSearch,
    setStudentSearch,
  ] = useState("");

  const [
    studentId,
    setStudentId,
  ] = useState("");

  const [
    awardDate,
    setAwardDate,
  ] = useState("");

  const [
    issueDate,
    setIssueDate,
  ] = useState("");

  const [
    message,
    setMessage,
  ] = useState("");

  const [
    error,
    setError,
  ] = useState("");

  useEffect(() => {
    if (
      user?.role !==
        "super_admin" &&
      user?.institutionId
    ) {
      setInstitutionId(
        user.institutionId
      );
    }
  }, [user]);

  const institutions =
    useQuery({
      queryKey: [
        "institutions",
        "credential-issuance",
      ],

      queryFn: async () =>
        (
          await api.get(
            "/institutions",
            {
              params: {
                limit: 100,
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

  const students =
    useQuery({
      queryKey: [
        "students",
        "credential-issuance",
        institutionId,
        studentSearch,
      ],

      queryFn:
        async () =>
          (
            await api.get(
              "/students",
              {
                params: {
                  institutionId:
                    institutionId ||
                    undefined,

                  search:
                    studentSearch ||
                    undefined,

                  page: 1,
                  limit: 50,
                },
              }
            )
          ).data
            .students ||
          [],

      enabled:
        Boolean(
          institutionId
        ),
    });

  const selectedStudent =
    useMemo(
      () =>
        (
          students.data ||
          []
        ).find(
          (
            student:
              JsonRecord
          ) =>
            String(
              student.id
            ) ===
            studentId
        ) as
          | JsonRecord
          | undefined,

      [
        students.data,
        studentId,
      ]
    );

  const issue =
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

         return api.post(
  "/credentials/issue",
  data,
  {
    timeout: 45000,
  }
);
        },

      onSuccess:
        (response) => {
          setError("");

          setMessage(
            response.data
              .message ||
              "Credential issued successfully."
          );

          void queryClient.invalidateQueries(
            {
              queryKey: [
                "credentials",
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
              "Credential issuance failed."
          );
        },
    });

  return (
    <div className="page narrow">
      <span className="eyebrow">
        Credential issuance
      </span>

      <h1>
        Issue credential
      </h1>

      <p className="lead">
        The award date is checked
        against the simulated
        regulator accreditation
        record for the student's
        programme before IPFS or
        blockchain processing
        begins.
      </p>

      <Card>
        <form
          onSubmit={(
            event
          ) => {
            event.preventDefault();

            setMessage("");
            setError("");

            if (
              awardDate >
              issueDate
            ) {
              setError(
                "Award date must not be after issue date."
              );

              return;
            }

            issue.mutate(
              event.currentTarget
            );
          }}
        >
          {user?.role ===
          "super_admin" ? (
            <label>
              Institution

              <select
                required
                name="institutionId"
                value={
                  institutionId
                }
                onChange={(
                  event
                ) => {
                  setInstitutionId(
                    event.target
                      .value
                  );

                  setStudentId(
                    ""
                  );
                }}
              >
                <option value="">
                  Select active
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
                  institutionId
                }
              />

              <p className="notice">
                Institution is fixed
                to your institution.
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
                  event.target
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
              value={
                studentId
              }
              onChange={(
                event
              ) =>
                setStudentId(
                  event.target
                    .value
                )
              }
            >
              <option value="">
                Select student
              </option>

              {(
                students.data ||
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
                      student.full_name ||
                        student.fullName
                    )}{" "}
                    —{" "}
                    {String(
                      student.student_number ||
                        student.studentNumber
                    )}
                  </option>
                )
              )}
            </select>
          </label>

          {selectedStudent && (
            <div className="notice">
              Programme:{" "}
              <strong>
                {String(
                  selectedStudent.programme ||
                    "Not specified"
                )}
              </strong>
            </div>
          )}

          <label>
            Qualification

            <input
              required
              name="qualification"
              type="text"
              minLength={
                2
              }
              maxLength={
                300
              }
            />
          </label>

          <label>
            Award date

            <input
              required
              name="awardDate"
              type="date"
              value={
                awardDate
              }
              max={
                issueDate ||
                undefined
              }
              onChange={(
                event
              ) =>
                setAwardDate(
                  event.target
                    .value
                )
              }
            />
          </label>

          <label>
            Issue date

            <input
              required
              name="issueDate"
              type="date"
              value={
                issueDate
              }
              min={
                awardDate ||
                undefined
              }
              onChange={(
                event
              ) =>
                setIssueDate(
                  event.target
                    .value
                )
              }
            />
          </label>

          <label>
            Certificate PDF

            <input
              required
              name="certificate"
              type="file"
              accept="application/pdf"
            />
          </label>

          <p className="notice">
            Technical blockchain
            authorisation and
            regulator accreditation
            are separate controls.
            Passing one does not
            substitute for the
            other.
          </p>

          <Button
            className="primary"
            disabled={
              issue.isPending
            }
          >
            {issue.isPending
              ? "Processing—wait for confirmation…"
              : "Issue credential"}
          </Button>

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
        </form>
      </Card>
    </div>
  );
}