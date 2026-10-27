#!/usr/bin/env bash
set -e

# Directory where certs are stored
CERT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/certs" && pwd)"
mkdir -p "$CERT_DIR"

PROD_IP="${1:-192.168.70.50}"
PROD_DOMAIN="${2:-roms.internal}"

echo "Generating SSL certificate with SAN for IP: $PROD_IP and Domain: $PROD_DOMAIN..."

cat <<EOF > "$CERT_DIR/openssl.cnf"
[req]
default_bits       = 2048
default_md         = sha256
distinguished_name = req_distinguished_name
req_extensions     = req_ext
prompt             = no

[req_distinguished_name]
C  = ET
ST = Addis Ababa
L  = Addis Ababa
O  = ROMS
OU = Research Operations
CN = $PROD_IP

[req_ext]
subjectAltName = @alt_names

[alt_names]
IP.1  = $PROD_IP
IP.2  = 127.0.0.1
DNS.1 = localhost
DNS.2 = $PROD_DOMAIN
EOF

openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout "$CERT_DIR/privkey.pem" \
  -out "$CERT_DIR/fullchain.pem" \
  -config "$CERT_DIR/openssl.cnf" \
  -extensions req_ext

chmod 600 "$CERT_DIR/privkey.pem"
chmod 644 "$CERT_DIR/fullchain.pem"
rm -f "$CERT_DIR/openssl.cnf"

echo "✅ SSL certificate generated successfully in $CERT_DIR"
echo "Subject Alternative Names (SAN): IP:$PROD_IP, DNS:localhost, DNS:$PROD_DOMAIN"

