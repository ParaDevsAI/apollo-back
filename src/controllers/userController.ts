import { Request, Response } from 'express';
import { userService } from '../services';
import { ResponseHelper } from '../utils/response';
import { Logger } from '../utils/logger';
import { PaginationQuery } from '../models';

export class UserController {
  async getUserQuests(req: Request, res: Response): Promise<Response> {
    try {
      const address = req.params.address;
      if (!address) {
        return ResponseHelper.error(res, 'User address is required', 400);
      }

      const isValidAddress = await userService.validateUserAddress(address);
      if (!isValidAddress) {
        return ResponseHelper.error(res, 'Invalid user address', 400);
      }

      Logger.debug('Getting user quests', { address });

      const result = await userService.getUserQuests(address);

      if (result.success) {
        return ResponseHelper.success(res, { quests: result.result });
      } else {
        return ResponseHelper.error(res, result.error || 'Failed to get user quests');
      }
    } catch (error) {
      Logger.error('Error in getUserQuests controller', error as Error);
      return ResponseHelper.internalError(res);
    }
  }

  async getUserStats(req: Request, res: Response): Promise<Response> {
    try {
      const address = req.params.address;
      if (!address) {
        return ResponseHelper.error(res, 'User address is required', 400);
      }

      const isValidAddress = await userService.validateUserAddress(address);
      if (!isValidAddress) {
        return ResponseHelper.error(res, 'Invalid user address', 400);
      }

      Logger.debug('Getting user stats', { address });

      const result = await userService.getUserStats(address);

      if (result.success) {
        return ResponseHelper.success(res, result.result);
      } else {
        return ResponseHelper.error(res, result.error || 'Failed to get user stats');
      }
    } catch (error) {
      Logger.error('Error in getUserStats controller', error as Error);
      return ResponseHelper.internalError(res);
    }
  }
}

export const userController = new UserController();