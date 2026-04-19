#!/usr/bin/env bash
set -euo pipefail

# Load DATABASE_URL from .env if present and not already set
if [[ -z "${DATABASE_URL:-}" && -f "$(dirname "$0")/../.env" ]]; then
  export $(grep -E '^DATABASE_URL=' "$(dirname "$0")/../.env" | xargs)
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "Error: DATABASE_URL is not set. Export it or add it to .env." >&2
  exit 1
fi

psql "$DATABASE_URL" <<'SQL'
SELECT
  id,
  "sourceId",
  slug,
  name,
  status,
  "dateStart"::date AS date
FROM "Competition"
ORDER BY "dateStart" DESC;
SQL
