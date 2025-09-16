export class ResponseHelper {
    static success(res, data, message) {
        const response = {
            success: true,
            data,
            message
        };
        return res.status(200).json(response);
    }
    static error(res, message, statusCode = 400) {
        const response = {
            success: false,
            error: message
        };
        return res.status(statusCode).json(response);
    }
    static validationError(res, errors) {
        const errorMessages = errors.map(error => {
            if (error.type === 'field') {
                return `${error.path}: ${error.msg}`;
            }
            return error.msg;
        }).join(', ');
        return this.error(res, `Dados inválidos: ${errorMessages}`, 422);
    }
    static unauthorized(res, message = 'Unauthorized') {
        return this.error(res, message, 401);
    }
    static forbidden(res, message = 'Forbidden') {
        return this.error(res, message, 403);
    }
    static notFound(res, message = 'Not found') {
        return this.error(res, message, 404);
    }
    static internalError(res, message = 'Internal server error') {
        return this.error(res, message, 500);
    }
}
//# sourceMappingURL=response.js.map