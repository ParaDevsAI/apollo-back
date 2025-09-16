import { Request } from 'express';
import { JwtPayload } from './auth.js';
export interface AuthenticatedRequest extends Request {
    user?: JwtPayload;
}
export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}
//# sourceMappingURL=request.d.ts.map