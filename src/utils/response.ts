import { Response } from 'express';
import { ValidationError } from 'express-validator';
import { ApiResponse } from '../models/request.js';

export class ResponseHelper {
  static success<T>(res: Response, data: T, message?: string): Response {
    const response: ApiResponse<T> = {
      success: true,
      data,
      message
    };
    return res.status(200).json(response);
  }

  static error(res: Response, message: string, statusCode: number = 400): Response {
    const response: ApiResponse = {
      success: false,
      error: message
    };
    return res.status(statusCode).json(response);
  }

  static validationError(res: Response, errors: ValidationError[]): Response {
    const errorMessages = errors.map(error => {
      if (error.type === 'field') {
        return `${error.path}: ${error.msg}`;
      }
      return error.msg;
    }).join(', ');
    return this.error(res, `Dados inválidos: ${errorMessages}`, 422);
  }

  static unauthorized(res: Response, message: string = 'Unauthorized'): Response {
    return this.error(res, message, 401);
  }

  static forbidden(res: Response, message: string = 'Forbidden'): Response {
    return this.error(res, message, 403);
  }

  static notFound(res: Response, message: string = 'Not found'): Response {
    return this.error(res, message, 404);
  }

  static internalError(res: Response, message: string = 'Internal server error'): Response {
    return this.error(res, message, 500);
  }
}
