#!/bin/bash
#
# Fetch country count from PostHog and update cws-stats.json
#
# Usage:
#   ./scripts/update-countries.sh
#
# Reads config from .env file in repo root.
# Requires: curl, jq

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
STATS_FILE="$REPO_ROOT/assets/data/cws-stats.json"
ENV_FILE="$REPO_ROOT/.env"

# Load .env if present
if [ -f "$ENV_FILE" ]; then
  set -a
  source "$ENV_FILE"
  set +a
fi

POSTHOG_HOST="${POSTHOG_HOST:-https://eu.i.posthog.com}"
POSTHOG_PROJECT_ID="${POSTHOG_PROJECT_ID:-}"
POSTHOG_API_KEY="${POSTHOG_API_KEY:-}"

if [ -z "$POSTHOG_API_KEY" ]; then
  echo "Error: POSTHOG_API_KEY not set. Add it to .env or export it."
  exit 1
fi

if [ -z "$POSTHOG_PROJECT_ID" ]; then
  echo "Error: POSTHOG_PROJECT_ID not set. Add it to .env or export it."
  exit 1
fi

if [ ! -f "$STATS_FILE" ]; then
  echo "Error: $STATS_FILE not found."
  exit 1
fi

echo "Querying PostHog for distinct countries..."

RESPONSE=$(curl -sf "$POSTHOG_HOST/api/projects/$POSTHOG_PROJECT_ID/query/" \
  -H "Authorization: Bearer $POSTHOG_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query":{"kind":"HogQLQuery","query":"SELECT count(DISTINCT properties.$geoip_country_code) as countries FROM events WHERE properties.$geoip_country_code IS NOT NULL"}}')

COUNTRIES=$(echo "$RESPONSE" | jq -r '.results[0][0]')

if [ -z "$COUNTRIES" ] || [ "$COUNTRIES" = "null" ]; then
  echo "Error: Failed to parse country count from PostHog response"
  echo "Response: $RESPONSE"
  exit 1
fi

echo "Found $COUNTRIES countries"

# Update the JSON file preserving other fields
jq --argjson countries "$COUNTRIES" '.countries = $countries' "$STATS_FILE" > "${STATS_FILE}.tmp"
mv "${STATS_FILE}.tmp" "$STATS_FILE"

echo "Updated $STATS_FILE"
jq . "$STATS_FILE"