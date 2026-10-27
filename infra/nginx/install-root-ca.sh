#!/usr/bin/env bash
set -e

# ==============================================================================
# ROMS Client Root CA Installer
# ==============================================================================
# Installs `roms-root-ca.crt` into the system trust store of client workstations
# so browsers, curl, and native apps trust the ROMS server certificate with zero
# warnings.
# ==============================================================================

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CA_FILE="${1:-$DIR/certs/roms-root-ca.crt}"

if [ ! -f "$CA_FILE" ]; then
  echo "❌ Error: Root CA certificate not found at $CA_FILE"
  echo "Please generate it first with: ./infra/nginx/setup-trusted-ca.sh"
  exit 1
fi

echo "======================================================================"
echo "🛡️  Installing ROMS Root CA into System Trust Store"
echo "CA File: $CA_FILE"
echo "======================================================================"

# Linux: Debian / Ubuntu
if [ -d "/usr/local/share/ca-certificates" ]; then
  echo "==> Detected Debian/Ubuntu environment..."
  sudo cp "$CA_FILE" /usr/local/share/ca-certificates/roms-root-ca.crt
  sudo update-ca-certificates
  echo "✅ Installed into Debian/Ubuntu trust store."

# Linux: RHEL / CentOS / Rocky / Fedora
elif [ -d "/etc/pki/ca-trust/source/anchors" ]; then
  echo "==> Detected RHEL/CentOS environment..."
  sudo cp "$CA_FILE" /etc/pki/ca-trust/source/anchors/roms-root-ca.crt
  sudo update-ca-trust extract
  echo "✅ Installed into RHEL/CentOS trust store."

# macOS
elif [[ "$OSTYPE" == "darwin"* ]]; then
  echo "==> Detected macOS environment..."
  sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain "$CA_FILE"
  echo "✅ Installed into macOS System Keychain."

else
  echo "⚠️  Unsupported automatic OS detection."
  echo "Manual installation instructions:"
  echo "- Windows: Double click $CA_FILE -> Install Certificate -> Local Machine -> 'Trusted Root Certification Authorities'."
  echo "- Chrome/Edge: Settings -> Security -> Manage Certificates -> Authorities -> Import $CA_FILE."
  echo "- Firefox: Settings -> Privacy & Security -> View Certificates -> Authorities -> Import $CA_FILE."
  exit 0
fi

echo "======================================================================"
echo "🎉 Root CA successfully trusted! Browsers will now display a green padlock"
echo "without any security warnings."
echo "======================================================================"
