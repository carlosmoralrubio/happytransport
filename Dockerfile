# Stage 1: Builder 
# Install dependencies in an isolated layer so the final image stays lean.
FROM python:3.12-slim AS builder

WORKDIR /app

# Install build tools needed by some Python packages
RUN apt-get update && apt-get install -y --no-install-recommends gcc && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --upgrade pip && \
    pip install --no-cache-dir --prefix=/install -r requirements.txt


# Stage 2: Runtime 
FROM python:3.12-slim

WORKDIR /app

# Copy installed packages from builder
COPY --from=builder /install /usr/local

# Copy application files
COPY main.py .
COPY loads.csv .
COPY datamodel.py .
COPY functions.py .

# Cloud Run injects the PORT environment variable (default 8080).
# Uvicorn reads it at startup via the entrypoint below.
ENV PORT=8080
ENV DATASET_PATH=/app/loads.csv
ENV METRICS_PATH=/app/metrics.csv

# Create a non-root user for security best practices
RUN useradd --create-home appuser && chown -R appuser:appuser /app
USER appuser

# Expose the port (documentation only — Cloud Run sets the actual port)
EXPOSE 8080

# Start uvicorn, binding to 0.0.0.0 so Cloud Run can reach it.
# Workers=1 is recommended for Cloud Run — scale via instances, not workers.
CMD exec uvicorn main:app --host 0.0.0.0 --port ${PORT} --workers 1
