import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

export function validateBody(schema: ZodSchema<any>) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err: any) {
      if (err instanceof ZodError) {
        const issuesSummary = err.issues.map((e) => `${e.path.join('.') || 'body'}: ${e.message}`).join('; ');
        console.warn(`[Validation Middleware] Body validation failed on ${req.method} ${req.originalUrl}:`, issuesSummary);
        return res.status(400).json({
          ok: false,
          error: 'validation_error',
          message: `Dữ liệu không hợp lệ: ${issuesSummary}`,
          errors: err.issues.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
      }
      return res.status(400).json({
        ok: false,
        error: 'invalid_request',
        message: 'Request body validation failed',
      });
    }
  };
}

export function validateQuery(schema: ZodSchema<any>) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.query = schema.parse(req.query);
      next();
    } catch (err: any) {
      if (err instanceof ZodError) {
        const issuesSummary = err.issues.map((e) => `${e.path.join('.') || 'query'}: ${e.message}`).join('; ');
        console.warn(`[Validation Middleware] Query validation failed on ${req.method} ${req.originalUrl}:`, issuesSummary);
        return res.status(400).json({
          ok: false,
          error: 'validation_error',
          message: `Tham số truy vấn không hợp lệ: ${issuesSummary}`,
          errors: err.issues.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
      }
      return res.status(400).json({
        ok: false,
        error: 'invalid_request',
        message: 'Request query parameters validation failed',
      });
    }
  };
}
