#!/bin/sh
set -e

# Use envsubst to replace ${PORT} in the config file with the value of the PORT env var.
# The output is piped to a new file that Nginx will use.
envsubst '${PORT}' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf

# Start Nginx in the foreground
exec nginx -g 'daemon off;'