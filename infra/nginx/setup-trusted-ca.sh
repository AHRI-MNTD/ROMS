#!/usr/bin/env bash
set -e

# ==============================================================================
# ROMS Internal Root Certificate Authority & Trusted TLS Generator
# ==============================================================================
# Creates an organizational Root Certificate Authority (CA) and signs a server
# certificate with Subject Alternative Names (SAN) for the ROMS host IP/domain.
# Once clients install `roms-root-ca.crt` into their operating system or browser,
# all connections to https://<PROD_IP> or https://<PROD_DOMAIN> are trusted with
# zero security warnings.
# ==============================================================================

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CERTS_DIR="$DIR/certs"
mkdir -p "$CERTS_DIR"

PROD_IP="${1:-192.168.70.50}"
PROD_DOMAIN="${2:-roms.internal}"

echo "======================================================================"
echo "🛡️  Setting up ROMS Organization Root CA & Server Certificate"
echo "======================================================================"
echo "Host IP:     $PROD_IP"
echo "Domain:      $PROD_DOMAIN"
echo "Cert Dir:    $CERTS_DIR"
echo "======================================================================"

# 1. Generate Root CA Key and Certificate (valid for 10 years)
if [ ! -f "$CERTS_DIR/roms-root-ca.key" ] || [ ! -f "$CERTS_DIR/roms-root-ca.crt" ]; then
  echo "==> Step 1: Generating Organization Root CA..."
  openssl genrsa -out "$CERTS_DIR/roms-root-ca.key" 4096
  
  openssl req -x509 -new -nodes \
    -key "$CERTS_DIR/roms-root-ca.key" \
    -sha256 -days 3650 \
    -out "$CERTS_DIR/roms-root-ca.crt" \
    -subj "/C=ET/ST=Addis Ababa/L=Addis Ababa/O=ROMS Health Research/OU=IT Infrastructure/CN=ROMS Organizational Root CA"
    
  chmod 600 "$CERTS_DIR/roms-root-ca.key"
  chmod 644 "$CERTS_DIR/roms-root-ca.crt"
  echo "✅ Root CA generated: $CERTS_DIR/roms-root-ca.crt"
else
  echo "ℹ️  Existing Root CA found, reusing: $CERTS_DIR/roms-root-ca.crt"
fi

# 2. Generate Server Private Key & CSR
echo "==> Step 2: Generating Server Private Key and CSR..."
openssl genrsa -out "$CERTS_DIR/privkey.pem" 2048
chmod 600 "$CERTS_DIR/privkey.pem"

cat <<EOF > "$CERTS_DIR/server.ext"
authorityKeyIdentifier=keyid,issuer
basicConstraints=CA:FALSE
keyUsage = digitalSignature, nonRepudiation, keyEncipherment, dataEncipherment
subjectAltName = @alt_names

[alt_names]
IP.1 = $PROD_IP
IP.2 = 127.0.0.1
DNS.1 = localhost
DNS.2 = $PROD_DOMAIN
DNS.3 = *.roms.internal
EOF

openssl req -new \
  -key "$CERTS_DIR/privkey.pem" \
  -out "$CERTS_DIR/server.csr" \
  -subj "/C=ET/ST=Addis Ababa/L=Addis Ababa/O=ROMS/OU=Operations/CN=$PROD_IP"

# 3. Sign Server Certificate with Organization Root CA (valid for 825 days)
echo "==> Step 3: Signing Server Certificate with Organization Root CA..."
openssl x509 -req \
  -in "$CERTS_DIR/server.csr" \
  -CA "$CERTS_DIR/roms-root-ca.crt" \
  -CAkey "$CERTS_DIR/roms-root-ca.key" \
  -CAcreateserial \
  -out "$CERTS_DIR/cert.pem" \
  -days 825 \
  -sha256 \
  -extfile "$CERTS_DIR/server.ext"

# 4. Construct fullchain.pem (Server certificate + CA certificate)
cat "$CERTS_DIR/cert.pem" "$CERTS_DIR/roms-root-ca.crt" > "$CERTS_DIR/fullchain.pem"
chmod 644 "$CERTS_DIR/fullchain.pem"

# Clean temporary files
rm -f "$CERTS_DIR/server.csr" "$CERTS_DIR/server.ext" "$CERTS_DIR/cert.pem"

echo "======================================================================"
echo "✅ Certificate generation complete!"
echo "Server Certificate Chain: $CERTS_DIR/fullchain.pem"
echo "Server Private Key:       $CERTS_DIR/privkey.pem"
echo "Public Root CA to Trust:  $CERTS_DIR/roms-root-ca.crt"
echo "======================================================================"
echo "To trust this certificate on client machines, distribute $CERTS_DIR/roms-root-ca.crt"
echo "and run: sudo ./infra/nginx/install-root-ca.sh"
echo "======================================================================"
