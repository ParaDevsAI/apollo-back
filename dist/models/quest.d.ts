export declare enum DistributionType {
    RAFFLE = "Raffle",
    FCFS = "Fcfs"
}
export interface QuestType {
    type: 'TradeVolume' | 'PoolPosition' | 'TokenHold';
    value?: string;
    tokenAddress?: string;
    amount?: string;
}
export interface Quest {
    id: string;
    admin: string;
    reward_token: string;
    reward_per_winner: string;
    max_winners: number;
    distribution: DistributionType;
    quest_type: QuestType;
    end_timestamp: number;
    is_active: boolean;
    total_reward_pool: string;
    title: string;
    description: string;
}
export interface QuestStats {
    quest_id: string;
    total_participants: number;
    eligible_participants: number;
    total_winners: number;
    total_rewards_distributed: string;
    is_active: boolean;
    is_resolved: boolean;
}
export interface UserStats {
    user_address: string;
    total_quests_participated: number;
    total_quests_won: number;
    total_rewards_earned: string;
    active_quests: number;
}
export interface CreateQuestRequest {
    title: string;
    description: string;
    reward_token: string;
    reward_per_winner: string;
    max_winners: number;
    distribution: DistributionType;
    quest_type: QuestType;
    end_timestamp: number;
    total_reward_pool: string;
}
export interface QuestParticipant {
    quest_id: string;
    user_address: string;
    is_eligible: boolean;
    is_winner?: boolean;
    registered_at: number;
}
//# sourceMappingURL=quest.d.ts.map