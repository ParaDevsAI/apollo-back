export interface Quest {
  id: number;
  title: string;
  description: string;
  creator: string;
  reward_token: string;
  reward_amount: string;
  max_participants: number;
  start_time: number;
  end_time: number;
  quest_type: QuestType;
  conditions: QuestConditions;
  status: QuestStatus;
  participants_count: number;
  winners_count: number;
}

export enum QuestStatus {
  ACTIVE = 'ACTIVE',
  RESOLVED = 'RESOLVED',
  CANCELLED = 'CANCELLED'
}

export enum QuestType {
  TRADING_VOLUME = 'TRADING_VOLUME',
  LIQUIDITY_PROVISION = 'LIQUIDITY_PROVISION',
  TOKEN_HOLDING = 'TOKEN_HOLDING',
  CUSTOM = 'CUSTOM'
}

export interface QuestConditions {
  min_volume?: string;
  min_liquidity?: string;
  min_holding_amount?: string;
  min_holding_duration?: number;
  target_tokens?: string[];
  custom_conditions?: Record<string, any>;
}

export interface QuestParticipant {
  quest_id: number;
  user_address: string;
  registered_at: number;
  is_eligible: boolean;
  eligibility_checked_at?: number;
  performance_data?: Record<string, any>;
}

export interface QuestWinner {
  quest_id: number;
  user_address: string;
  reward_amount: string;
  distributed_at: number;
}

export interface User {
  address: string;
  registration_date: number;
  total_quests_participated: number;
  total_quests_won: number;
  total_rewards_earned: string;
  reputation_score: number;
}

export interface UserStats {
  address: string;
  active_quests: number;
  completed_quests: number;
  win_rate: number;
  total_volume: string;
  total_liquidity_provided: string;
  favorite_tokens: string[];
}