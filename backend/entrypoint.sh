#!/bin/sh
set -e

# Start Gunicorn with the correct application module
exec gunicorn --bind 0.0.0.0:$PORT --workers 1 --threads 8 --timeout 0 "src.main:create_app()"
