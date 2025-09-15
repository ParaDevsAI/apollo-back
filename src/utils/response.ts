import { Response } from 'express';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  timestamp: string;
}

export class ResponseHelper {
  static success<T>(res: Response, data: T, message?: string): Response {
    const response: ApiResponse<T> = {
      success: true,
      data,
      message,
      timestamp: new Date().toISOString(),
    };
    return res.json(response);
  }

  static error(res: Response, error: string, statusCode = 400): Response {
    const response: ApiResponse = {
      success: false,
      error,
      timestamp: new Date().toISOString(),
    };
    return res.status(statusCode).json(response);
  }

  static notFound(res: Response, message = 'Resource not found'): Response {
    return this.error(res, message, 404);
  }

  static unauthorized(res: Response, message = 'Unauthorized'): Response {
    return this.error(res, message, 401);
  }

  static forbidden(res: Response, message = 'Forbidden'): Response {
    return this.error(res, message, 403);
  }

  static internalError(res: Response, message = 'Internal server error'): Response {
    return this.error(res, message, 500);
  }
}