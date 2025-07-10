#!/bin/sh
set -e

echo "--- DIAGNOSTIC: EXECUTING ENTRYPOINT SCRIPT (v2) ---"
echo "DIAGNOSTIC: Value of PORT variable from environment is: '$PORT'"

# Default to port 8000 if $PORT is not set or empty
PORT="${PORT:-8000}"
echo "DIAGNOSTIC: Gunicorn will attempt to listen on port: '$PORT'"

# Start Gunicorn
exec gunicorn -b 0.0.0.0:$PORT src.main:app
