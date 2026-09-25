#!/usr/bin/env bash
# One-time bootstrap for a fresh Ubuntu 24.04 droplet/EC2 instance.
# Run once, by hand, as root over SSH — read it before running it; it
# changes SSH and firewall config on purpose. Not part of the CI/CD pipeline
# and not re-run on every deploy (that's infra/deploy.sh).
set -euo pipefail

DEPLOY_USER="deploy"
REPO_URL="git@github.com:induwara-amaranga/project-english-bridge.git"
APP_DIR="/opt/englisher"

echo "==> System packages"
apt-get update -y
apt-get upgrade -y
apt-get install -y ufw fail2ban unattended-upgrades curl git

echo "==> Unattended security upgrades"
dpkg-reconfigure -f noninteractive unattended-upgrades

echo "==> Firewall: SSH + HTTP + HTTPS only"
ufw default deny incoming
ufw default allow outgoing
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo "==> fail2ban for SSH brute-force protection"
systemctl enable --now fail2ban

echo "==> Docker Engine + Compose plugin"
curl -fsSL https://get.docker.com | sh

echo "==> Deploy user (no password login, docker group, SSH key only)"
if ! id "$DEPLOY_USER" &>/dev/null; then
  adduser --disabled-password --gecos "" "$DEPLOY_USER"
  usermod -aG docker "$DEPLOY_USER"
  mkdir -p "/home/$DEPLOY_USER/.ssh"
  echo "Paste the PUBLIC half of the deploy SSH key into /home/$DEPLOY_USER/.ssh/authorized_keys, then:"
  echo "  chmod 700 /home/$DEPLOY_USER/.ssh && chmod 600 /home/$DEPLOY_USER/.ssh/authorized_keys"
  echo "  chown -R $DEPLOY_USER:$DEPLOY_USER /home/$DEPLOY_USER/.ssh"
fi

mkdir -p "$APP_DIR"
chown "$DEPLOY_USER:$DEPLOY_USER" "$APP_DIR"

cat <<'EOF'

==> Manual steps left (deliberately not scripted):

1. Harden sshd_config: PasswordAuthentication no, PermitRootLogin no,
   then `systemctl restart sshd` — from a SECOND open session, so you don't
   lock yourself out if something's wrong.
2. As the deploy user:
     git clone REPO_URL /opt/englisher
     cd /opt/englisher/server && cp .env.example .env
   then fill in every "(required in prod)" value in .env — see
   server/.env.example for what each one is and how to generate it
   (ENGLISHER_JWT_SECRET: openssl rand -base64 32), plus DOMAIN=yourdomain.
3. Point the domain's DNS A record at this server's public IP.
4. First boot: `bash /opt/englisher/infra/deploy.sh` — Caddy requests its
   Let's Encrypt certificate the first time it starts, which needs DNS from
   step 3 already resolving and ports 80/443 reachable.
5. Add DEPLOY_HOST / DEPLOY_USER / DEPLOY_SSH_KEY (the deploy user's
   PRIVATE key) as GitHub Actions secrets so deploy.yml can SSH in on
   every future push to main.
EOF
