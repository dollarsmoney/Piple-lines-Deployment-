import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { ZodError, type ZodTypeAny } from 'zod';
import { AppError, UnauthorizedError, ValidationError, fail, isAppError } from '@ecom/shared';
import type { Logger } from './logger.js';

declare module 'express-serve-static-core' {
  interface Request {
    requestId?: string;
    userId?: string;
    userEmail?: string;
  }
}

/** Express 4 does not catch rejected promises — this makes async routes safe. */
export function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
): RequestHandler {
  return (req, res, next) => {
    handler(req, res, next).catch(next);
  };
}

/** Propagates an inbound x-request-id (set by the gateway) or mints a new one. */
export const requestId: RequestHandler = (req, res, next) => {
  const incoming = req.header('x-request-id');
  const id = incoming && incoming.length <= 64 ? incoming : randomUUID();

  req.requestId = id;
  res.setHeader('x-request-id', id);
  next();
};

type ValidationTarget = 'body' | 'query' | 'params';

/**
 * Validates and *replaces* the given request segment with the parsed result, so
 * handlers downstream always see coerced, trimmed, defaulted values.
 */
export function validate(schema: ZodTypeAny, target: ValidationTarget = 'body'): RequestHandler {
  return (req, _res, next) => {
    const result = schema.safeParse(req[target]);

    if (!result.success) {
      next(new ValidationError('Request validation failed', formatZodIssues(result.error)));
      return;
    }

    // req.query is a getter in Express 4, so assign through defineProperty.
    Object.defineProperty(req, target, { value: result.data, writable: true, configurable: true });
    next();
  };
}

export function formatZodIssues(error: ZodError): { path: string; message: string }[] {
  return error.issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
  }));
}

/**
 * Trusts the x-user-id header — safe only because the gateway strips any
 * client-supplied x-user-* headers before proxying, and these services are not
 * published outside the compose network.
 */
export const requireUser: RequestHandler = (req, _res, next) => {
  const userId = req.header('x-user-id');

  if (!userId) {
    next(new UnauthorizedError('Authentication required'));
    return;
  }

  req.userId = userId;
  req.userEmail = req.header('x-user-email') ?? undefined;
  next();
};

/**
 * Reads a route param. Express types params as possibly-undefined under
 * noUncheckedIndexedAccess even though a matched route always supplies them,
 * so this narrows in one place instead of a non-null assertion per handler.
 */
export function param(req: Request, name: string): string {
  const value = req.params[name];

  if (typeof value !== 'string' || value.length === 0) {
    throw new ValidationError(`Missing route parameter "${name}"`);
  }

  return value;
}

export function notFoundHandler(): RequestHandler {
  return (req, res) => {
    res.status(404).json(fail('NOT_FOUND', `Route ${req.method} ${req.path} does not exist`));
  };
}

export function errorHandler(logger: Logger) {
  return (err: unknown, req: Request, res: Response, _next: NextFunction): void => {
    // A ZodError can still surface from manual parses inside a handler.
    const normalised: AppError = isAppError(err)
      ? err
      : err instanceof ZodError
        ? new ValidationError('Request validation failed', formatZodIssues(err))
        : new AppError(
            err instanceof Error ? err.message : 'Unexpected error',
            500,
            'INTERNAL_ERROR'
          );

    if (normalised.status >= 500) {
      logger.error({ err, requestId: req.requestId, path: req.path }, 'Request failed');
    } else {
      logger.warn(
        { code: normalised.code, requestId: req.requestId, path: req.path },
        normalised.message
      );
    }

    // Never leak an internal stack/message to the client.
    const message =
      normalised.status >= 500 ? 'Something went wrong on our end' : normalised.message;

    res.status(normalised.status).json(fail(normalised.code, message, normalised.details));
  };
}
