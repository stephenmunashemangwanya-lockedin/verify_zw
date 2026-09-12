# Student account ownership

Student accounts are provisioned through the existing user-management flow with role `student` and an active institution. An authorised `super_admin` or same-institution `institution_admin` then links the account to the student record:

```http
POST /api/students/{studentId}/account
Content-Type: application/json

{"userId":"<student-user-uuid>"}
```

The server ignores client-supplied institution ownership and requires the target account to be an active `student` in the same active institution. Migration 007's unique partial index enforces one student record per account; the conditional update also rejects a student already linked to another account. Successful links emit `STUDENT_ACCOUNT_LINKED` with the actor, student, institution, and linked account identifiers.

Student credential access resolves the student record from the authenticated account. Client-supplied student identifiers are not accepted as an ownership source. `GET /api/credentials/me` therefore returns only credentials for the linked student, while direct credential reads enforce the same relationship.