# Dockerfile for FastAPI Backend (optimized for faster builds)

FROM python:3.11-slim-bookworm

# Optional: Set APT mirror (e.g. Aliyun, Tsinghua)
ARG APT_MIRROR
RUN if [ -n "${APT_MIRROR}" ]; then \
    sed -i "s|deb.debian.org|${APT_MIRROR}|g" /etc/apt/sources.list.d/debian.sources; \
    fi

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

ARG PIP_INDEX_URL
ARG PIP_TRUSTED_HOST
ARG PIP_TIMEOUT

COPY backend/requirements.txt ./requirements.txt
RUN set -eux; \
    PIP_FLAGS=""; \
    if [ -n "${PIP_INDEX_URL:-}" ]; then PIP_FLAGS="$PIP_FLAGS -i ${PIP_INDEX_URL}"; fi; \
    if [ -n "${PIP_TRUSTED_HOST:-}" ]; then PIP_FLAGS="$PIP_FLAGS --trusted-host ${PIP_TRUSTED_HOST}"; fi; \
    if [ -n "${PIP_TIMEOUT:-}" ]; then PIP_FLAGS="$PIP_FLAGS --timeout ${PIP_TIMEOUT}"; fi; \
    pip install --no-cache-dir $PIP_FLAGS -r requirements.txt

COPY backend/app ./app
COPY backend/alembic ./alembic
COPY backend/alembic.ini ./alembic.ini
COPY backend/docker-entrypoint.sh ./docker-entrypoint.sh
COPY ai_engine ./ai_engine

RUN addgroup --system evidverse && adduser --system --group evidverse
USER evidverse

EXPOSE 8000

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
