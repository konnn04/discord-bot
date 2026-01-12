#!/bin/sh
set -e

# Simple entrypoint to wait for DB, run migrations, optionally deploy commands, then exec CMD

if [ -n "${DATABASE_URL}" ]; then
  echo "Waiting for database availability..."
  n=0
  until psql "${DATABASE_URL}" -c '\q' >/dev/null 2>&1 || [ "$n" -ge 60 ]; do
    n=$((n+1))
    sleep 1
  done
  if [ "$n" -ge 60 ]; then
    echo "Warning: database did not become available after 60s, continuing anyway."
  else
    echo "Database is available."
  fi
fi

echo "Running DB migrations..."
npm run db:migrate || echo "Migrations exited non-zero"

if [ "${RUN_DEPLOY_COMMANDS}" = "true" ]; then
  echo "RUN_DEPLOY_COMMANDS=true: running deploy-commands"
  npm run deploy-commands || echo "deploy-commands exited non-zero"
fi

echo "Starting application..."
exec "$@"
