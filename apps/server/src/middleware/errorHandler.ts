import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { SERVER_CONFIG } from '../config/constants.js';

export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number = 400) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.isOperational = true;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  if (res.headersSent) {
    return next(err);
  }

  let statusCode = err.statusCode || err.status || 500;
  let message = err.message || 'Internal server error';

  // Handle Multer upload errors
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      statusCode = 413;
      message = `Uploaded file exceeds maximum allowed size of ${SERVER_CONFIG.MAX_UPLOAD_SIZE_BYTES / (1024 * 1024)}MB.`;
    } else if (err.code === 'LIMIT_FILE_COUNT') {
      statusCode = 400;
      message = `Too many files uploaded. Maximum allowed count is ${SERVER_CONFIG.MAX_FILES_COUNT} files.`;
    } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      statusCode = 400;
      message = `Unexpected upload field "${err.field}".`;
    } else {
      statusCode = 400;
      message = `Upload error: ${err.message}`;
    }
  }

  // Handle known client/validation errors that were thrown as generic errors
  if (
    message.includes('No files were uploaded') ||
    message.includes('No HTML files') ||
    message.includes('Archive exceeds') ||
    message.includes('Invalid or unsupported zip format') ||
    message.includes('Invalid ZIP') ||
    message.includes('Access denied')
  ) {
    if (statusCode === 500) {
      statusCode = message.includes('Access denied') ? 403 : 400;
    }
  }

  const timestamp = new Date().toISOString();
  console.error(`[API Error ${timestamp}] [${req.method} ${req.originalUrl}] Status ${statusCode}: ${message}`);
  if (statusCode >= 500 && err.stack) {
    console.error(err.stack);
  }

  res.status(statusCode).json({
    error: message,
    status: statusCode,
  });
};
