#!/bin/bash
set -e

cd /root/file_sharing_service

# Run docker compose down, ignore errors if not running
docker-compose down || true
