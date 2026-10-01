# Deploying NRI Shaadi on one EC2 server (Docker Compose)

Everything runs on a single EC2 instance:

```
Internet ──443──> nginx (host) ──> nrishaadi-api (Docker, 127.0.0.1:3001)
                                         │
                                         └──> nrishaadi-postgres (Docker, volume nrishaadi-pgdata)
```

- **No RDS / Aurora.** Postgres 16 runs as a container, and its data lives in the Docker volume `nrishaadi-pgdata`.
- A single `docker compose up -d` starts Postgres, waits until it's healthy, then starts the API. The API runs all DB migrations automatically on start.
- Postgres is bound to `127.0.0.1:5433` only. The API port is bound to `127.0.0.1:3001` and reached through nginx. Neither is exposed to the internet.

---

## 1. EC2 instance

- Ubuntu 22.04 or 24.04. `t3.small` (2 GB) minimum; `t3.medium` is recommended once you have real users.
- Disk: 30 GB+ gp3 (the database, photo metadata and backups live here; photos themselves are in S3).
- Elastic IP attached.
- Security group inbound rules:

| Port | Source | Why |
|------|--------|-----|
| 22 | your IP | SSH |
| 80, 443 | 0.0.0.0/0 | nginx + HTTPS |

Do **not** open 3000, 3001, 5432 or 5433.

One-time setup (installs Docker, the compose plugin, git, nginx and certbot, and adds 2 GB swap):

```bash
ssh -i your-key.pem ubuntu@YOUR_EC2_IP
sudo bash -c "$(curl -fsSL https://raw.githubusercontent.com/<you>/<repo>/main/backend/deploy/ec2-install-docker.sh)"
# or after cloning: sudo bash backend/deploy/ec2-install-docker.sh
exit   # log back in so the docker group applies
```

---

## 2. First deploy

```bash
git clone <your-repo-url> ~/NRI-Shaadi
cd ~/NRI-Shaadi/backend
cp .env.production.example .env
nano .env
```

Set at least:

| Variable | Value |
|----------|-------|
| `DB_PASSWORD` | Long random string (`openssl rand -hex 24`) |
| `JWT_SECRET` | `openssl rand -hex 48` |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | One-line service account JSON |
| `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` | Play Developer API service account |
| `AWS_*` | S3 bucket + Rekognition credentials |

`DB_USERNAME` and `DB_NAME` default to `nrishaadi`. You don't set `DB_HOST`, because compose points the API at the `postgres` container automatically.

Start everything:

```bash
docker compose up -d --build
docker compose ps           # both should become "healthy"
docker compose logs -f api  # look for "NRI Shaadi API running" and migrations applied
```

Seed test profiles (optional):

```bash
bash scripts/seed-via-docker.sh 40
```

Make yourself admin after signing up in the app:

```bash
docker compose exec postgres psql -U nrishaadi -d nrishaadi \
  -c "UPDATE users SET \"isAdmin\" = true, \"isSuperAdmin\" = true WHERE phone = '+91XXXXXXXXXX';"
```

---

## 3. HTTPS with nginx

1. DNS: create an **A record** for your API domain pointing at the Elastic IP. The app currently calls `https://nri-api.sugarbf.club/api/v1`; see `frontend/src/config/api.config.ts`.
2. nginx + certificate:

```bash
sudo cp ~/NRI-Shaadi/backend/deploy/nginx-api.conf /etc/nginx/sites-available/nrishaadi-api
sudo ln -sf /etc/nginx/sites-available/nrishaadi-api /etc/nginx/sites-enabled/
# Only on a fresh server — if SugarBF is served from "default" on this box, keep it:
# sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d nri-api.sugarbf.club
```

3. Verify:

```bash
curl -I https://nri-api.sugarbf.club/api/v1/privacy
```

> To test by IP before DNS and SSL are ready: set `API_BIND=0.0.0.0` in `.env`, run `docker compose up -d`, temporarily open port 3001 in the security group, and call `http://EC2_IP:3001/api/v1/privacy`. Put it back to `127.0.0.1` afterwards.

---

## 4. Updating

```bash
cd ~/NRI-Shaadi && git pull
cd backend && docker compose up -d --build
```

Only the API image is rebuilt. Postgres keeps running, and new migrations apply automatically when the API restarts.

---

## 5. Backups (important: there is no managed RDS backup any more)

```bash
bash scripts/db-backup.sh                     # -> backend/backups/nrishaadi-<timestamp>.sql.gz
bash scripts/db-restore.sh backups/<file>.sql.gz
```

Schedule a daily backup (keeps 14 days):

```bash
crontab -e
30 2 * * * cd /home/ubuntu/NRI-Shaadi/backend && bash scripts/db-backup.sh >> backups/backup.log 2>&1
```

To also copy backups off the server, set `BACKUP_S3_URI=s3://your-bucket/nrishaadi-db` in `.env`. This needs the AWS CLI on the host and an instance role with `s3:PutObject`. Also consider enabling **EBS snapshots** (Data Lifecycle Manager) for the instance volume.

---

## 6. Accessing the database

On the server:

```bash
docker compose exec postgres psql -U nrishaadi -d nrishaadi
```

From your laptop (pgAdmin, DBeaver, or the npm scripts), open an SSH tunnel first:

```bash
ssh -i your-key.pem -N -L 5433:127.0.0.1:5433 ubuntu@YOUR_EC2_IP
# connect to localhost:5433, user/db nrishaadi, password from server .env
# npm scripts: copy .env.production.local.example -> .env.production.local, then
npm run db:ping:prod
```

---

## 7. Useful commands

| Task | Command |
|------|---------|
| Status | `docker compose ps` |
| API logs | `docker compose logs -f --tail 200 api` |
| Postgres logs | `docker compose logs -f postgres` |
| Restart API | `docker compose restart api` |
| Stop everything (data kept) | `docker compose down` |
| Disk used by DB volume | `docker system df -v \| grep nrishaadi-pgdata` |

⚠️ Never run `docker compose down -v` or `docker volume rm nrishaadi-pgdata` on the server. Either one **deletes the database**.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `Set DB_PASSWORD in backend/.env` | `.env` is missing, or `DB_PASSWORD` is empty |
| API restarting, `password authentication failed` | You changed `DB_PASSWORD` after the first start. Postgres keeps the original password. Revert it, or run `ALTER USER nrishaadi PASSWORD '...'` inside psql |
| Build killed / out of memory | Add swap (the install script does this) or use a larger instance |
| Port 3001 or 5433 already in use | Change `API_HOST_PORT` / `DB_HOST_PORT` in `.env` (and `proxy_pass` in nginx) |
| Phone can't reach API | DNS + HTTPS must work; Android release builds block plain HTTP |
