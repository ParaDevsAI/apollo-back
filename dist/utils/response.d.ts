import { Response } from 'express';
import { ValidationError } from 'express-validator';
export declare class ResponseHelper {
    static success<T>(res: Response, data: T, message?: string): Response;
    static error(res: Response, message: string, statusCode?: number): Response;
    static validationError(res: Response, errors: ValidationError[]): Response;
    static unauthorized(res: Response, message?: string): Response;
    static forbidden(res: Response, message?: string): Response;
    static notFound(res: Response, message?: string): Response;
    static internalError(res: Response, message?: string): Response;
}
//# sourceMappingURL=response.d.ts.map