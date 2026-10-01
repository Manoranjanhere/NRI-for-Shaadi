#!/usr/bin/env node
/**
 * Prints instructions — the server Postgres only listens on the EC2 box's loopback.
 */
console.log(`
The production Postgres runs in Docker on the EC2 server and is not exposed publicly.

Option A — seed ON the server:
  ssh -i "C:\\path\\to\\your-key.pem" ubuntu@YOUR_EC2_IP
  cd ~/NRI-Shaadi/backend
  bash scripts/seed-via-docker.sh 40

Option B — from your laptop through an SSH tunnel:
  ssh -i your-key.pem -N -L 5433:127.0.0.1:5433 ubuntu@YOUR_EC2_IP
  # in another terminal (backend/.env.production.local points at 127.0.0.1:5433)
  npm run seed:test-users:prod -- --confirm-prod 40
`);
