import { Request, Response, NextFunction } from 'express';
import logger from './logger';

export class AppError extends Error {
    public statusCode: number;
    public isOperational: boolean;

    constructor(message: string, statusCode: number) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;

        Error.captureStackTrace(this, this.constructor);
    }
}

export const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

export const globalErrorHandler = (
    err: Error,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    let error = { ...err };
    error.message = err.message;

    logger.error('Error occurred:', {
        error: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent')
    });

    // Mongoose bad ObjectId
    if (err.name === 'CastError') {
        const message = 'Resource not found';
        error = new AppError(message, 404);
    }

    // Mongoose duplicate key
    if ((err as any).code === 11000) {
        const message = 'Duplicate field value entered';
        error = new AppError(message, 400);
    }

    // Mongoose validation error
    if (err.name === 'ValidationError') {
        const message = Object.values((err as any).errors).map((val: any) => val.message);
        error = new AppError(message.join(', '), 400);
    }

    res.status((error as AppError).statusCode || 500).json({
        success: false,
        error: error.message || 'Server Error'
    });
};

export const notFound = (req: Request, res: Response, next: NextFunction) => {
    const error = new AppError(`Not found - ${req.originalUrl}`, 404);
    next(error);
};