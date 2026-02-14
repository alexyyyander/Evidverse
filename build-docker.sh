#!/usr/bin/env bash
set -euo pipefail

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
PROJECT_NAME="${PROJECT_NAME:-evidverse}"

USE_PIP_MIRROR="${USE_PIP_MIRROR:-1}"
DEFAULT_PIP_INDEX_URL="https://pypi.tuna.tsinghua.edu.cn/simple"
DEFAULT_PIP_TRUSTED_HOST="pypi.tuna.tsinghua.edu.cn"

args=("$@")
cmd="up"

while [ "${#args[@]}" -gt 0 ]; do
  case "${args[0]}" in
    --mirror)
      USE_PIP_MIRROR=1
      args=("${args[@]:1}")
      ;;
    --no-mirror)
      USE_PIP_MIRROR=0
      args=("${args[@]:1}")
      ;;
    --help|-h)
      cmd="help"
      args=("${args[@]:1}")
      ;;
    *)
      break
      ;;
  esac
done

if [ "$cmd" != "help" ] && [ "${#args[@]}" -gt 0 ]; then
  cmd="${args[0]}"
  args=("${args[@]:1}")
fi

if [ "$USE_PIP_MIRROR" = "1" ]; then
  export PIP_INDEX_URL="${PIP_INDEX_URL:-$DEFAULT_PIP_INDEX_URL}"
  export PIP_TRUSTED_HOST="${PIP_TRUSTED_HOST:-$DEFAULT_PIP_TRUSTED_HOST}"
fi

compose() {
  docker compose -p "$PROJECT_NAME" -f "$COMPOSE_FILE" "$@"
}

usage() {
  cat <<EOF
Usage:
  ./build-docker.sh [--mirror|--no-mirror] <command> [args]

Commands:
  up                 Build and start services (detached)
  down               Stop and remove services
  restart            Restart services
  status             Show service status (ps)
  logs [svc]         Tail logs (optionally for a service)
  ps                 Alias of status
  build [svc]        Build images (optionally for a service)
  pull [svc]         Pull images (optionally for a service)
  stop [svc]         Stop services (optionally for a service)
  start [svc]        Start services (optionally for a service)
  exec <svc> <cmd>   Exec into a running service
  clean              Down + remove volumes (DANGEROUS)

Env:
  COMPOSE_FILE=docker-compose.prod.yml
  PROJECT_NAME=evidverse
  USE_PIP_MIRROR=1           (default: 1)
  PIP_INDEX_URL=...          (optional override)
  PIP_TRUSTED_HOST=...       (optional override)

Examples:
  ./build-docker.sh up
  ./build-docker.sh --mirror up
  ./build-docker.sh --no-mirror build backend
  ./build-docker.sh status
  ./build-docker.sh logs backend
  ./build-docker.sh exec backend bash
EOF
}

case "$cmd" in
  up)
    compose up -d --build "${args[@]}"
    ;;
  down)
    compose down "${args[@]}"
    ;;
  restart)
    compose restart "${args[@]}"
    ;;
  status | ps)
    compose ps
    ;;
  logs)
    if [ "${#args[@]}" -eq 0 ]; then
      compose logs -f --tail 200
    else
      compose logs -f --tail 200 "${args[0]}"
    fi
    ;;
  build)
    compose build "${args[@]}"
    ;;
  pull)
    compose pull "${args[@]}"
    ;;
  stop)
    compose stop "${args[@]}"
    ;;
  start)
    compose start "${args[@]}"
    ;;
  exec)
    svc="${args[0]:-}"
    if [ -z "$svc" ]; then
      echo "Missing service name."
      echo
      usage
      exit 2
    fi
    if [ "${#args[@]}" -lt 2 ]; then
      echo "Missing command to exec."
      echo
      usage
      exit 2
    fi
    compose exec "$svc" "${args[@]:1}"
    ;;
  clean)
    compose down -v --remove-orphans
    ;;
  help | -h | --help)
    usage
    ;;
  *)
    echo "Unknown command: $cmd"
    echo
    usage
    exit 2
    ;;
esac
