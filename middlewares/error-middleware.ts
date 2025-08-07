import { Request, Response, NextFunction } from 'express';
import { TAppError, is_operational_error } from '../utils/throw-error';

export const error_middleware = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Log error for debugging
  console.error('Error:', {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString(),
  });

  // Handle operational errors (expected errors)
  if (is_operational_error(error)) {
    const app_error = error instanceof TAppError ? error : new TAppError(error.message);
    res.status(app_error.status_code).json({
      message: app_error.message,
      status_code: app_error.status_code,
    });
    return;
  }

  // Handle unexpected errors
  res.status(500).json({
    message: 'Internal server error',
    status_code: 500,
  });
};

export const not_found_middleware = (req: Request, res: Response): void => {
  res.status(404).json({
    message: `Route ${req.originalUrl} not found`,
    status_code: 404,
  });
}; 