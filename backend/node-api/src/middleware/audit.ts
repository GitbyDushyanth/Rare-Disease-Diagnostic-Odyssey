import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, AuditContext } from '../types';
import prisma from '../lib/prisma';
import logger from '../lib/logger';

/**
 * HIPAA-compliant audit logging middleware.
 * Automatically logs all mutating requests (POST, PUT, PATCH, DELETE).
 * Read (GET) requests are not logged by default unless sensitive.
 */
export function auditLog(options?: { logReads?: boolean; resource?: string }) {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const shouldLog =
      options?.logReads ||
      ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);

    if (!shouldLog) {
      next();
      return;
    }

    // Intercept response to capture status
    const originalJson = res.json.bind(res);
    let responseBody: unknown;

    res.json = (body: unknown) => {
      responseBody = body;
      return originalJson(body);
    };

    res.on('finish', async () => {
      try {
        const context: AuditContext = {
          userId: req.user?.sub,
          action: `${req.method} ${req.route?.path || req.path}`,
          resource: options?.resource || extractResource(req.path),
          resourceId: req.params?.id,
          details: {
            method: req.method,
            path: req.path,
            params: req.params,
            query: req.query,
            statusCode: res.statusCode,
          },
          ipAddress: (req.headers['x-forwarded-for'] as string) || req.ip,
          userAgent: req.headers['user-agent'],
          result: res.statusCode < 400 ? 'success' : 'failure',
        };

        await prisma.auditLog.create({
          data: {
            userId: context.userId,
            action: context.action,
            resource: context.resource,
            resourceId: context.resourceId,
            details: JSON.stringify(context.details),
            ipAddress: context.ipAddress,
            userAgent: context.userAgent,
            result: context.result || 'success',
          },
        });
      } catch (err) {
        // Audit log failure must never break the request
        logger.error('Audit log write failed', { error: err });
      }
    });

    next();
  };
}

/**
 * writeAuditLog — Manual audit entry writer for use in route handlers
 */
export async function writeAuditLog(context: AuditContext): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: context.userId,
        action: context.action,
        resource: context.resource,
        resourceId: context.resourceId,
        details: context.details ? JSON.stringify(context.details) : undefined,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        result: context.result || 'success',
      },
    });
  } catch (err) {
    logger.error('Manual audit log write failed', { error: err });
  }
}

function extractResource(path: string): string {
  // e.g. /api/v1/patients/abc-123 → patients
  const parts = path.split('/').filter(Boolean);
  // Skip 'api', 'v1' prefix segments
  const idx = parts.findIndex((p) => !['api', 'v1', 'v2'].includes(p));
  return idx >= 0 ? parts[idx] : path;
}
