#!/bin/sh
set -e

echo "--- EXECUTING ENTRYPOINT SCRIPT ---"
echo "Value of PORT variable from environment: '$PORT'"

# Default to port 8000 if $PORT is not set or empty
PORT="${PORT:-8000}"
echo "Gunicorn will listen on port: '$PORT'"

exec gunicorn -b 0.0.0.0:$PORT src.main:app
