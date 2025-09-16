import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

import config from './config';
import routes from './routes';
import { 
  rateLimiter, 
  errorHandler, 
  requestLogger, 
  notFoundHandler 
} from './middleware';
import { Logger } from './utils/logger';

// Load environment variables
dotenv.config();

class ApolloServer {
  private app: express.Application;

  constructor() {
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
    }));

    // CORS configuration
    this.app.use(cors({
      origin: config.corsOrigin,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization']
    }));

    // Request parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request logging
    if (config.nodeEnv !== 'test') {
      this.app.use(morgan('combined'));
      this.app.use(requestLogger);
    }

    // Rate limiting
    this.app.use(rateLimiter);
  }

  private setupRoutes(): void {
    // Health check (no API prefix)
    this.app.get('/health', (req, res) => {
      res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      });
    });

    // API routes
    this.app.use(config.apiPrefix, routes);

    // 404 handler
    this.app.use('*', notFoundHandler);
  }

  private setupErrorHandling(): void {
    // Global error handler
    this.app.use(errorHandler);
  }

  public async start(): Promise<void> {
    try {
      // Validate configuration
      if (!config.contractId) {
        throw new Error('CONTRACT_ID is required');
      }

      if (!config.adminSecret) {
        throw new Error('ADMIN_SECRET is required');
      }

      // Start server
      const server = this.app.listen(config.port, () => {
        Logger.info(`🚀 Apollo Backend Server started`, {
          port: config.port,
          environment: config.nodeEnv,
          network: config.networkPassphrase,
          api_prefix: config.apiPrefix,
          rpc_url: config.rpcUrl
        });

        Logger.info(`📚 API Documentation available at: http://localhost:${config.port}${config.apiPrefix}/info`);
        Logger.info(`💓 Health check available at: http://localhost:${config.port}/health`);
      });

      // Graceful shutdown
      process.on('SIGTERM', () => {
        Logger.info('SIGTERM received, shutting down gracefully');
        server.close(() => {
          Logger.info('Process terminated');
          process.exit(0);
        });
      });

      process.on('SIGINT', () => {
        Logger.info('SIGINT received, shutting down gracefully');
        server.close(() => {
          Logger.info('Process terminated');
          process.exit(0);
        });
      });

    } catch (error) {
      Logger.error('Failed to start server', error as Error);
      process.exit(1);
    }
  }

  public getApp(): express.Application {
    return this.app;
  }
}

// Start server if this file is run directly
if (require.main === module) {
  const server = new ApolloServer();
  server.start().catch((error) => {
    Logger.error('Server startup failed', error);
    process.exit(1);
  });
}

export default ApolloServer;
