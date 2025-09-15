import { Request } from 'express';
import { JwtPayload } from '../utils/auth';

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

export interface CreateQuestRequest {
  title: string;
  description: string;
  reward_token: string;
  reward_amount: string;
  max_participants: number;
  start_time: number;
  end_time: number;
  quest_type: string;
  conditions: Record<string, any>;
}

export interface RegisterUserRequest {
  user_address: string;
}

export interface MarkEligibleRequest {
  user_address: string;
  performance_data?: Record<string, any>;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface QuestFilters extends PaginationQuery {
  status?: string;
  quest_type?: string;
  creator?: string;
  min_reward?: string;
  max_reward?: string;
}