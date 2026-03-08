# Multi-stage build for backend
FROM python:3.11-slim as builder

WORKDIR /app

# Install dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# Final stage
FROM python:3.11-slim

WORKDIR /app

# Copy Python dependencies from builder
COPY --from=builder /root/.local /root/.local
ENV PATH=/root/.local/bin:$PATH

# Copy application code
COPY backend/ .

# Create data directory
RUN mkdir -p /app/data

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV DATASET_PATH=/app/data/loads.csv
ENV METRICS_PATH=/app/data/metrics.csv

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD python -c "import urllib.request; req = urllib.request.Request('http://localhost:8000/api/v1/health', headers={'X-API-Key': 'secret-dev'}); urllib.request.urlopen(req)"

# Default API key (should be overridden in production)
ENV API_KEYS="dev-key-change-me"

# Expose port
EXPOSE 8000

# Run application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
