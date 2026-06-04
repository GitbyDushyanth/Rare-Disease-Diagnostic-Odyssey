import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import logger from '../lib/logger';

// ── Global Error Handler ──────────────────────────────────────────────────────
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  logger.error('Unhandled error', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  if (err instanceof ZodError) {
    res.status(422).json({
      success: false,
      error: 'Validation failed',
      details: err.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    });
    return;
  }

  if ((err as NodeJS.ErrnoException).code === 'LIMIT_FILE_SIZE') {
    res.status(413).json({
      success: false,
      error: `File too large. Maximum size is ${process.env.MAX_FILE_SIZE_MB || 250}MB`,
    });
    return;
  }

  const statusCode = (err as { statusCode?: number }).statusCode || 500;
  const message =
    process.env.NODE_ENV === 'production' && statusCode === 500
      ? 'Internal server error'
      : err.message;

  res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}

// ── Not Found Handler ─────────────────────────────────────────────────────────
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: `Route not found: ${req.method} ${req.path}`,
  });
}

// ── Zod Validation Wrapper ────────────────────────────────────────────────────
export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      next(err);
    }
  };
}

export function validateQuery<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.query = schema.parse(req.query) as typeof req.query;
      next();
    } catch (err) {
      next(err);
    }
  };
}

// ── App Error Class ───────────────────────────────────────────────────────────
export class AppError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'AppError';
  }

  static badRequest(msg: string) { return new AppError(msg, 400); }
  static unauthorized(msg = 'Unauthorized') { return new AppError(msg, 401); }
  static forbidden(msg = 'Forbidden') { return new AppError(msg, 403); }
  static notFound(msg: string) { return new AppError(msg, 404); }
  static conflict(msg: string) { return new AppError(msg, 409); }
  static unprocessable(msg: string) { return new AppError(msg, 422); }
  static internal(msg = 'Internal server error') { return new AppError(msg, 500); }
}
