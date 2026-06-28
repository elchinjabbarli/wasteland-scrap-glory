#!/bin/bash
cd /home/z/my-project
while true; do
  echo "[$(date +%H:%M:%S)] starting next dev (webpack)..."
  node node_modules/.bin/next dev -p 3000 --webpack > /home/z/my-project/dev.log 2>&1
  echo "[$(date +%H:%M:%S)] next dev exited (code $?), restarting in 2s..."
  sleep 2
done
