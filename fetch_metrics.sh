#!/bin/bash

# 1. Detect the Language Server process for the current workspace
# The IDE often replaces hyphens with underscores in the workspace ID
WORKSPACE_SEARCH="trading_backtester_v1"
PS_OUTPUT=$(ps aux | grep "language_server" | grep "$WORKSPACE_SEARCH" | grep -v grep | head -n 1)

if [ -z "$PS_OUTPUT" ]; then
    echo "Error: Could not find Antigravity Language Server for workspace: $WORKSPACE_SEARCH"
    echo "Make sure the IDE is running and this project is open."
    exit 1
fi

# 2. Extract PID and CSRF Token
PID=$(echo "$PS_OUTPUT" | awk '{print $2}')
TOKEN=$(echo "$PS_OUTPUT" | grep -oE "\-\-csrf_token [a-zA-Z0-9\-]+" | awk '{print $2}')

# 3. Find the listening port (The LS usually has several, we need the one responding to HTTP)
# We test the first few local ports owned by the process
PORTS=$(lsof -iTCP -sTCP:LISTEN -P -n -p $PID | grep "127.0.0.1" | awk -F':' '{print $2}' | awk '{print $1}')

echo "--- Discovery ---"
echo "PID:   $PID"
echo "Token: $TOKEN"

FINAL_PORT=""
for PORT in $PORTS; do
    RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "http://127.0.0.1:$PORT/exa.language_server_pb.LanguageServerService/GetUserStatus" \
      -H "X-Codeium-Csrf-Token: $TOKEN" \
      -H "Connect-Protocol-Version: 1" \
      -H "Content-Type: application/json" \
      -d '{}')
    
    if [ "$RESPONSE" == "200" ]; then
        FINAL_PORT=$PORT
        break
    fi
done

if [ -z "$FINAL_PORT" ]; then
    echo "Error: Could not find the active Metrics API port."
    exit 1
fi

echo "Port:  $FINAL_PORT (Found active)"
echo "-----------------"

# 4. Fetch the metrics
curl -s -X POST "http://127.0.0.1:$FINAL_PORT/exa.language_server_pb.LanguageServerService/GetUserStatus" \
  -H "X-Codeium-Csrf-Token: $TOKEN" \
  -H "Connect-Protocol-Version: 1" \
  -H "Content-Type: application/json" \
  -d '{"metadata": {"ideName": "antigravity", "extensionName": "cli-monitor", "locale": "en"}}' | jq .
