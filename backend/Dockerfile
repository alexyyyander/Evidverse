# Dockerfile for FastAPI Backend (optimized for faster builds)

FROM python:3.11-slim-bookworm

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

ARG PIP_INDEX_URL
ARG PIP_TRUSTED_HOST

COPY requirements.txt .
RUN set -eux; \
    PIP_FLAGS=""; \
    if [ -n "${PIP_INDEX_URL:-}" ]; then PIP_FLAGS="$PIP_FLAGS -i ${PIP_INDEX_URL}"; fi; \
    if [ -n "${PIP_TRUSTED_HOST:-}" ]; then PIP_FLAGS="$PIP_FLAGS --trusted-host ${PIP_TRUSTED_HOST}"; fi; \
    pip install --no-cache-dir $PIP_FLAGS -r requirements.txt

COPY . .

RUN addgroup --system vidgit && adduser --system --group vidgit
USER vidgit

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
