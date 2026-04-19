#!/usr/bin/env bash
set -euo pipefail

SLUG="${1:-}"
if [[ -z "$SLUG" ]]; then
  echo "Usage: $0 <slug>" >&2
  exit 1
fi

if [[ -z "${DATABASE_URL:-}" && -f "$(dirname "$0")/../.env" ]]; then
  export $(grep -E '^DATABASE_URL=' "$(dirname "$0")/../.env" | xargs)
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "Error: DATABASE_URL is not set. Export it or add it to .env." >&2
  exit 1
fi

echo "=== Competition ==="
psql "$DATABASE_URL" <<SQL
SELECT
  id,
  "sourceId",
  name,
  slug,
  type,
  status,
  "dateStart"::date AS date_start,
  "dateEnd"::date   AS date_end,
  city,
  venue,
  country,
  categories,
  "weightCategories"
FROM "Competition"
WHERE slug = '$SLUG';
SQL

echo ""
echo "=== Livestreams ==="
psql "$DATABASE_URL" <<SQL
SELECT
  vf.id,
  vf.name,
  vf.url
FROM "VideoFeed" vf
JOIN "Competition" c ON c.id = vf."competitionId"
WHERE c.slug = '$SLUG';
SQL
