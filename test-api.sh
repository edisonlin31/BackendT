#!/bin/bash

# Helpdesk API Test Script
echo "🧪 Testing Helpdesk API Endpoints"
echo "=================================="

BASE_URL="http://localhost:5000/api"

# Test health endpoint
echo "1. Testing Health Endpoint..."
curl -s "$BASE_URL/health" | jq '.' || echo "Failed"
echo ""

# Test user registration
echo "2. Testing User Registration..."
RESPONSE=$(curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "Password123",
    "role": "L1"
  }')

echo "$RESPONSE" | jq '.'

# Extract token for subsequent requests
TOKEN=$(echo "$RESPONSE" | jq -r '.data.token // empty')

if [ -z "$TOKEN" ]; then
  echo "❌ Registration failed, cannot continue with authenticated requests"
  exit 1
fi

echo "✅ Token received: ${TOKEN:0:20}..."
echo ""

# Test getting user profile
echo "3. Testing Get Profile..."
curl -s "$BASE_URL/auth/profile" \
  -H "Authorization: Bearer $TOKEN" | jq '.'
echo ""

# Test creating a ticket
echo "4. Testing Create Ticket..."
TICKET_RESPONSE=$(curl -s -X POST "$BASE_URL/tickets" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "Test Ticket",
    "description": "This is a test ticket for API testing",
    "category": "Testing",
    "priority": "Medium",
    "expectedCompletionDate": "'$(date -d '+1 day' -Iseconds)'"
  }')

echo "$TICKET_RESPONSE" | jq '.'

# Extract ticket ID
TICKET_ID=$(echo "$TICKET_RESPONSE" | jq -r '.data.ticket._id // empty')

if [ -n "$TICKET_ID" ]; then
  echo "✅ Ticket created with ID: $TICKET_ID"
  echo ""
  
  # Test getting tickets
  echo "5. Testing Get Tickets..."
  curl -s "$BASE_URL/tickets" \
    -H "Authorization: Bearer $TOKEN" | jq '.'
  echo ""
  
  # Test getting ticket by ID
  echo "6. Testing Get Ticket by ID..."
  curl -s "$BASE_URL/tickets/$TICKET_ID" \
    -H "Authorization: Bearer $TOKEN" | jq '.'
  echo ""
else
  echo "❌ Ticket creation failed"
fi

echo "🎉 API Test Complete!"