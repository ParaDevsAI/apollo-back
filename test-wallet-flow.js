#!/usr/bin/env node

/**
 * Wallet Flow Test Script
 * 
 * This script demonstrates the complete wallet integration flow
 * Run with: node test-wallet-flow.js
 */

const baseUrl = 'http://localhost:3000/api/v1';

// Mock Stellar public key for testing
const testPublicKey = 'GCLWGQPMKXQSPF776IU33AH4PZNOOWNAWGGKVTBQMIC5IMKUNP3E6NVU';

async function testWalletFlow() {
  console.log('🧪 Testing Apollo Wallet Integration Flow\n');

  try {
    // Step 1: Authenticate wallet user
    console.log('1️⃣ Authenticating wallet user...');
    const authResponse = await fetch(`${baseUrl}/auth/wallet/connect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        publicKey: testPublicKey,
        userName: 'TestUser'
      })
    });

    const authData = await authResponse.json();
    console.log('✅ Authentication result:', {
      success: authData.success,
      user: authData.data?.user?.userName,
      publicKey: authData.data?.user?.publicKey?.substring(0, 8) + '...'
    });

    const authToken = authData.data.token;

    // Step 2: Get supported wallets
    console.log('\n2️⃣ Getting supported wallets...');
    const walletsResponse = await fetch(`${baseUrl}/auth/wallet/supported`);
    const walletsData = await walletsResponse.json();
    console.log('✅ Supported wallets:', walletsData.data.wallets.map(w => w.name));

    // Step 3: Build quest registration transaction
    console.log('\n3️⃣ Building quest registration transaction...');
    const buildRegisterResponse = await fetch(`${baseUrl}/auth/wallet/quest/1/build-register`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        publicKey: testPublicKey
      })
    });

    const buildRegisterData = await buildRegisterResponse.json();
    console.log('✅ Transaction built:', {
      questId: buildRegisterData.data?.questId,
      hasXdr: !!buildRegisterData.data?.transactionXdr,
      instruction: buildRegisterData.data?.instructions?.message
    });

    // Step 4: Build claim rewards transaction
    console.log('\n4️⃣ Building claim rewards transaction...');
    const buildClaimResponse = await fetch(`${baseUrl}/auth/wallet/quest/1/build-claim`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        publicKey: testPublicKey
      })
    });

    const buildClaimData = await buildClaimResponse.json();
    console.log('✅ Claim transaction built:', {
      questId: buildClaimData.data?.questId,
      hasXdr: !!buildClaimData.data?.transactionXdr,
      instruction: buildClaimData.data?.instructions?.message
    });

    // Step 5: Check service health
    console.log('\n5️⃣ Checking service health...');
    const healthResponse = await fetch(`${baseUrl}/auth/wallet/health`);
    const healthData = await healthResponse.json();
    console.log('✅ Service health:', {
      status: healthData.status,
      message: healthData.message
    });

    // Step 6: Get service info
    console.log('\n6️⃣ Getting service info...');
    const infoResponse = await fetch(`${baseUrl}/auth/wallet/info`);
    const infoData = await infoResponse.json();
    console.log('✅ Service info:', {
      service: infoData.data?.service,
      network: infoData.data?.network,
      note: infoData.data?.note
    });

    console.log('\n🎉 All wallet flow tests completed successfully!');
    console.log('\n📋 Next Steps for Frontend Integration:');
    console.log('   1. Install: npm install @creit.tech/stellar-wallets-kit');
    console.log('   2. Connect wallet using Stellar Wallets Kit');
    console.log('   3. Sign transactions with wallet');
    console.log('   4. Submit signed XDRs to these endpoints');
    console.log('   5. See WALLET_INTEGRATION_FLOW.md for detailed implementation');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    if (error.message.includes('fetch')) {
      console.log('\n💡 Make sure the Apollo backend server is running:');
      console.log('   cd apollo-back && npm run dev');
    }
  }
}

// Run the test
testWalletFlow();