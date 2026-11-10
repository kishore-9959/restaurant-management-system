#!/bin/bash
# ============================================================================
# RESTAURANT MANAGEMENT SYSTEM (RMS) - CROSS-PLATFORM START SCRIPT
# File: scripts/start-all.sh
# ============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"

echo "==================================================="
echo "  Restaurant Management System (RMS)               "
echo "  Starting All 14 Microservices + API Gateway      "
echo "==================================================="

SERVICES=(
  "auth-service:8001"
  "user-service:8002"
  "restaurant-service:8003"
  "cms-service:8004"
  "menu-service:8005"
  "cart-service:8006"
  "order-service:8007"
  "payment-service:8008"
  "inventory-service:8009"
  "kitchen-service:8010"
  "reservation-service:8011"
  "notification-service:8012"
  "report-service:8013"
)

# 1. Start all 13 domain microservices in the background
for item in "${SERVICES[@]}"; do
  IFS=":" read -r name port <<< "$item"
  echo "Starting $name on port $port..."
  (cd "$BACKEND_DIR/$name" && npm run dev) &
done

# 2. Wait briefly and start API Gateway last (Port 8000)
sleep 2
echo "Starting API Gateway on port 8000..."
(cd "$BACKEND_DIR/api-gateway" && npm run dev) &

echo "==================================================="
echo "  All 14 RMS microservices started in background!  "
echo "  Gateway: http://localhost:8000                   "
echo "==================================================="

wait
