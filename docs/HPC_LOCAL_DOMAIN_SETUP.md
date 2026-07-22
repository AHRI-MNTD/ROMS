# ROMS Local Network Domain & SSL Configuration Guide

This document provides complete instructions for configuring custom local domain names (e.g., `roms.hpc.local` or `roms.internal`) and internal SSL/TLS certificates for ROMS in an HPC or private local network environment.

---

## 1. Local Network Domain Resolution (DNS)

To allow all workstations on the HPC intranet to access ROMS via `http://roms.hpc.local`, use one of the following methods:

### Method A: HPC Intranet DNS Server (Recommended for All Users)
Ask your HPC Systems Administrator / Network Engineer to add an **A Record** or **CNAME** in the internal DNS server (BIND9, Windows Server AD DNS, Infoblox, or Pi-hole):

| Record Type | Host / Name | Target / IP Address | Description |
|---|---|---|---|
| **A Record** | `roms.hpc.local` | `192.168.X.X` | Points directly to the ROMS Deployment Server IP |
| **CNAME** | `*.roms.hpc.local` | `roms.hpc.local` | Wildcard subdomains for API/Storage if needed |

### Method B: Workstation Hosts File (Quick Local Testing)
For testing on specific machines without changing central network DNS, edit `/etc/hosts` (Linux/macOS) or `C:\Windows\System32\drivers\etc\hosts` (Windows):

```text
# ROMS Local Network Domain Mapping
192.168.X.X  roms.hpc.local
192.168.X.X  api.roms.hpc.local
```
*(Replace `192.168.X.X` with the IP address of the machine running ROMS).*

---

## 2. Internal HTTPS / SSL Certificate Setup

Modern web browsers enforce HTTPS for security features (e.g., clipboard API, web storage, service workers). To enable trusted HTTPS locally without browser warnings:

### Step 1: Install `mkcert` (Zero-Config Certificate Tool)
On the deployment server, install `mkcert` to act as a local Certificate Authority (CA):

```bash
# Ubuntu / Debian
sudo apt update && sudo apt install -y libnss3-tools
curl -JLO "https://dl.filippo.io/mkcert/latest?for=linux/amd64"
chmod +x mkcert-v*-linux-amd64
sudo mv mkcert-v*-linux-amd64 /usr/local/bin/mkcert

# Install local CA root certificate
mkcert -install
```

### Step 2: Generate Trusted Certificates for `roms.hpc.local`
Generate a certificate valid for `roms.hpc.local`, `*.roms.hpc.local`, and your server IP:

```bash
mkdir -p infra/nginx/certs
mkcert -cert-file infra/nginx/certs/roms.hpc.local.crt \
       -key-file infra/nginx/certs/roms.hpc.local.key \
       "roms.hpc.local" "*.roms.hpc.local" "192.168.X.X" "localhost" 127.0.0.1
```

### Step 3: Enable SSL in `infra/nginx/nginx.prod.conf`
Uncomment the HTTPS block in your Nginx Gateway configuration:

```nginx
server {
    listen 443 ssl http2;
    server_name roms.hpc.local;

    ssl_certificate     /etc/nginx/certs/roms.hpc.local.crt;
    ssl_certificate_key /etc/nginx/certs/roms.hpc.local.key;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;

    location / {
        proxy_pass http://roms_web;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }

    location /api/ {
        proxy_pass http://roms_api;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-Proto https;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

### Step 4: Mount Certificate Volume in `docker-compose.prod.yml`
Update the `gateway` service in `docker-compose.prod.yml`:

```yaml
  gateway:
    image: nginx:alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./infra/nginx/nginx.prod.conf:/etc/nginx/nginx.conf:ro
      - ./infra/nginx/certs:/etc/nginx/certs:ro
```

### Step 5: Distribute Root CA to HPC Client Workstations (One-time)
To make client browsers trust the certificate automatically:
- Copy the root CA file generated at `~/.local/share/mkcert/rootCA.pem` onto client machines or import it into the HPC Active Directory / Group Policy objects.

---

## 3. Summary of Network Ports

| Service | Internal Port | Gateway Route / Published Port | Description |
|---|---|---|---|
| Web Frontend | `80` | `http://roms.hpc.local/` | React Single Page Application |
| API Server | `4000` | `http://roms.hpc.local/api/` | Express REST & GraphQL Backend |
| MinIO Storage | `9000` | `http://roms.hpc.local/storage/` | Document & Blob Storage |
| MinIO Console | `9002` | `http://roms.hpc.local:9002` | Admin Storage Console |
| MQTT Broker | `1883` | `http://roms.hpc.local:1883` | IoT / Lab Instrument Stream |
