#!/bin/sh

# Exit immediately if a command exits with a non-zero status.
set -e

# Substitute environment variables in the nginx configuration template
envsubst '$BACKEND_URL' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf

# Execute the main container command (nginx)
exec nginx -g 'daemon off;'
