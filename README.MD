# Apollo Backend

Backend REST API para integração com o smart contract QuestManager no Soroban (Stellar).

## 📋 Funcionalidades

- **🔐 Autenticação Passkey**: Login biométrico com Kale passkey-kit
- **⚡ Smart Wallets**: Carteiras inteligentes na Stellar com assinatura via passkey
- **📝 Gestão de Quests**: Criar, listar, resolver e cancelar quests
- **👥 Gestão de Usuários**: Registro, elegibilidade e estatísticas
- **🌐 Integração Soroban**: Comunicação completa com o smart contract
- **🔒 Autenticação Múltipla**: JWT, Passkeys e Wallet tradicional
- **🛡️ Rate Limiting**: Proteção contra abuso da API
- **📊 Logs Estruturados**: Sistema de logging completo
- **💓 Health Checks**: Monitoramento de saúde da aplicação

## 🏗️ Arquitetura

```
src/
├── config/          # Configurações (Soroban, JWT, etc.)
├── controllers/     # Lógica das rotas REST
├── services/        # Integração com Soroban e lógica de negócio
├── models/          # Tipos e interfaces TypeScript
├── routes/          # Definição das rotas Express
├── utils/           # Funções auxiliares (logger, auth, etc.)
├── middleware/      # Middlewares customizados
└── index.ts         # Entrypoint do servidor
```

## 🚀 Instalação e Execução

### Pré-requisitos

- Node.js 18+ 
- npm ou yarn
- Conta Stellar testnet/mainnet configurada

### 1. Instalação das dependências

```bash
npm install
```

### 2. Configuração do ambiente

Copie o arquivo de exemplo e configure as variáveis:

```bash
cp .env.example .env
```

Edite o `.env` com suas configurações:

```env
# Stellar/Soroban Configuration
CONTRACT_ID=your_contract_id_here
NETWORK_PASSPHRASE=Test SDF Network ; September 2015
RPC_URL=https://soroban-testnet.stellar.org:443

# Admin Configuration
ADMIN_SECRET=your_admin_secret_key_here
ADMIN_PUBLIC_KEY=your_admin_public_key_here

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRATION=24h
```

### 3. Execução

#### Desenvolvimento
```bash
npm run dev
```

#### Produção
```bash
npm run build
npm start
```

## 📚 Rotas da API

### Quests

- `GET /api/v1/quests` - Lista todas as quests ativas
- `GET /api/v1/quests/:id` - Detalhes de uma quest específica
- `POST /api/v1/quests` - Cria uma nova quest (admin)
- `POST /api/v1/quests/:id/register` - Registra usuário em uma quest
- `POST /api/v1/quests/:id/eligible` - Marca usuário como elegível (admin)
- `POST /api/v1/quests/:id/resolve` - Resolve quest (admin)
- `POST /api/v1/quests/:id/cancel` - Cancela quest (admin)
- `GET /api/v1/quests/:id/participants` - Lista participantes da quest
- `POST /api/v1/quests/:id/distribute` - Distribui prêmios (admin)

### Usuários

- `GET /api/v1/users/:address/quests` - Quests do usuário
- `GET /api/v1/users/:address/stats` - Estatísticas do usuário

### 🔐 Autenticação Kale Passkey (NOVO!)

- `POST /auth/passkey/register` - Cria wallet com passkey usando Kale
- `POST /auth/passkey/connect` - Conecta a wallet existente com passkey
- `POST /auth/passkey/quest/:id/register` - Registro em quest com passkey
- `POST /auth/passkey/quest/:id/claim-rewards` - Claim de recompensas com passkey
- `GET /auth/signers/:contractId` - Lista signatários de um contrato wallet

### Sistema

- `GET /health` - Health check da aplicação
- `GET /api/v1/info` - Informações da API
- `GET /auth/info` - Info sobre métodos de autenticação
- `GET /auth/health` - Health check específico de autenticação

## 🔧 Exemplos de Uso

### Criar uma Quest (Admin)

```bash
curl -X POST http://localhost:3000/api/v1/quests \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_JWT" \
  -d '{
    "title": "Trading Volume Challenge",
    "description": "Trade minimum $1000 volume on DEX",
    "reward_token": "USDC",
    "reward_amount": "100",
    "max_participants": 50,
    "start_time": 1693843200,
    "end_time": 1694448000,
    "quest_type": "TRADING_VOLUME",
    "conditions": {
      "min_volume": "1000"
    }
  }'
```

### Registrar Usuário em Quest

```bash
curl -X POST http://localhost:3000/api/v1/quests/1/register \
  -H "Content-Type: application/json" \
  -d '{
    "user_address": "GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
  }'
```

### Listar Quests Ativas

```bash
curl http://localhost:3000/api/v1/quests?page=1&limit=10&status=ACTIVE
```

## 🛡️ Segurança

- **Autenticação JWT**: Protege rotas administrativas
- **Rate Limiting**: Previne abuso da API
- **Helmet**: Headers de segurança HTTP
- **CORS**: Configuração flexível de origens
- **Validação**: Validação rigorosa de inputs

## 🔧 Scripts Disponíveis

```bash
npm run dev          # Executa em modo desenvolvimento
npm run build        # Compila TypeScript
npm start            # Executa versão compilada
npm test             # Executa testes
npm run lint         # Executa linting
npm run lint:fix     # Corrige problemas de lint
```

## 📊 Monitoramento

### Health Check

```bash
curl http://localhost:3000/health
```

Resposta:
```json
{
  "status": "healthy",
  "timestamp": "2024-09-15T10:30:00.000Z",
  "services": {
    "database": true,
    "soroban_rpc": true,
    "contract": true
  },
  "version": "1.0.0"
}
```

## 🧪 Testes

```bash
# Executar todos os testes
npm test

# Executar com coverage
npm run test:coverage

# Executar em modo watch
npm run test:watch
```

## 🚢 Deploy

### Docker (Recomendado)

1. Criar `Dockerfile`:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
EXPOSE 3000
CMD ["npm", "start"]
```

2. Build e run:
```bash
docker build -t apollo-backend .
docker run -p 3000:3000 --env-file .env apollo-backend
```

### Deploy Tradicional

1. Build da aplicação:
```bash
npm run build
```

2. Upload dos arquivos `dist/`, `package.json` e `.env`

3. Instalar dependências no servidor:
```bash
npm ci --only=production
```

4. Iniciar aplicação:
```bash
npm start
```

## 🤝 Contribuição

1. Fork do projeto
2. Criar branch (`git checkout -b feature/AmazingFeature`)
3. Commit das mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push da branch (`git push origin feature/AmazingFeature`)
5. Abrir Pull Request

## 📄 Licença

Este projeto está licenciado sob a Licença MIT - veja o arquivo [LICENSE](LICENSE) para detalhes.

## 📞 Suporte

Para suporte e dúvidas:
- Abra uma issue no GitHub
- Entre em contato com a equipe Apollo

---

**Desenvolvido com ❤️ pela equipe Apollo**