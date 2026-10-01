# Backend scripts

Scripts read database settings from env files in `backend/`. Inside the Docker API container they use the injected environment instead.

| File | Use |
|------|-----|
| `.env` | Local Postgres (default), or the server `.env` used by Docker Compose |
| `.env.production.local` | **Your laptop → server Postgres over an SSH tunnel** (copy from `.env.production.local.example`) |

Set `ENV_FILE` to pick another file:

```bash
# Windows PowerShell
$env:ENV_FILE = ".env.production.local"

# macOS / Linux
export ENV_FILE=.env.production.local
```

---

## 1. Seed NRI test profiles

On the server (recommended):

```bash
cd ~/NRI-Shaadi/backend
bash scripts/seed-via-docker.sh 40
```

Locally:

```bash
cd backend
node scripts/seed-test-users.js 40
```

This creates complete matrimony profiles (`profileStage=2`, photo, partner preferences, 30-day trial). The profiles are brides and grooms living in the US, Canada, UK, UAE, Australia, Singapore and other countries.

---

## 2. Database backups

```bash
bash scripts/db-backup.sh                          # backups/nrishaadi-<timestamp>.sql.gz, keeps 14 days
bash scripts/db-restore.sh backups/<file>.sql.gz   # overwrites the DB (asks for confirmation)
```

See `deploy/README.md` for the daily cron job and the optional S3 copy.

---

## 3. Laptop → server DB (SSH tunnel)

The server's Postgres listens only on `127.0.0.1:5433` on the EC2 box.

```bash
ssh -i your-key.pem -N -L 5433:127.0.0.1:5433 ubuntu@YOUR_EC2_IP
```

In another terminal, with `.env.production.local` pointing at `127.0.0.1:5433`:

```bash
npm run db:ping:prod
npm run migration:run:prod        # normally not needed; the API migrates on start
```

---

## Safety

- Scripts refuse to write to a production DB (`NODE_ENV=production` or an RDS host) unless you pass `--confirm-prod`.
- Never commit `.env`, `.env.production.local` or `backups/`.
- Seeded users have **no phone/login**. They appear in Matches only and cannot sign in until linked to Firebase auth.
