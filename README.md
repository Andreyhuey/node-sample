# Clinic API

A REST API for a small clinic: patients, doctors, appointment booking and prescriptions.
Built with TypeScript, Express 5, PostgreSQL and Drizzle ORM.

## Run it locally

```bash
cp .env.example .env
docker compose up -d        # starts Postgres on localhost:5432
npm install
npm run db:migrate          # applies the SQL files in drizzle/
npm run db:seed-admin       # creates the admin from ADMIN_EMAIL / ADMIN_PASSWORD
npm run dev                 # http://localhost:3001
```

## Tests

```bash
createdb clinic_test        # once (or: docker compose exec db createdb -U postgres clinic_test)
npm test
```

Tests are integration tests: they send real HTTP requests to the app with Supertest and
hit a real Postgres database (`TEST_DATABASE_URL`, default `clinic_test`), which is
migrated before the run and emptied before every test.

## Authentication

| Role      | Can                                                                            |
| --------- | ------------------------------------------------------------------------------ |
| `admin`   | Everything, including creating doctors and giving them logins                  |
| `doctor`  | See patients, see and update their own appointments, prescribe for them        |
| `patient` | Sign up, see and edit their own record, book and cancel their own appointments |

- `POST /auth/register` (patients) and `POST /auth/login` return `{ accessToken, user }`.
  Send the token as `Authorization: Bearer <accessToken>`. It expires after 15 minutes.
- A refresh token is set as an `httpOnly`, `SameSite=Strict` cookie scoped to `/auth`.
  `POST /auth/refresh` swaps it for a new access token and a new refresh token.
  Each refresh token works once; replaying a used one ends all of that user's sessions.
- `POST /auth/logout` revokes the refresh token. `GET /auth/me` returns the caller.
- Passwords are hashed with Argon2id. Login and register are rate-limited per IP.

## Endpoints

| Method             | Path                              | Notes                                                   |
| ------------------ | --------------------------------- | ------------------------------------------------------- |
| GET                | `/health`                         | Liveness check                                          |
| GET, POST          | `/patients`                       |                                                         |
| GET, PATCH, DELETE | `/patients/:id`                   | Delete is refused (409) if the patient has appointments |
| GET                | `/patients/:id/prescriptions`     | All prescriptions across the patient's visits           |
| GET, POST          | `/doctors`                        |                                                         |
| GET, PATCH         | `/doctors/:id`                    |                                                         |
| GET, POST          | `/appointments`                   | Filter with `?doctorId=` and `?patientId=`              |
| GET                | `/appointments/:id`               |                                                         |
| PATCH              | `/appointments/:id/status`        | `scheduled` → `completed`, `cancelled` or `no_show`     |
| GET, POST          | `/appointments/:id/prescriptions` | Only for completed appointments                         |

## Pagination

List endpoints (`/patients`, `/doctors`, `/appointments`) return one page at a time:

```json
{ "data": [...], "nextCursor": "eyJ2YWx1ZSI6..." }
```

Pass `?limit=` (1 to 100, default 20) and, for the next page, `?cursor=<nextCursor>`.
`nextCursor` is `null` on the last page. This is keyset pagination, so pages stay fast
and don't skip or repeat rows when data changes between requests.

## Rules the API enforces

- Appointments must be in the future and end after they start.
- A doctor can't be double-booked. The service checks first, and a Postgres exclusion
  constraint guarantees it even when two requests arrive at once.
- Only a scheduled appointment can change status. Completed, cancelled and no-show are final.
- Errors always look like `{ "error": { "code", "message", "details"? } }`.

## Changing the database

Edit `src/db/schema.ts`, run `npm run db:generate` to create a new migration in `drizzle/`,
review the SQL, then `npm run db:migrate`. Commit the migration with the code change.
