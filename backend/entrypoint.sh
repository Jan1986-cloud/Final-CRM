#!/bin/sh

# Exit immediately if a command exits with a non-zero status.
set -e

# Start Gunicorn, listening on the port provided by the $PORT environment variable.
# Default to port 8000 if $PORT is not set.
PORT="${PORT:-8000}"
exec gunicorn -b 0.0.0.0:$PORT src.main:app
