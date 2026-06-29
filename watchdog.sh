#!/bin/bash
# Dev server watchdog with Supabase env injection
# Prisma's .env parser breaks on URL-encoded passwords, so we inject env directly

export DATABASE_URL='postgresql://postgres.bxunjxcfjxoaolqhziox:Qaz_el%401994%21@aws-1-eu-central-1.pooler.supabase.com:5432/postgres'

cd /home/z/my-project

while true; do
  echo "[$(date +%H:%M:%S)] starting next dev (webpack, Supabase)..."
  node node_modules/.bin/next dev -p 3000 --webpack > /home/z/my-project/dev.log 2>&1
  echo "[$(date +%H:%M:%S)] next dev exited (code $?), restarting in 2s..."
  sleep 2
done
