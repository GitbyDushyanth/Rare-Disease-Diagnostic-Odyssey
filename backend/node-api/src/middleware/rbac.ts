import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, UserRole } from '../types';

/**
 * requireRole — Factory that returns a middleware guarding by role(s)
 *
 * Usage:
 *   router.get('/admin', requireAuth, requireRole('admin'), handler)
 *   router.get('/staff', requireAuth, requireRole(['clinician', 'admin']), handler)
 */
export function requireRole(allowed: UserRole | UserRole[]) {
  const roles = Array.isArray(allowed) ? allowed : [allowed];

  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    if (!roles.includes(req.user.role as UserRole)) {
      res.status(403).json({
        success: false,
        error: `Access denied. Required role(s): ${roles.join(', ')}. Your role: ${req.user.role}`,
      });
      return;
    }

    next();
  };
}

/**
 * requireSelfOrRole — Allows users to access their own resources or elevate via role
 * Expects :userId param or :patientId param in the route
 */
export function requireSelfOrRole(allowed: UserRole | UserRole[]) {
  const roles = Array.isArray(allowed) ? allowed : [allowed];

  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const resourceUserId = req.params.userId || req.params.id;
    const isSelf = resourceUserId && resourceUserId === req.user.sub;
    const hasRole = roles.includes(req.user.role as UserRole);

    if (isSelf || hasRole) {
      next();
    } else {
      res.status(403).json({
        success: false,
        error: 'Access denied. You can only access your own resources.',
      });
    }
  };
}
