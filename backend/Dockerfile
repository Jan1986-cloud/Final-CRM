# Use a stable, full-featured base image
FROM python:3.11-bullseye

# Set the Python path to include the app root, making imports predictable
ENV PYTHONPATH /app

# Set the working directory
WORKDIR /app

# Install system dependencies required for building Python packages
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy and install Python requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the entire application source code
COPY . .

# Ensure the entrypoint (now managed by CMD) would have been executable
# This is kept for good practice in case an entrypoint is re-introduced
RUN chmod +x /app/entrypoint.sh

# CMD instruction to start the application with maximum logging and an explicit app definition
CMD ["gunicorn", "--bind", "0.0.0.0:8080", "--workers", "1", "--log-level", "debug", "--wsgi-app", "src.main:app"]
