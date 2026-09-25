# Deploying

The API runs anywhere that can run the Docker image and reach Postgres. Two ready configs:
**Render** (free tier, simplest) and **Fly.io** (small monthly cost, faster cold starts).
Both use **Neon** for Postgres.

Each deploy runs `node dist/release.js` first, which applies migrations and, when
`SEED_DEMO=true`, loads demo accounts (password `demo-password`):

| Email                   | Role    |
| ----------------------- | ------- |
| demo-admin@clinic.dev   | admin   |
| demo-doctor@clinic.dev  | doctor  |
| demo-patient@clinic.dev | patient |

## 1. Create the database on Neon

1. Sign up at [neon.tech](https://neon.tech) and create a project (pick the region closest
   to your API host, e.g. AWS Europe for Render Frankfurt or Fly `lhr`).
2. Copy the **pooled** connection string. It looks like
   `postgres://user:pass@ep-xxx-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require`.

The `btree_gist` extension used by the double-booking constraint is available on Neon.

## 2a. Deploy on Render

1. Push to GitHub, then in Render choose **New > Blueprint** and pick this repo.
   Render reads `render.yaml`.
2. When asked, set `DATABASE_URL` to the Neon string. `JWT_SECRET` is generated for you.
3. Deploy. The API is at `https://clinic-api-xxxx.onrender.com`, docs at `/docs`.

Free Render services sleep after 15 minutes idle, so the first request after that takes
about a minute.

## 2b. Deploy on Fly.io

```bash
brew install flyctl            # or: curl -L https://fly.io/install.sh | sh
fly auth login
fly apps create clinic-api-andreyhuey     # must match `app` in fly.toml
fly secrets set DATABASE_URL='postgres://...neon...' JWT_SECRET="$(openssl rand -base64 48)"
fly deploy
```

To deploy automatically when `master` changes, create a token with
`fly tokens create deploy` and add it to the GitHub repo as the `FLY_API_TOKEN` secret.
`.github/workflows/deploy.yml` then deploys after CI passes on `master`.

## Environment variables

| Name                                                 | Required | Notes                                                     |
| ---------------------------------------------------- | -------- | --------------------------------------------------------- |
| `DATABASE_URL`                                       | yes      | Neon connection string                                    |
| `JWT_SECRET`                                         | yes      | 32+ random characters                                     |
| `CORS_ORIGINS`                                       | no       | Comma-separated front-end origins allowed to call the API |
| `SEED_DEMO`                                          | no       | `true` loads demo data on deploy                          |
| `ACCESS_TOKEN_TTL_MINUTES`, `REFRESH_TOKEN_TTL_DAYS` | no       | Default 15 and 30                                         |
