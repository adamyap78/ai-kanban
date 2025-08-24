import { Request, Response, NextFunction } from 'express';
import { authService, AuthUser } from '../services/auth.service';

// Extend Express Request type to include user and flash
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      flash: (type: string, message: string) => void;
    }
  }
}

// Middleware to extract user from JWT token
export const extractUser = async (req: Request, res: Response, next: NextFunction) => {
  const token = req.cookies?.authToken;
  
  if (token) {
    const user = await authService.verifyToken(token);
    if (user) {
      req.user = user;
      res.locals.user = user;
    }
  }
  
  next();
};

// Middleware to require authentication
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.redirect('/auth/login?redirect=' + encodeURIComponent(req.originalUrl));
  }
  next();
};

// Middleware to redirect authenticated users away from auth pages
export const redirectIfAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  if (req.user) {
    const redirectTo = req.query.redirect as string || '/dashboard';
    return res.redirect(redirectTo);
  }
  next();
};

// Middleware to require specific organization role
export const requireOrganizationRole = (minRole: 'owner' | 'admin' | 'member' | 'viewer') => {
  const roleHierarchy = {
    'viewer': 0,
    'member': 1,
    'admin': 2,
    'owner': 3
  };

  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.redirect('/auth/login');
    }

    const orgSlug = req.params.orgSlug;
    if (!orgSlug) {
      return res.status(400).render('pages/error', { 
        title: 'Bad Request',
        error: { message: 'Organization not specified' },
        hx: false 
      });
    }

    const userOrg = req.user.organizations?.find(org => org.slug === orgSlug);
    if (!userOrg) {
      return res.status(403).render('pages/error', { 
        title: 'Access Denied',
        error: { message: 'You do not have access to this organization' },
        hx: false 
      });
    }

    const userRoleLevel = roleHierarchy[userOrg.role];
    const requiredRoleLevel = roleHierarchy[minRole];

    if (userRoleLevel < requiredRoleLevel) {
      return res.status(403).render('pages/error', { 
        title: 'Insufficient Permissions',
        error: { message: `You need ${minRole} permissions to access this resource` },
        hx: false 
      });
    }

    // Add organization info to request
    req.organization = userOrg;
    res.locals.organization = userOrg;

    next();
  };
};

// Extend Express Request type for organization
declare global {
  namespace Express {
    interface Request {
      organization?: {
        id: string;
        name: string;
        slug: string;
        role: 'owner' | 'admin' | 'member' | 'viewer';
      };
    }
  }
}