import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger.js';
import { error } from '../utils/response.js';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  logger.error(err.stack);

  if (err.name === 'ZodError') {
    logger.error('Zod Validation Error:', JSON.stringify(err.errors, null, 2));
    return error(res, 'Validation Error', 400, err.errors);
  }

  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';

  return error(res, message, status);
};
