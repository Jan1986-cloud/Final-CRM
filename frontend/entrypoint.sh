#!/bin/sh
set -e

echo "--- DIAGNOSTIC: EXECUTING FRONTEND ENTRYPOINT ---"
echo "DIAGNOSTIC: Initial value of BACKEND_URL is: '$BACKEND_URL'"

# Remove trailing semicolon from BACKEND_URL if it exists
export BACKEND_URL=$(echo $BACKEND_URL | sed 's/;$//')

echo "DIAGNOSTIC: Corrected value of BACKEND_URL is: '$BACKEND_URL'"

# Substitute environment variables in the nginx configuration template
envsubst '$BACKEND_URL' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf

echo "--- DIAGNOSTIC: Starting Nginx ---"
# Execute the main container command (nginx)
exec nginx -g 'daemon off;'