#!/bin/sh
set -e

echo "--- DIAGNOSTIC: Starting Nginx directly ---"
# Execute the main container command (nginx)
exec nginx -g 'daemon off;'
