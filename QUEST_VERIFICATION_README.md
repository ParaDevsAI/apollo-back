# Quest Verification Service

Este serviço implementa uma função robusta para verificar se um usuário completou uma quest baseada em parâmetros específicos.

## Função Principal

```typescript
async function verifyUserQuestCompletion(
  user_address: string,
  periodo: { start_time: number; end_time: number },
  valor: string,
  token: string,
  quest_type?: QuestType,
  conditions?: QuestConditions
): Promise<boolean>
```

### Parâmetros

- **`user_address`**: Endereço Stellar do usuário (formato: G...)
- **`periodo`**: Período da quest
  - `start_time`: Timestamp de início (Unix timestamp)
  - `end_time`: Timestamp de fim (Unix timestamp)
- **`valor`**: Quantidade/valor requerido (como string para suportar números grandes)
- **`token`**: Token envolvido na quest (ex: "XLM", "USDC", "token_code:issuer_address")
- **`quest_type`**: Tipo da quest (opcional, padrão: TRADING_VOLUME)
- **`conditions`**: Condições adicionais (opcional)

### Tipos de Quest Suportados

#### 1. TRADING_VOLUME
Verifica se o usuário fez um volume mínimo de trading no período especificado.

```typescript
const completed = await verifyUserQuestCompletion(
  "GDQVUCDWEYLVL7HF6F7LYMK6LZCR6MWJNWGWI2K2JPFEXJXBMJWQZQHA",
  {
    start_time: 1694908800, // 17 de setembro de 2023
    end_time: 1695513600    // 24 de setembro de 2023
  },
  "1000", // 1000 XLM de volume
  "XLM",
  QuestType.TRADING_VOLUME
);
```

#### 2. TOKEN_HOLDING
Verifica se o usuário possui uma quantidade mínima do token especificado.

```typescript
const completed = await verifyUserQuestCompletion(
  "GDQVUCDWEYLVL7HF6F7LYMK6LZCR6MWJNWGWI2K2JPFEXJXBMJWQZQHA",
  {
    start_time: 1694908800,
    end_time: 1695513600
  },
  "500", // 500 XLM em holding
  "XLM",
  QuestType.TOKEN_HOLDING
);
```

#### 3. LIQUIDITY_PROVISION
Verifica se o usuário forneceu uma quantidade mínima de liquidez em pools.

```typescript
const completed = await verifyUserQuestCompletion(
  "GDQVUCDWEYLVL7HF6F7LYMK6LZCR6MWJNWGWI2K2JPFEXJXBMJWQZQHA",
  {
    start_time: 1694908800,
    end_time: 1695513600
  },
  "200", // 200 XLM em liquidez
  "XLM",
  QuestType.LIQUIDITY_PROVISION
);
```

#### 4. CUSTOM
Quest customizada baseada em condições específicas.

```typescript
const completed = await verifyUserQuestCompletion(
  "GDQVUCDWEYLVL7HF6F7LYMK6LZCR6MWJNWGWI2K2JPFEXJXBMJWQZQHA",
  {
    start_time: 1694908800,
    end_time: 1695513600
  },
  "0", // valor não relevante
  "XLM",
  QuestType.CUSTOM,
  {
    custom_conditions: {
      min_transactions: 10, // mínimo 10 transações
      min_unique_tokens: 5  // interação com 5 tokens diferentes
    }
  }
);
```

## Uso Avançado

### Verificação Detalhada
Para obter mais detalhes sobre a verificação, use diretamente a classe `QuestVerificationService`:

```typescript
import { QuestVerificationService } from '../services/questVerificationService';

const service = new QuestVerificationService();
const result = await service.verifyQuestCompletion({
  user_address: "GDQVUCDWEYLVL7HF6F7LYMK6LZCR6MWJNWGWI2K2JPFEXJXBMJWQZQHA",
  periodo: { start_time: 1694908800, end_time: 1695513600 },
  valor: "1000",
  token: "XLM",
  quest_type: QuestType.TRADING_VOLUME
});

if (result.success) {
  console.log(`Quest completed: ${result.completed}`);
  console.log(`Details:`, result.details);
} else {
  console.log(`Error: ${result.error}`);
}
```

### Verificação de Múltiplas Quests

```typescript
import { verificarTodasAsQuests } from '../examples/questVerificationExample';

const results = await verificarTodasAsQuests("GDQVUCDWEYLVL7HF6F7LYMK6LZCR6MWJNWGWI2K2JPFEXJXBMJWQZQHA");
console.log('Trading:', results.trading);
console.log('Holding:', results.holding);
console.log('Liquidity:', results.liquidity);
console.log('Custom:', results.custom);
```

## Formato de Tokens

- **XLM nativo**: Use `"XLM"` ou `"native"`
- **Outros tokens**: Use `"ASSET_CODE"` ou `"ASSET_CODE:ISSUER_ADDRESS"`

Exemplos:
- `"XLM"` - Stellar Lumens nativo
- `"USDC"` - USDC (busca pelo código do asset)
- `"USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN"` - USDC específico do emissor

## Timestamps

Use Unix timestamps (segundos desde 1970-01-01):

```typescript
const agora = Math.floor(Date.now() / 1000);
const seteDiasAtras = agora - (7 * 24 * 60 * 60);

const periodo = {
  start_time: seteDiasAtras,
  end_time: agora
};
```

## Resposta

A função retorna um `Promise<boolean>`:
- `true`: Quest foi completada com sucesso
- `false`: Quest não foi completada ou houve erro na verificação

## Logs

Todas as operações são logadas usando o sistema de logging do projeto. Verifique os logs para detalhes sobre:
- Início da verificação
- Progresso da análise
- Resultados da verificação
- Erros encontrados

## Tratamento de Erros

A função é robusta e trata diversos tipos de erro:
- Endereços inválidos
- Contas não encontradas
- Problemas de conectividade
- Tipos de quest não suportados
- Condições customizadas mal formatadas

Em caso de erro, a função retorna `false` e registra o erro nos logs.
