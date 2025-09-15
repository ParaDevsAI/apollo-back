# 🔐 Apollo Passkey Authentication

Documentação completa da implementação de autenticação com **Passkeys + Mercury/Zephyr** no Apollo Backend.

## 📋 **Visão Geral**

O Apollo Backend agora suporta autenticação moderna com **Passkeys** (WebAuthn) integrado ao **Mercury** para criação de Smart Wallets e **Zephyr** para transações gasless, proporcionando uma experiência de usuário superior sem necessidade de carteiras tradicionais ou gerenciamento manual de chaves privadas.

### **🎯 Benefícios**

- ✅ **Login Biométrico** - Face ID, Touch ID, Windows Hello
- ✅ **Zero Chaves Privadas** - Usuários nunca veem ou gerenciam chaves
- ✅ **Smart Wallets** - Contratos inteligentes como identidade
- ✅ **Transações Gasless** - Interações automáticas via Zephyr
- ✅ **Multi-Device** - Funciona em web, mobile, desktop
- ✅ **Segurança Máxima** - Padrão WebAuthn + Stellar

---

## 🏗️ **Arquitetura**

```
Frontend (WebAuthn) → Apollo Backend → Mercury API → Stellar Network
                                    ↓
                               Zephyr Sessions → Smart Contract Calls
```

### **Componentes**

1. **Mercury** - Gerencia passkeys e cria Smart Wallets
2. **Zephyr** - Executa transações sem assinaturas manuais
3. **Apollo Backend** - Orquestra o fluxo e APIs REST
4. **Smart Wallets** - Contratos Stellar que representam usuários

---

## 🚀 **Fluxo de Registro (Primeira Vez)**

### **1. Frontend: Iniciar Registro**

```javascript
// 1. Solicitar opções de registro
const response = await fetch('/auth/passkey/register/init', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userIdentifier: 'usuario@exemplo.com'
  })
});

const { data } = await response.json();
// data.registrationOptions = WebAuthn options
// data.sessionId = session para completar registro
```

### **2. Frontend: Criar Credencial**

```javascript
// 2. Usar WebAuthn para criar passkey
const credential = await navigator.credentials.create({
  publicKey: data.registrationOptions
});

// 3. Preparar resposta
const passkeyResponse = {
  credentialId: credential.id,
  clientDataJSON: btoa(String.fromCharCode(...new Uint8Array(credential.response.clientDataJSON))),
  authenticatorData: btoa(String.fromCharCode(...new Uint8Array(credential.response.authenticatorData))),
  signature: btoa(String.fromCharCode(...new Uint8Array(credential.response.signature)))
};
```

### **3. Frontend: Completar Registro**

```javascript
// 4. Finalizar registro no backend
const completeResponse = await fetch('/auth/passkey/register/complete', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    sessionId: data.sessionId,
    passkeyResponse
  })
});

const registrationResult = await completeResponse.json();
```

### **4. Backend: Resposta do Registro**

```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "stellarAddress": "GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
      "publicKey": "GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX", 
      "contractAddress": "CXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
      "credentialId": "credential_abc123",
      "authMethod": "passkey"
    },
    "instructions": {
      "message": "Passkey registered successfully! Your Smart Wallet is ready.",
      "contractAddress": "CXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
      "nextSteps": [
        "Save your contract address safely",
        "Use your passkey for future logins", 
        "Start participating in quests!"
      ],
      "capabilities": ["quest_participation", "reward_claims", "profile_management"]
    }
  },
  "message": "Passkey registration completed successfully"
}
```

---

## 🔑 **Fluxo de Login (Retorno)**

### **1. Frontend: Obter Challenge**

```javascript
// 1. Solicitar challenge (opcional: com contractAddress salvo)
const contractAddress = localStorage.getItem('apollo_contract');
const challengeResponse = await fetch(`/auth/passkey/challenge?contractAddress=${contractAddress}`);
const { data } = await challengeResponse.json();
```

### **2. Frontend: Autenticar**

```javascript
// 2. Usar WebAuthn para autenticar
const assertion = await navigator.credentials.get({
  publicKey: {
    challenge: Uint8Array.from(atob(data.challenge), c => c.charCodeAt(0)),
    timeout: data.options.timeout,
    userVerification: data.options.userVerification
  }
});

// 3. Preparar resposta de autenticação
const passkeyResponse = {
  credentialId: assertion.id,
  clientDataJSON: btoa(String.fromCharCode(...new Uint8Array(assertion.response.clientDataJSON))),
  authenticatorData: btoa(String.fromCharCode(...new Uint8Array(assertion.response.authenticatorData))),
  signature: btoa(String.fromCharCode(...new Uint8Array(assertion.response.signature)))
};
```

### **3. Frontend: Fazer Login**

```javascript
// 4. Executar login
const loginResponse = await fetch('/auth/passkey/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    passkeyResponse,
    contractAddress
  })
});

const loginResult = await loginResponse.json();
```

### **4. Backend: Resposta do Login**

```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "stellarAddress": "GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
      "publicKey": "GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
      "contractAddress": "CXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX", 
      "authMethod": "passkey"
    },
    "session": {
      "sessionId": "zephyr_session_xyz789",
      "expiresAt": "2025-09-15T16:30:00Z",
      "capabilities": ["quest_interaction", "reward_claim", "profile_update"]
    },
    "instructions": {
      "message": "Login successful! You can now interact with Apollo quests.",
      "sessionDuration": "1 hour",
      "availableActions": [
        "Register for quests without manual signatures",
        "Claim rewards automatically", 
        "View your profile and statistics"
      ]
    }
  },
  "message": "Passkey login successful"
}
```

---

## ⚡ **Transações Gasless via Zephyr**

### **1. Registro em Quest (Sem Assinaturas)**

```javascript
// Frontend: Registrar em quest usando sessão Zephyr
const questId = 1;
const sessionId = loginResult.data.session.sessionId;

const registerResponse = await fetch(`/auth/passkey/quest/${questId}/register`, {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${loginResult.data.token}`
  },
  body: JSON.stringify({ sessionId })
});

const registerResult = await registerResponse.json();
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "registered": true,
    "questId": 1,
    "transactionHash": "abc123def456...",
    "instructions": {
      "message": "Successfully registered for quest via Smart Wallet!",
      "benefit": "No manual signature required - seamless interaction",
      "nextSteps": [
        "Complete quest requirements",
        "Check quest progress in your profile",
        "Claim rewards when eligible"
      ]
    }
  }
}
```

### **2. Reivindicar Recompensas (Automático)**

```javascript
// Frontend: Claim rewards automaticamente
const claimResponse = await fetch(`/auth/passkey/quest/${questId}/claim-rewards`, {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({ sessionId })
});
```

---

## 🛠️ **Endpoints da API**

### **Registro de Passkey**

| Endpoint | Método | Descrição |
|----------|---------|-----------|
| `/auth/passkey/register/init` | POST | Inicia registro de passkey |
| `/auth/passkey/register/complete` | POST | Completa registro e cria Smart Wallet |

### **Autenticação**

| Endpoint | Método | Descrição |
|----------|---------|-----------|
| `/auth/passkey/challenge` | GET | Gera challenge para login |
| `/auth/passkey/login` | POST | Autentica com passkey + cria sessão Zephyr |

### **Transações Gasless**

| Endpoint | Método | Descrição |
|----------|---------|-----------|
| `/auth/passkey/quest/:id/register` | POST | Registra em quest via Zephyr |
| `/auth/passkey/quest/:id/claim-rewards` | POST | Reivindica recompensas via Zephyr |

### **Gerenciamento de Sessão**

| Endpoint | Método | Descrição |
|----------|---------|-----------|
| `/auth/session/validate` | GET | Valida sessão Zephyr ativa |

### **Informações**

| Endpoint | Método | Descrição |
|----------|---------|-----------|
| `/auth/info` | GET | Info sobre métodos de auth disponíveis |
| `/auth/health` | GET | Health check dos serviços de auth |

---

## 📝 **Exemplo Completo de Implementação**

### **Classe JavaScript para Frontend**

```javascript
class ApolloPasskeyAuth {
  constructor(apiUrl) {
    this.apiUrl = apiUrl;
    this.token = localStorage.getItem('apollo_token');
    this.contractAddress = localStorage.getItem('apollo_contract');
    this.sessionId = localStorage.getItem('apollo_session');
  }

  // Registrar nova passkey
  async register(userIdentifier) {
    try {
      // 1. Iniciar registro
      const initResponse = await fetch(`${this.apiUrl}/auth/passkey/register/init`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIdentifier })
      });

      const initData = await initResponse.json();
      if (!initData.success) throw new Error(initData.message);

      // 2. Criar credencial WebAuthn
      const credential = await navigator.credentials.create({
        publicKey: initData.data.registrationOptions
      });

      // 3. Preparar resposta
      const passkeyResponse = this._formatCredentialResponse(credential);

      // 4. Completar registro
      const completeResponse = await fetch(`${this.apiUrl}/auth/passkey/register/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: initData.data.sessionId,
          passkeyResponse
        })
      });

      const result = await completeResponse.json();
      if (!result.success) throw new Error(result.message);

      // 5. Salvar dados
      this._saveAuthData(result.data);
      return result.data;

    } catch (error) {
      console.error('Registro falhou:', error);
      throw error;
    }
  }

  // Login com passkey
  async login(contractAddress = null) {
    try {
      // 1. Obter challenge
      const challengeUrl = `${this.apiUrl}/auth/passkey/challenge${contractAddress ? `?contractAddress=${contractAddress}` : ''}`;
      const challengeResponse = await fetch(challengeUrl);
      const challengeData = await challengeResponse.json();

      if (!challengeData.success) throw new Error(challengeData.message);

      // 2. Autenticar WebAuthn
      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge: Uint8Array.from(atob(challengeData.data.challenge), c => c.charCodeAt(0)),
          timeout: challengeData.data.options.timeout,
          userVerification: challengeData.data.options.userVerification
        }
      });

      // 3. Preparar resposta
      const passkeyResponse = this._formatAssertionResponse(assertion);

      // 4. Fazer login
      const loginResponse = await fetch(`${this.apiUrl}/auth/passkey/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          passkeyResponse,
          contractAddress
        })
      });

      const result = await loginResponse.json();
      if (!result.success) throw new Error(result.message);

      // 5. Salvar sessão
      this._saveAuthData(result.data);
      return result.data;

    } catch (error) {
      console.error('Login falhou:', error);
      throw error;
    }
  }

  // Registrar em quest (gasless)
  async registerForQuest(questId) {
    return await this._makeZephyrRequest(`/auth/passkey/quest/${questId}/register`, 'POST');
  }

  // Claim rewards (gasless)
  async claimRewards(questId) {
    return await this._makeZephyrRequest(`/auth/passkey/quest/${questId}/claim-rewards`, 'POST');
  }

  // Request com Zephyr
  async _makeZephyrRequest(endpoint, method = 'POST') {
    if (!this.token || !this.sessionId) {
      throw new Error('Usuário não autenticado ou sessão expirada');
    }

    const response = await fetch(`${this.apiUrl}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`
      },
      body: JSON.stringify({ sessionId: this.sessionId })
    });

    const result = await response.json();
    if (!result.success) throw new Error(result.message);
    
    return result.data;
  }

  // Formatar resposta da credencial
  _formatCredentialResponse(credential) {
    return {
      credentialId: credential.id,
      clientDataJSON: btoa(String.fromCharCode(...new Uint8Array(credential.response.clientDataJSON))),
      authenticatorData: btoa(String.fromCharCode(...new Uint8Array(credential.response.authenticatorData))),
      signature: btoa(String.fromCharCode(...new Uint8Array(credential.response.signature)))
    };
  }

  // Formatar resposta da assertion
  _formatAssertionResponse(assertion) {
    return {
      credentialId: assertion.id,
      clientDataJSON: btoa(String.fromCharCode(...new Uint8Array(assertion.response.clientDataJSON))),
      authenticatorData: btoa(String.fromCharCode(...new Uint8Array(assertion.response.authenticatorData))),
      signature: btoa(String.fromCharCode(...new Uint8Array(assertion.response.signature)))
    };
  }

  // Salvar dados de autenticação
  _saveAuthData(data) {
    localStorage.setItem('apollo_token', data.token);
    localStorage.setItem('apollo_contract', data.user.contractAddress);
    if (data.session) {
      localStorage.setItem('apollo_session', data.session.sessionId);
    }
    
    this.token = data.token;
    this.contractAddress = data.user.contractAddress;
    this.sessionId = data.session?.sessionId;
  }

  // Verificar se está logado
  isAuthenticated() {
    return !!(this.token && this.contractAddress);
  }

  // Fazer logout
  logout() {
    localStorage.removeItem('apollo_token');
    localStorage.removeItem('apollo_contract');
    localStorage.removeItem('apollo_session');
    
    this.token = null;
    this.contractAddress = null;
    this.sessionId = null;
  }
}

// Uso da classe
const apollo = new ApolloPasskeyAuth('http://localhost:3000');

// Registrar usuário
await apollo.register('usuario@exemplo.com');

// Login usuário
await apollo.login();

// Interagir com quests (gasless)
await apollo.registerForQuest(1);
await apollo.claimRewards(1);
```

---

## ⚙️ **Configuração do Backend**

### **Variáveis de Ambiente (.env)**

```env
# Mercury/Zephyr Configuration
MERCURY_API_URL=https://api.mercury.org
MERCURY_API_KEY=your_mercury_api_key_here
ZEPHYR_CONTRACT_ID=your_zephyr_contract_id_here
FRONTEND_DOMAIN=localhost

# Existing Apollo config...
CONTRACT_ID=your_quest_manager_contract_here
NETWORK_PASSPHRASE=Test SDF Network ; September 2015
RPC_URL=https://soroban-testnet.stellar.org:443
```

### **Instalação**

```bash
# Instalar dependências atualizadas
npm install

# Executar desenvolvimento
npm run dev

# Build para produção
npm run build && npm start
```

---

## 🔒 **Segurança e Boas Práticas**

### **No Frontend**

- ✅ Sempre validar suporte a WebAuthn: `navigator.credentials`
- ✅ Tratar erros de autenticação graciosamente
- ✅ Implementar fallback para carteiras tradicionais
- ✅ Não armazenar dados sensíveis além do necessário

### **No Backend**

- ✅ Validar todas as entradas de passkey
- ✅ Verificar sessões Zephyr antes de transações
- ✅ Implementar rate limiting nos endpoints de auth
- ✅ Logs de auditoria para todas as operações

### **Mercury/Zephyr**

- ✅ Rotacionar chaves de API regularmente
- ✅ Monitorar uso de API e limites
- ✅ Configurar webhooks para notificações
- ✅ Backup de configurações críticas

---

## 📊 **Monitoramento e Debugging**

### **Health Checks**

```bash
# Verificar saúde da autenticação
curl http://localhost:3000/auth/health

# Validar sessão Zephyr
curl "http://localhost:3000/auth/session/validate?sessionId=xyz"
```

### **Logs Importantes**

```bash
# Registros de passkey
[INFO] Passkey registration initiated for user: usuario@exemplo.com
[INFO] Passkey registration completed. Contract: CXXXXX...

# Autenticação
[INFO] Passkey authentication successful for contract: CXXXXX...
[INFO] Zephyr session created successfully

# Transações
[INFO] Zephyr transaction executed successfully
[INFO] Quest registration completed via Zephyr
```

---

## 🚀 **Próximos Passos**

1. **Teste a implementação** com dispositivos diferentes
2. **Configure Mercury/Zephyr** com suas chaves de API  
3. **Implemente fallbacks** para carteiras tradicionais
4. **Monitore performance** das chamadas de API
5. **Documente** para sua equipe de frontend

---

**A autenticação com Passkeys está pronta no Apollo! 🎉**

Agora seus usuários podem participar de quests usando apenas biometria, sem nunca precisar gerenciar chaves privadas ou assinar transações manualmente.