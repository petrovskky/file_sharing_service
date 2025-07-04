DOMAIN=${DOMAIN:-yourdomain.com}
CERT_PATH="/etc/letsencrypt/live/$DOMAIN/fullchain.pem"
EMAIL=${EMAIL:-your@email.com}

echo "Starting Certbot initialization for domain: $DOMAIN"

# Check for and remove dummy certificates
if [ -f "$CERT_PATH" ]; then
    echo "Certificate exists, checking if it's a dummy..."

    # Check if it's a self-signed (dummy) certificate
    if openssl x509 -in "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" -noout -issuer | grep -q "CN=$DOMAIN"; then
        echo "Found dummy certificate, removing..."
        rm -rf "/etc/letsencrypt/live/$DOMAIN"
        rm -rf "/etc/letsencrypt/archive/$DOMAIN"
        rm -f "/etc/letsencrypt/renewal/$DOMAIN.conf"

        # Obtain real certificates
        echo "Attempting to obtain real certificates..."
        certbot certonly --webroot -w /var/www/certbot \
            --email "$EMAIL" --agree-tos --no-eff-email \
            -d "$DOMAIN" \
            --force-renewal

        echo "Certificate process completed!"
        echo "Remember to reload Nginx manually with: docker-compose exec nginx nginx -s reload"

    else
        echo "Found legitimate certificate, keeping it."
    fi
else
    echo "No existing certificate found."

    # Obtain real certificates
    echo "Attempting to obtain real certificates..."
    certbot certonly --webroot -w /var/www/certbot \
        --email "$EMAIL" --agree-tos --no-eff-email \
        -d "$DOMAIN" \
        --force-renewal

    echo "Certificate process completed!"
    echo "Remember to reload Nginx manually with: docker-compose exec nginx nginx -s reload"
fi

# Keep container running
echo "Sleeping to keep container alive (for demo purposes)..."
sleep 3600