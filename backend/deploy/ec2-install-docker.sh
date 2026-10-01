#!/bin/bash
# One-time setup on a fresh Ubuntu 22.04/24.04 EC2 instance:
#   curl -fsSL https://raw.githubusercontent.com/<you>/<repo>/main/backend/deploy/ec2-install-docker.sh | sudo bash
#   (or copy the file over and run: sudo bash deploy/ec2-install-docker.sh)
set -euo pipefail

echo "==> Installing Docker + Compose plugin, git, nginx, certbot..."
apt-get update -qq
apt-get install -y ca-certificates curl gnupg git nginx certbot python3-certbot-nginx
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor --yes -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" > /etc/apt/sources.list.d/docker.list
apt-get update -qq
apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
systemctl enable --now docker

TARGET_USER="${SUDO_USER:-ubuntu}"
usermod -aG docker "$TARGET_USER" || true

# Small instances run out of RAM while building the API image — add 2 GB swap if none.
if ! swapon --show | grep -q .; then
  echo "==> Adding 2G swap"
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

echo ""
echo "==> Done. Log out and back in (docker group), then:"
echo "    git clone <repo> ~/NRI-Shaadi && cd ~/NRI-Shaadi/backend"
echo "    cp .env.production.example .env && nano .env"
echo "    docker compose up -d --build"
echo ""
echo "Security group: open 22 (your IP), 80 and 443. Do NOT open 5432/5433 or 3000."
