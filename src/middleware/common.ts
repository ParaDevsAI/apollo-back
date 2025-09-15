import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { Logger } from '../utils/logger';
import { ResponseHelper } from '../utils/response';
import config from '../config';

// Rate limiting middleware
export const rateLimiter = rateLimit({
  windowMs: config.rateLimitWindow,
  max: config.rateLimitMax,
  message: {
    success: false,
    error: 'Too many requests, please try again later',
    timestamp: new Date().toISOString()
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Error handling middleware
export const errorHandler = (error: Error, req: Request, res: Response, next: NextFunction): void => {
  Logger.error('Unhandled error', error);
  
  if (res.headersSent) {
    return next(error);
  }
  
  ResponseHelper.internalError(res, 'An unexpected error occurred');
};

// Request logging middleware
export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    Logger.info(`${req.method} ${req.originalUrl}`, {
      status: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });
  });
  
  next();
};

// 404 handler
export const notFoundHandler = (req: Request, res: Response): void => {
  ResponseHelper.notFound(res, `Route ${req.originalUrl} not found`);
};