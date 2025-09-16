# Frontend vs Backend Responsibilities

## 🎯 Clear Separation of Concerns

### 🖥️ **FRONTEND RESPONSIBILITIES**

#### **Wallet Management (Stellar Wallets Kit)**
```javascript
// Frontend handles ALL wallet interactions
import { StellarWalletsKit } from '@creit.tech/stellar-wallets-kit';

// Connect wallet
const kit = new StellarWalletsKit({ /* config */ });
await kit.openModal();
const publicKey = kit.getPublicKey();

// Sign transactions
const signedXdr = await kit.sign(transactionXdr);
```

#### **Direct Smart Contract READ Calls**
```javascript
// Frontend can call these directly (no auth required)
import { Contract } from '@stellar/stellar-sdk';

const contract = new Contract(CONTRACT_ADDRESS);

// ✅ Frontend can call directly:
await contract.call('get_active_quests');
await contract.call('get_quest', questId);
await contract.call('is_user_registered', questId, userAddress);
await contract.call('get_user_quests', userAddress);
await contract.call('get_quest_stats', questId);
await contract.call('get_winners', questId);
await contract.call('get_participants', questId);
```

#### **User Interface & Experience**
- Display quest information
- Show registration status
- Handle wallet connection/disconnection
- Transaction signing and submission
- Progress tracking and notifications

---

### ⚙️ **BACKEND RESPONSIBILITIES**

#### **Admin-Level Contract Operations**
```typescript
// Backend handles admin functions (require CONTRACT_ADMIN auth)
class StellarWalletService {
  async markUserEligible(questId: number, userAddress: string) {
    // ✅ Backend calls: contract.mark_user_eligible(quest_id, user)
    // Requires ADMIN authentication
  }
  
  async createQuest(questData: QuestData) {
    // ✅ Backend calls: contract.create_quest(...)
    // Requires ADMIN authentication
  }
  
  async resolveQuest(questId: number) {
    // ✅ Backend calls: contract.resolve_quest(quest_id)
    // Requires ADMIN authentication  
  }
}
```

#### **Task Verification & Validation**
```typescript
// Backend validates task completion via external APIs/oracles
async verifyTradeVolume(userAddress: string, requiredVolume: number): Promise<boolean> {
  // Check DEX APIs, transaction history, etc.
  const actualVolume = await this.getDEXTradeVolume(userAddress);
  return actualVolume >= requiredVolume;
}

async verifyTokenHolding(userAddress: string, tokenAddress: string, amount: number): Promise<boolean> {
  // Check token balance via Horizon API
  const balance = await this.getTokenBalance(userAddress, tokenAddress);
  return balance >= amount;
}
```

#### **Secure Transaction Building**
```typescript
// Backend builds transactions that users will sign
async buildQuestRegistrationTransaction(questId: number, userAddress: string): Promise<string> {
  // Returns XDR for frontend to sign
  // Calls: contract.register(quest_id, user_address)
}

async buildClaimRewardsTransaction(questId: number, userAddress: string): Promise<string> {
  // Returns XDR for frontend to sign  
  // Calls: contract.distribute_rewards(quest_id)
}
```

---

## 🔐 **SECURITY MODEL**

### **What Frontend CAN'T Do:**
❌ Call admin functions (`mark_user_eligible`, `create_quest`, `resolve_quest`)
❌ Validate task completion (must trust backend verification)
❌ Access admin private keys or secrets
❌ Bypass business logic validations

### **What Backend CAN'T Do:**
❌ Access user's wallet private keys
❌ Sign transactions on behalf of users
❌ Force users to submit transactions
❌ Connect to user wallets directly

### **Shared Responsibilities:**
🤝 **Transaction Flow:** Backend builds → Frontend signs → Backend submits
🤝 **Authentication:** Backend validates JWT → Frontend manages wallet connection
🤝 **State Sync:** Backend tracks quest state → Frontend displays current status

---

## 🌊 **COMPLETE USER FLOW**

### **1. Login Flow:**
```
Frontend: Connect Wallet (Stellar Wallets Kit)
Frontend: → POST /api/v1/auth/wallet/connect { publicKey }  
Backend:  Generate JWT token
Frontend: Store token for API calls
```

### **2. Registration Flow:**
```
Frontend: Click "Register for Quest"
Frontend: → POST /api/v1/auth/wallet/quest/{id}/build-register { publicKey }
Backend:  Build contract.register(quest_id, user) transaction
Backend:  Return unsigned XDR
Frontend: Sign XDR with wallet
Frontend: → POST /api/v1/auth/wallet/quest/{id}/register { signedXdr }
Backend:  Submit signed transaction to network
Backend:  Return success/failure
```

### **3. Verification Flow:**
```
Frontend: Click "Check Eligibility" 
Frontend: → POST /api/v1/auth/wallet/quest/{id}/verify { publicKey }
Backend:  Check task completion via external APIs
Backend:  If eligible → Call contract.mark_user_eligible(quest_id, user)
Backend:  Return eligibility status
Frontend: Update UI to show eligible/not eligible
```

### **4. Claim Flow:**
```
Frontend: Click "Claim Rewards"
Frontend: → POST /api/v1/auth/wallet/quest/{id}/build-claim { publicKey }
Backend:  Check if user is winner
Backend:  Build contract.distribute_rewards(quest_id) transaction  
Backend:  Return unsigned XDR
Frontend: Sign XDR with wallet
Frontend: → POST /api/v1/auth/wallet/quest/{id}/claim-rewards { signedXdr }
Backend:  Submit signed transaction to network
Backend:  Return success/rewards distributed
```

---

## 🚦 **API ENDPOINTS SUMMARY**

### **Authentication:**
- `POST /api/v1/auth/wallet/connect` - Login with wallet
- `POST /api/v1/auth/wallet/disconnect` - Logout

### **Quest Information (Read-Only):**
- `GET /api/v1/quests` - List active quests (proxy to contract)
- `GET /api/v1/quests/{id}` - Get quest details (proxy to contract)
- `GET /api/v1/quests/{id}/stats` - Get quest statistics

### **User Actions (Transaction Building):**
- `POST /api/v1/auth/wallet/quest/{id}/build-register` - Build registration TX
- `POST /api/v1/auth/wallet/quest/{id}/register` - Submit signed registration
- `POST /api/v1/auth/wallet/quest/{id}/verify` - Check task completion
- `POST /api/v1/auth/wallet/quest/{id}/build-claim` - Build claim TX
- `POST /api/v1/auth/wallet/quest/{id}/claim-rewards` - Submit signed claim

### **Admin Operations (Backend Only):**
- `POST /api/v1/admin/quests` - Create new quest
- `POST /api/v1/admin/quests/{id}/resolve` - End quest and pick winners
- `POST /api/v1/admin/quests/{id}/cancel` - Cancel quest

This separation ensures security while maintaining user control over their wallets and transactions.