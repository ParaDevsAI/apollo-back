import { Request, Response } from 'express';
import { ResponseHelper } from '../utils/response';
import { Logger } from '../utils/logger';
import config from '../config';
import { HealthCheck } from '../models';

export class HealthController {
  async getHealth(req: Request, res: Response): Promise<Response> {
    try {
      Logger.debug('Health check requested');

      const healthCheck: HealthCheck = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
          database: true, // Mock - would check actual database connection
          soroban_rpc: true, // Mock - would check RPC connection
          contract: true, // Mock - would check contract accessibility
        },
        version: '1.0.0'
      };

      // Check if any service is unhealthy
      const isHealthy = Object.values(healthCheck.services).every(service => service);
      healthCheck.status = isHealthy ? 'healthy' : 'unhealthy';

      const statusCode = isHealthy ? 200 : 503;
      
      return res.status(statusCode).json(healthCheck);
    } catch (error) {
      Logger.error('Error in health check', error as Error);
      
      const healthCheck: HealthCheck = {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        services: {
          database: false,
          soroban_rpc: false,
          contract: false,
        },
        version: '1.0.0'
      };

      return res.status(503).json(healthCheck);
    }
  }

  async getInfo(req: Request, res: Response): Promise<Response> {
    try {
      const info = {
        name: 'Apollo Backend API',
        version: '1.0.0',
        network: config.networkPassphrase,
        contract_id: config.contractId,
        rpc_url: config.rpcUrl,
        api_prefix: config.apiPrefix,
        environment: config.nodeEnv
      };

      return ResponseHelper.success(res, info);
    } catch (error) {
      Logger.error('Error getting info', error as Error);
      return ResponseHelper.internalError(res);
    }
  }
}

export const healthController = new HealthController();