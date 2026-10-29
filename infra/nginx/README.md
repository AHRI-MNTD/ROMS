# ROMS Production TLS & Certificate Infrastructure

ROMS requires encrypted HTTPS across all client-server communications with strict HSTS headers (`Strict-Transport-Security`). Plain HTTP traffic to port 80 is automatically redirected via 301 to HTTPS on port 443.

Depending on your network topology, choose one of the three supported deployment models:

---

## Option 1: Public Domain Name (Let's Encrypt / Certbot)
If ROMS is accessible via a publicly resolvable domain name (e.g., `roms.health.gov.et`):
1. Point your DNS A record to your server's public IP.
2. Run the automated Let's Encrypt tool:
   ```bash
   ./infra/nginx/setup-letsencrypt.sh roms.health.gov.et admin@health.gov.et
   ```
3. Nginx serves the ACME challenge via `/.well-known/acme-challenge/` and reloads with the globally trusted CA certificates.

---

## Option 2: Internal Intranet / Private IP Deployment (`192.168.70.50`)
Since public certificate authorities (like Let's Encrypt) do not issue certificates for RFC 1918 private IP addresses (such as `192.168.x.x`), an **Internal Organization Root CA** is standard practice:

1. **Generate the Organization Root CA and Server Certificate:**
   ```bash
   ./infra/nginx/setup-trusted-ca.sh 192.168.70.50 roms.internal
   ```
   This generates:
   - `infra/nginx/certs/roms-root-ca.crt` (Root CA Certificate)
   - `infra/nginx/certs/roms-root-ca.key` (Root CA Private Key - keep secure)
   - `infra/nginx/certs/fullchain.pem` (Server Certificate signed by Root CA)
   - `infra/nginx/certs/privkey.pem` (Server Private Key)

2. **Distribute and Trust the Root CA on Client Devices:**
   - **Linux / Ubuntu / Debian:**
     ```bash
     sudo ./infra/nginx/install-root-ca.sh
     ```
   - **Windows:**
     Double-click `roms-root-ca.crt` -> *Install Certificate* -> *Local Machine* -> Place in *Trusted Root Certification Authorities*. (Can be deployed across the organization via Active Directory GPO).
   - **macOS:**
     Double-click `roms-root-ca.crt` in Keychain Access -> Select *System* -> Set *Trust* to *Always Trust*.
   - **Browser-specific stores (Chrome / Edge / Firefox):**
     Import `roms-root-ca.crt` under *Settings > Privacy and Security > Security > Manage Certificates > Authorities*.

Once installed, all browsers trust the connection with a green padlock.

---

## Option 3: Existing Enterprise PKI / Custom Commercial Certificate
If your organization already holds commercial certificates (DigiCert, Sectigo, etc.) or an enterprise CA:
1. Place your certificate chain in `infra/nginx/certs/fullchain.pem`.
2. Place your private key in `infra/nginx/certs/privkey.pem`.
3. Or override their paths in your `.env`:
   ```bash
   SSL_CERT_PATH=/etc/ssl/my-org/fullchain.pem
   SSL_KEY_PATH=/etc/ssl/my-org/privkey.pem
   ```
4. Restart or reload Nginx:
   ```bash
   docker exec roms-gateway-1 nginx -s reload
   ```

