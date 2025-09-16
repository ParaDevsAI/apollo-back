import { ResponseHelper } from '../utils/response';
export class HealthController {
    static async check(req, res) {
        try {
            ResponseHelper.success(res, {
                status: 'ok',
                timestamp: new Date().toISOString(),
                uptime: process.uptime()
            }, 'Apollo Backend is running');
        }
        catch (error) {
            console.error('Health check error:', error);
            ResponseHelper.error(res, 'Health check failed', 500);
        }
    }
    static async detailedCheck(req, res) {
        try {
            const healthData = {
                status: 'ok',
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                version: process.version,
                services: {
                    questManager: 'ok', // Mock service check
                    stellarNetwork: 'ok' // Mock service check
                }
            };
            ResponseHelper.success(res, healthData, 'Detailed health check');
        }
        catch (error) {
            console.error('Detailed health check error:', error);
            ResponseHelper.error(res, 'Health check failed', 500);
        }
    }
}
//# sourceMappingURL=healthController.js.map