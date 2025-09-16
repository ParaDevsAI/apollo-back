#!/usr/bin/env node

// Teste simples para verificação de quest
const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api/v1';

async function testQuestVerification() {
  console.log('🚀 Iniciando testes da API de verificação de quest...\n');

  const tests = [
    {
      name: 'XLM 400 - Deve retornar true',
      payload: {
        user_address: "GDQVUCDWEYLVL7HF6F7LYMK6LZCR6MWJNWGWI2K2JPFEXJXBMJWQZQHA",
        periodo: {
          start_time: 1694908800,
          end_time: 1695513600
        },
        valor: "400",
        token: "XLM"
      },
      expected: true
    },
    {
      name: 'XLM 600 - Deve retornar false',
      payload: {
        user_address: "GDQVUCDWEYLVL7HF6F7LYMK6LZCR6MWJNWGWI2K2JPFEXJXBMJWQZQHA",
        periodo: {
          start_time: 1694908800,
          end_time: 1695513600
        },
        valor: "600",
        token: "XLM"
      },
      expected: false
    },
    {
      name: 'USDC 800 - Deve retornar true',
      payload: {
        user_address: "GDQVUCDWEYLVL7HF6F7LYMK6LZCR6MWJNWGWI2K2JPFEXJXBMJWQZQHA",
        periodo: {
          start_time: 1694908800,
          end_time: 1695513600
        },
        valor: "800",
        token: "USDC"
      },
      expected: true
    },
    {
      name: 'USDC 1200 - Deve retornar false',
      payload: {
        user_address: "GDQVUCDWEYLVL7HF6F7LYMK6LZCR6MWJNWGWI2K2JPFEXJXBMJWQZQHA",
        periodo: {
          start_time: 1694908800,
          end_time: 1695513600
        },
        valor: "1200",
        token: "USDC"
      },
      expected: false
    },
    {
      name: 'Endereço inválido - Deve retornar false',
      payload: {
        user_address: "INVALID_ADDRESS",
        periodo: {
          start_time: 1694908800,
          end_time: 1695513600
        },
        valor: "400",
        token: "XLM"
      },
      expected: false
    }
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      console.log(`📝 Testando: ${test.name}`);
      
      const response = await axios.post(`${BASE_URL}/quests/verify`, test.payload, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      const result = response.data;
      
      if (result.success && result.data.verified === test.expected) {
        console.log(`✅ PASSOU - Resultado: ${result.data.verified}`);
        passed++;
      } else {
        console.log(`❌ FALHOU - Esperado: ${test.expected}, Recebido: ${result.data?.verified || 'erro'}`);
        console.log(`   Resposta completa:`, JSON.stringify(result, null, 2));
        failed++;
      }
    } catch (error) {
      console.log(`❌ ERRO - ${error.message}`);
      if (error.response) {
        console.log(`   Status: ${error.response.status}`);
        console.log(`   Dados:`, JSON.stringify(error.response.data, null, 2));
      }
      failed++;
    }
    
    console.log('');
  }

  console.log(`📊 RESUMO DOS TESTES:`);
  console.log(`✅ Passaram: ${passed}`);
  console.log(`❌ Falharam: ${failed}`);
  console.log(`📈 Total: ${passed + failed}`);
  
  if (failed === 0) {
    console.log(`🎉 TODOS OS TESTES PASSARAM!`);
  }
}

// Verificar se o servidor está rodando
async function checkHealth() {
  try {
    const response = await axios.get(`${BASE_URL.replace('/api/v1', '')}/health`, { timeout: 5000 });
    console.log('✅ Servidor está rodando\n');
    return true;
  } catch (error) {
    console.log('❌ Servidor não está rodando. Execute "npm run dev" primeiro.\n');
    return false;
  }
}

// Executar testes
checkHealth().then(isHealthy => {
  if (isHealthy) {
    testQuestVerification();
  }
}).catch(console.error);
