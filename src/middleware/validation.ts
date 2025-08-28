import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

// Generic validation middleware factory
export const validateBody = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    console.log('🔍 Validating body:', req.body);
    try {
      const validatedData = schema.parse(req.body);
      console.log('✅ Validation passed');
      req.body = validatedData;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.log('❌ Validation failed:', error.issues);
        const errors = error.issues.map((err: any) => ({
          field: err.path.join('.'),
          message: err.message
        }));
        
        // Store validation errors in flash-like locals
        res.locals.validationErrors = errors;
        res.locals.oldInput = req.body;
        
        // Redirect back to the form with errors
        const referer = req.get('Referer') || '/';
        console.log('📍 Redirecting back to:', referer);
        return res.redirect(referer);
      }
      console.log('❌ Validation error (not Zod):', error);
      next(error);
    }
  };
};

// Flash message middleware (simple implementation without sessions)
export const flashMessages = (req: Request, res: Response, next: NextFunction) => {
  // This is a simplified flash implementation
  // In production, you'd want to use express-session with connect-flash
  res.locals.flash = {
    success: req.query.success || null,
    error: req.query.error || null,
  };
  
  // Add flash method to request
  req.flash = (type: string, message: string) => {
    // For now, we'll just store it for redirect
    // This is a simple implementation - in production use express-session
    const encodedMessage = encodeURIComponent(message);
    if (type === 'success') {
      res.locals.redirectQuery = `?success=${encodedMessage}`;
    } else if (type === 'error') {
      res.locals.redirectQuery = `?error=${encodedMessage}`;
    }
  };
  
  next();
};

// CSRF-like protection for forms (simplified)
export const validateReferer = (req: Request, res: Response, next: NextFunction) => {
  // Skip referer validation in development
  if (process.env.NODE_ENV !== 'production') {
    console.log('⚠️ Skipping referer validation in development');
    return next();
  }
  
  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'DELETE') {
    console.log('🔒 Checking referer for:', req.method, req.path);
    const referer = req.get('Referer');
    const origin = req.get('Origin');
    const host = req.get('Host');
    
    console.log('🔍 Headers:', { referer, origin, host });
    
    if (!referer && !origin) {
      console.log('❌ No referer or origin');
      return res.status(403).render('pages/error', { 
        title: 'Forbidden',
        error: { message: 'Invalid request origin' },
        hx: false 
      });
    }
    
    const allowedOrigins = [
      `http://${host}`,
      `https://${host}`,
      process.env.DOMAIN
    ].filter(Boolean);
    
    let requestOrigin = origin;
    
    // Handle null origin case (common with direct form submissions)
    if (!requestOrigin && referer) {
      try {
        requestOrigin = new URL(referer).origin;
      } catch (e) {
        console.log('❌ Invalid referer URL:', referer);
        return res.status(403).render('pages/error', { 
          title: 'Forbidden',
          error: { message: 'Invalid request origin' },
          hx: false 
        });
      }
    }
    
    // If still no origin, check if host matches expected domain
    if (!requestOrigin) {
      const expectedHost = process.env.DOMAIN ? new URL(process.env.DOMAIN).host : host;
      if (host === expectedHost) {
        console.log('✅ Same-site request detected via host header');
        return next();
      }
    }
    
    console.log('🔍 Request origin:', requestOrigin);
    console.log('🔍 Allowed origins:', allowedOrigins);
    
    if (!requestOrigin || !allowedOrigins.includes(requestOrigin)) {
      console.log('❌ Origin not allowed');
      return res.status(403).render('pages/error', { 
        title: 'Forbidden',
        error: { message: 'Invalid request origin' },
        hx: false 
      });
    }
    
    console.log('✅ Referer validation passed');
  }
  
  next();
};