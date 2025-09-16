# Migração para Stellar Wallets Kit

## Visão Geral

Este documento descreve a migração do sistema de autenticação Apollo Quest Manager de Kale Passkey-Kit para o Stellar Wallets Kit. Essa migração permite que os usuários se conectem e interajam com o sistema usando várias carteiras Stellar, incluindo Albedo, Freighter, xBull, Rabet, WalletConnect, entre outras.

## Arquivos Modificados/Criados

1. **Modelos**
   - `src/models/auth.ts`: Adicionadas interfaces para Stellar Wallets Kit

2. **Serviços**
   - `src/services/stellarWalletService.ts`: Implementação do serviço para Stellar Wallets Kit

3. **Controladores**
   - `src/controllers/authControllerWallet.ts`: Novo controlador para carteiras Stellar

4. **Rotas**
   - `src/routes/walletRoutes.ts`: Novas rotas para carteiras Stellar
   - `src/routes/index.ts`: Atualizado para incluir as novas rotas de carteira

5. **Configuração**
   - `src/config/index.ts`: Adicionadas configurações para Stellar Wallets Kit
   - `.env.example`: Atualizado com novos parâmetros de configuração

## Novas Funcionalidades

### Conexão com Carteiras Stellar

O sistema agora suporta conexão com diferentes tipos de carteiras Stellar:

- Albedo
- Freighter
- xBull
- Rabet
- WalletConnect
- Carteiras de hardware (Ledger, Trezor)
- Outras carteiras compatíveis com o Stellar Wallets Kit

### Endpoints

#### Autenticação
- `POST /auth/wallet/connect`: Conectar a uma carteira Stellar
- `POST /auth/wallet/disconnect`: Desconectar de uma carteira Stellar

#### Transações
- `POST /auth/wallet/quest/:questId/register`: Registrar para uma quest usando carteira Stellar
- `POST /auth/wallet/quest/:questId/claim-rewards`: Reivindicar recompensas usando carteira Stellar

#### Informações
- `GET /auth/wallet/supported`: Obter carteiras suportadas
- `GET /auth/wallet/health`: Verificar a saúde do serviço de carteira
- `GET /auth/wallet/info`: Obter informações sobre o serviço de carteira

## Como Configurar

1. Atualize seu arquivo `.env` com base no `.env.example` fornecido
2. Obtenha um Project ID do WalletConnect (para suporte a WalletConnect): https://cloud.walletconnect.com/
3. Configure a URL e ícones do seu aplicativo para exibição nas carteiras

## Como Usar

### Conectar a uma Carteira

```typescript
// Exemplo de chamada para conectar a uma carteira Freighter
const response = await fetch('/api/v1/auth/wallet/connect', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    walletType: 'freighter',
    userName: 'Usuário Exemplo'
  })
});

const result = await response.json();
```

### Executar uma Transação

```typescript
// Exemplo de chamada para registrar para uma quest
const response = await fetch(`/api/v1/auth/wallet/quest/123/register`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    publicKey: 'G...'
  })
});

const result = await response.json();
```

## Considerações de Segurança

- Todos os tokens JWT gerados durante a conexão com carteira têm validade limitada (24h por padrão)
- As carteiras nunca expõem a chave privada do usuário para o sistema
- Todas as transações exigem assinatura explícita do usuário através da interface da carteira
- As conexões com as carteiras são estabelecidas através de canais seguros
- Os dados sensíveis não são armazenados no servidor

## Legado e Compatibilidade

- Os endpoints do Kale Passkey-Kit são mantidos para compatibilidade, mas estão marcados como obsoletos
- Recomenda-se migrar todas as integrações existentes para o novo sistema de carteira Stellar

## Próximos Passos

- Implementar armazenamento persistente para as informações de usuário e sessão
- Adicionar suporte a operações em lote com uma única assinatura
- Expandir o suporte para operações específicas do Soroban
- Melhorar a documentação e guias de integração para desenvolvedores frontend