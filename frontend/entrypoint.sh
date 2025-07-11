#!/bin/sh
set -e

echo "--- DIAGNOSTIC: Bypassing problematic BACKEND_URL ---"

# Define the correct backend URL, ignoring the one from the environment
export FIXED_URL="https://final-crm-back-production.up.railway.app"
echo "DIAGNOSTIC: Using hardcoded URL: '$FIXED_URL'"

# Substitute the hardcoded URL into the nginx configuration template
# Note: We are substituting FIXED_URL, not BACKEND_URL
envsubst '$FIXED_URL' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf

echo "--- DIAGNOSTIC: Starting Nginx ---"
# Execute the main container command (nginx)
exec nginx -g 'daemon off;'