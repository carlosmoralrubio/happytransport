# Multi-stage build for backend
FROM python:3.11-slim as builder

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# Final stage
FROM python:3.11-slim

WORKDIR /app

# Copy Python dependencies from builder
COPY --from=builder /root/.local /root/.local
ENV PATH=/root/.local/bin:$PATH

# Copy application code
COPY . .

# Create data directory
RUN mkdir -p /app/data

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PORT=8080
ENV DATASET_PATH=/app/data/loads.csv
ENV METRICS_PATH=/app/data/metrics.csv

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD python -c "import os, urllib.request; raw = os.getenv('API_KEYS') or os.getenv('API_KEY') or 'dev-key-change-me'; key = raw.split(',')[0].strip() or 'dev-key-change-me'; port = os.getenv('PORT', '8080'); req = urllib.request.Request(f'http://localhost:{port}/v1/health', headers={'X-API-Key': key}); urllib.request.urlopen(req)"

# Default API key (should be overridden in production)
ENV API_KEYS="secret-dev"

# Expose port
EXPOSE 8080

# Run application
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8080}"]
