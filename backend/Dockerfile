FROM python:3.11.4-slim-bullseye

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY src/ ./src/

# Create uploads directory
RUN mkdir -p uploads

# Expose port
EXPOSE 5000

# Set PYTHONPATH so 'src' is importable
ENV PYTHONPATH=/app

# Copy and set up the entrypoint script
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Start the application via the entrypoint script
ENTRYPOINT ["/entrypoint.sh"]