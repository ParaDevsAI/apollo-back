// Quest Verification Service - Versão Simplificada
import { Logger } from '../utils/logger';
import { QuestType, QuestConditions } from '../models/quest';

/**
 * Função que recebe user_address, periodo, valor, token e retorna true ou false
 * @param user_address Endereço do usuário (formato Stellar G...)
 * @param periodo Objeto com start_time e end_time (timestamps Unix)
 * @param valor Quantidade/valor requerido como string
 * @param token Token envolvido (ex: "XLM", "USDC")
 * @returns Promise<boolean> - true se quest completada, false caso contrário
 */
export async function verificarQuest(
  user_address: string,
  periodo: { start_time: number; end_time: number },
  valor: string,
  token: string
): Promise<boolean> {
  try {
    Logger.info('Verificando quest', {
      user_address,
      periodo,
      valor,
      token
    });

    // Validação básica do endereço Stellar
    if (!user_address || !/^G[A-Z0-9]{55}$/.test(user_address)) {
      Logger.error('Endereço inválido', new Error(`Invalid address: ${user_address}`));
      return false;
    }

    // Validação do período
    if (!periodo || periodo.start_time >= periodo.end_time) {
      Logger.error('Período inválido', new Error('Invalid time period'));
      return false;
    }

    // Validação do valor
    const valorNumerico = parseFloat(valor);
    if (isNaN(valorNumerico) || valorNumerico <= 0) {
      Logger.error('Valor inválido', new Error(`Invalid value: ${valor}`));
      return false;
    }

    // Simulação da verificação baseada no token
    // Por enquanto, retornamos true para XLM com valor menor que 500
    // e false para valores maiores (simulando que nem todos completaram)
    let questCompletada = false;

    switch (token.toUpperCase()) {
      case 'XLM':
      case 'NATIVE':
        // Simular que usuários conseguiram fazer volume até 500 XLM
        questCompletada = valorNumerico <= 500;
        break;
      
      case 'USDC':
        // Simular que USDC tem mais volume disponível
        questCompletada = valorNumerico <= 1000;
        break;
      
      default:
        // Para outros tokens, simular 50% de chance
        questCompletada = Math.random() > 0.5;
        break;
    }

    Logger.info('Quest verificada', {
      user_address,
      token,
      valor_requerido: valorNumerico,
      completada: questCompletada
    });

    return questCompletada;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    Logger.error('Erro ao verificar quest', new Error(errorMessage));
    return false;
  }
}

/**
 * Versão mais detalhada que suporta diferentes tipos de quest
 */
export async function verificarQuestDetalhada(
  user_address: string,
  periodo: { start_time: number; end_time: number },
  valor: string,
  token: string,
  quest_type: QuestType = QuestType.TRADING_VOLUME,
  conditions?: QuestConditions
): Promise<{
  completed: boolean;
  details: {
    user_address: string;
    quest_type: QuestType;
    valor_verificado: string;
    timestamp: number;
  };
}> {
  try {
    const questCompletada = await verificarQuest(user_address, periodo, valor, token);
    
    return {
      completed: questCompletada,
      details: {
        user_address,
        quest_type,
        valor_verificado: valor,
        timestamp: Math.floor(Date.now() / 1000)
      }
    };
  } catch (error) {
    Logger.error('Erro na verificação detalhada', error instanceof Error ? error : new Error(String(error)));
    return {
      completed: false,
      details: {
        user_address,
        quest_type,
        valor_verificado: valor,
        timestamp: Math.floor(Date.now() / 1000)
      }
    };
  }
}
