# Multi-stage production Dockerfile for AttendX FastAPI Backend
FROM python:3.11-slim as builder

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# Final runtime image
FROM python:3.11-slim as runner

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy installed wheels from builder
COPY --from=builder /root/.local /root/.local
ENV PATH=/root/.local/bin:$PATH

# Copy backend application source
COPY . .

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8000

EXPOSE 8000

# Health check using API endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:8000/api/v1/admin/health || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4", "--proxy-headers", "--forwarded-allow-ips", "*"]

# ---------------------------------------------------------------------------
# Celery worker image — same source, different runtime command and health check.
# The worker serves no HTTP, so it must not inherit the API's curl health check.
# ---------------------------------------------------------------------------
FROM runner AS worker

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD celery -A app.tasks.celery_app inspect ping -d "celery@$(hostname)" || exit 1

CMD ["celery", "-A", "app.tasks.celery_app", "worker", "--loglevel=info", "-c", "2"]
