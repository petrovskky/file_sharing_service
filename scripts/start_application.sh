#!/bin/bash
set -e

snap install aws-cli --classic
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 062852075065.dkr.ecr.us-east-1.amazonaws.com

cd /root/file_sharing_service

docker-compose up -d

# Get the container ID for the 'nginx' service
NGINX_CONTAINER_ID=$(docker-compose ps -q nginx)

# If the container is running, reload nginx inside it
if [ -n "$NGINX_CONTAINER_ID" ]; then
    docker exec "$NGINX_CONTAINER_ID" nginx -s reload || true
fi
