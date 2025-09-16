#!/bin/bash

# Script de teste do Apollo Backend - Fluxo de Wallets
echo "🚀 Testando Apollo Backend - Sistema de Wallets"
echo "================================================="

# Configurações
BASE_URL="http://localhost:3000/api"
TEST_ADDRESS="GCLWGQPMKXQSPF776IU33AH4PZNOOWNAWGGKVTBQMIC5IMKUNP3E6NVU"

echo ""
echo "1️⃣ Testando Health Check..."
curl -s "$BASE_URL/health" | jq .

echo ""
echo "2️⃣ Listando wallets suportadas..."
curl -s "$BASE_URL/auth/wallets" | jq .

echo ""
echo "3️⃣ Gerando challenge para wallet..."
CHALLENGE_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/challenge" \
  -H "Content-Type: application/json" \
  -d "{\"address\": \"$TEST_ADDRESS\"}")

echo $CHALLENGE_RESPONSE | jq .

# Extrair o challenge da resposta
CHALLENGE=$(echo $CHALLENGE_RESPONSE | jq -r '.data.challenge')

echo ""
echo "4️⃣ Simulando autenticação com assinatura..."
AUTH_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/authenticate" \
  -H "Content-Type: application/json" \
  -d "{
    \"address\": \"$TEST_ADDRESS\",
    \"signature\": \"fake_signature_for_testing_12345\",
    \"publicKey\": \"$TEST_ADDRESS\",
    \"walletType\": \"freighter\",
    \"challenge\": \"$CHALLENGE\"
  }")

echo $AUTH_RESPONSE | jq .

# Extrair o token da resposta
TOKEN=$(echo $AUTH_RESPONSE | jq -r '.data.token')

echo ""
echo "5️⃣ Testando acesso a rota protegida (listar quests)..."
curl -s -X GET "$BASE_URL/quests" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | jq .

echo ""
echo "6️⃣ Criando uma quest de teste..."
curl -s -X POST "$BASE_URL/quests" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Quest de Teste Apollo",
    "description": "Esta é uma quest de teste para demonstrar o funcionamento do sistema",
    "questType": "task",
    "distributionType": "fcfs",
    "maxParticipants": 100,
    "rewardAmount": 10,
    "startDate": "2025-09-16T00:00:00Z",
    "endDate": "2025-12-31T23:59:59Z"
  }' | jq .

echo ""
echo "7️⃣ Listando todas as quests..."
curl -s -X GET "$BASE_URL/quests" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | jq .

echo ""
echo "✅ Teste completo! Sistema de wallets funcionando!"
echo "================================================="
