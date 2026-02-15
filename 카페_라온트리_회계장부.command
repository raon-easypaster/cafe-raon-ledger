#!/bin/bash
cd "$(dirname "$0")"
osascript -e 'tell application "Terminal" to do script "cd \"'$(pwd)'\" && npm run dev"'
sleep 2
open http://localhost:5173
