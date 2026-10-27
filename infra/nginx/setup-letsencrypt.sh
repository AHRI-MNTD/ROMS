#!/usr/bin/env bash
set -e

# ==============================================================================
# ROMS Let's Encrypt (ACME) Automated Production Certificate Tool
# ==============================================================================
# Use this when ROMS is deployed with a publicly resolvable domain name.
# It uses certbot to perform the HTTP-01 challenge against Nginx's
# `/.well-known/acme-challenge/` path and saves certificates to `infra/nginx/certs/`.
# ==============================================================================

DOMAIN="${1}"
EMAIL="${2}"

if [ -z "$DOMAIN" ] || [ -z "$EMAIL" ]; then
  echo "Usage: $0 <DOMAIN> <EMAIL>"
  echo "Example: $0 roms.example.com admin@example.com"
  exit 1
fi

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CERTS_DIR="$DIR/certs"
mkdir -p "$CERTS_DIR" /var/www/certbot

echo "======================================================================"
echo "🌐 Requesting Let's Encrypt Certificate for $DOMAIN..."
echo "======================================================================"

# Run Certbot via docker or system certbot
if command -v certbot &> /dev/null; then
  certbot certonly --webroot -w /var/www/certbot \
    -d "$DOMAIN" \
    --email "$EMAIL" \
    --agree-tos \
    --no-eff-email \
    --non-interactive
  
  cp "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" "$CERTS_DIR/fullchain.pem"
  cp "/etc/letsencrypt/live/$DOMAIN/privkey.pem" "$CERTS_DIR/privkey.pem"
else
  echo "Using docker certbot/certbot container..."
  docker run -it --rm --name certbot \
    -v "/var/www/certbot:/var/www/certbot" \
    -v "/etc/letsencrypt:/etc/letsencrypt" \
    certbot/certbot certonly --webroot -w /var/www/certbot \
    -d "$DOMAIN" \
    --email "$EMAIL" \
    --agree-tos \
    --no-eff-email \
    --non-interactive

  sudo cp "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" "$CERTS_DIR/fullchain.pem"
  sudo cp "/etc/letsencrypt/live/$DOMAIN/privkey.pem" "$CERTS_DIR/privkey.pem"
fi

echo "======================================================================"
echo "✅ Let's Encrypt certificate obtained and mounted into $CERTS_DIR"
echo "Reloading Nginx gateway..."
docker exec roms-gateway-1 nginx -s reload || true
echo "======================================================================"
