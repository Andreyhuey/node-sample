# Clinic API

A REST API for a small clinic: patients, doctors, appointment booking and prescriptions.
Built with TypeScript, Express 5, PostgreSQL and Drizzle ORM.

## Run it locally

```bash
cp .env.example .env
docker compose up -d        # starts Postgres on localhost:5432
npm install
npm run db:migrate          # applies the SQL files in drizzle/
npm run dev                 # http://localhost:3001
```

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
