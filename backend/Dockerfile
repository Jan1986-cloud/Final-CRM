FROM python:3.11-slim

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

# Production: serve via gunicorn on port 5000
CMD ["gunicorn", "-b", "0.0.0.0:5000", "src.main:app"]

