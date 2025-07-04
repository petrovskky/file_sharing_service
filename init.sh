#!/bin/sh
set -e

# Install openssl if not already installed
if ! command -v openssl > /dev/null; then
    echo "Installing openssl..."
    apk update && apk add --no-cache openssl
fi

CERT_PATH="/etc/letsencrypt/live/$DOMAIN/fullchain.pem"
KEY_PATH="/etc/letsencrypt/live/$DOMAIN/privkey.pem"

if [ ! -f "$CERT_PATH" ] || [ ! -f "$KEY_PATH" ]; then
    echo "Generating dummy certificate for $DOMAIN..."
    mkdir -p "/etc/letsencrypt/live/$DOMAIN"
    openssl req -x509 -nodes -newkey rsa:2048 \
        -days 1 \
        -keyout "$KEY_PATH" \
        -out "$CERT_PATH" \
        -subj "/CN=$DOMAIN"
fi

exec nginx -g 'daemon off;'