import { verificarQuest, verificarQuestDetalhada } from './utils/questVerification';
import { QuestType } from './models/quest';
import { Logger } from './utils/logger';

/**
 * Teste simples da função de verificação de quest
 */
async function testeVerificacaoQuest() {
  const user_address = "GDQVUCDWEYLVL7HF6F7LYMK6LZCR6MWJNWGWI2K2JPFEXJXBMJWQZQHA";
  const periodo = {
    start_time: Math.floor(Date.now() / 1000) - 86400 * 7, // 7 dias atrás
    end_time: Math.floor(Date.now() / 1000) // agora
  };
  const valor = "400"; // 400 XLM (valor que deve passar no teste)
  const token = "XLM";
  
  try {
    Logger.info("Iniciando teste de verificação de quest");
    
    // Teste básico - função simples
    const resultado = await verificarQuest(
      user_address,
      periodo,
      valor,
      token
    );
    
    Logger.info(`Resultado da verificação simples: ${resultado ? 'QUEST COMPLETADA' : 'QUEST NÃO COMPLETADA'}`);
    
    // Teste detalhado
    const resultadoDetalhado = await verificarQuestDetalhada(
      user_address,
      periodo,
      valor,
      token,
      QuestType.TRADING_VOLUME
    );
    
    Logger.info(`Resultado detalhado:`, resultadoDetalhado);
    
    return resultado;
  } catch (error) {
    Logger.error("Erro no teste:", error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

// Exportar para uso
export { testeVerificacaoQuest };
