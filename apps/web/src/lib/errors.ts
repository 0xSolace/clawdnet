/**
 * Standardized Error Handling for ClawdNet API
 * 
 * Error response format:
 * {
 *   error: string,      // Human-readable error message
 *   code: string,       // Machine-readable error code
 *   message: string,    // Detailed explanation with fix hints
 *   details?: object    // Optional structured data
 * }
 */

import { NextResponse } from 'next/server';

// ─────────────────────────────────────────────────────────────────────────────
// Error Codes
// ─────────────────────────────────────────────────────────────────────────────

export const ErrorCode = {
  // Auth errors (401, 403)
  UNAUTHORIZED: 'UNAUTHORIZED',
  INVALID_API_KEY: 'INVALID_API_KEY',
  EXPIRED_TOKEN: 'EXPIRED_TOKEN',
  FORBIDDEN: 'FORBIDDEN',
  
  // Rate limiting (429)
  RATE_LIMITED: 'RATE_LIMITED',
  
  // Resource errors (404, 409)
  NOT_FOUND: 'NOT_FOUND',
  AGENT_NOT_FOUND: 'AGENT_NOT_FOUND',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  TASK_NOT_FOUND: 'TASK_NOT_FOUND',
  PAYMENT_NOT_FOUND: 'PAYMENT_NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  HANDLE_TAKEN: 'HANDLE_TAKEN',
  
  // Validation errors (400)
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_HANDLE: 'INVALID_HANDLE',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED: 'MISSING_REQUIRED',
  INVALID_AMOUNT: 'INVALID_AMOUNT',
  
  // Payment errors (400, 402)
  PAYMENT_REQUIRED: 'PAYMENT_REQUIRED',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  PAYMENT_NOT_SETUP: 'PAYMENT_NOT_SETUP',
  INSUFFICIENT_FUNDS: 'INSUFFICIENT_FUNDS',
  
  // Server errors (500, 503)
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
} as const;

export type ErrorCodeType = typeof ErrorCode[keyof typeof ErrorCode];

// ─────────────────────────────────────────────────────────────────────────────
// HTTP Status Mappings
// ─────────────────────────────────────────────────────────────────────────────

const statusMap: Record<ErrorCodeType, number> = {
  // 400 Bad Request
  [ErrorCode.VALIDATION_ERROR]: 400,
  [ErrorCode.INVALID_HANDLE]: 400,
  [ErrorCode.INVALID_INPUT]: 400,
  [ErrorCode.MISSING_REQUIRED]: 400,
  [ErrorCode.INVALID_AMOUNT]: 400,
  [ErrorCode.PAYMENT_NOT_SETUP]: 400,
  
  // 401 Unauthorized
  [ErrorCode.UNAUTHORIZED]: 401,
  [ErrorCode.INVALID_API_KEY]: 401,
  [ErrorCode.EXPIRED_TOKEN]: 401,
  
  // 402 Payment Required
  [ErrorCode.PAYMENT_REQUIRED]: 402,
  [ErrorCode.PAYMENT_FAILED]: 402,
  [ErrorCode.INSUFFICIENT_FUNDS]: 402,
  
  // 403 Forbidden
  [ErrorCode.FORBIDDEN]: 403,
  
  // 404 Not Found
  [ErrorCode.NOT_FOUND]: 404,
  [ErrorCode.AGENT_NOT_FOUND]: 404,
  [ErrorCode.USER_NOT_FOUND]: 404,
  [ErrorCode.TASK_NOT_FOUND]: 404,
  [ErrorCode.PAYMENT_NOT_FOUND]: 404,
  
  // 409 Conflict
  [ErrorCode.ALREADY_EXISTS]: 409,
  [ErrorCode.HANDLE_TAKEN]: 409,
  
  // 429 Too Many Requests
  [ErrorCode.RATE_LIMITED]: 429,
  
  // 500 Internal Server Error
  [ErrorCode.INTERNAL_ERROR]: 500,
  [ErrorCode.DATABASE_ERROR]: 500,
  [ErrorCode.EXTERNAL_SERVICE_ERROR]: 500,
  
  // 503 Service Unavailable
  [ErrorCode.SERVICE_UNAVAILABLE]: 503,
};

// ─────────────────────────────────────────────────────────────────────────────
// Error Response Interface
// ─────────────────────────────────────────────────────────────────────────────

export interface ApiErrorResponse {
  error: string;
  code: ErrorCodeType;
  message: string;
  details?: Record<string, unknown>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Base Error Class
// ─────────────────────────────────────────────────────────────────────────────

export class ApiError extends Error {
  public readonly code: ErrorCodeType;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown>;

  constructor(
    code: ErrorCodeType,
    message: string,
    details?: Record<string, unknown>,
    statusCode?: number
  ) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.statusCode = statusCode ?? statusMap[code] ?? 500;
    this.details = details;
  }

  toResponse(headers?: HeadersInit): NextResponse<ApiErrorResponse> {
    return NextResponse.json(
      {
        error: this.getShortError(),
        code: this.code,
        message: this.message,
        ...(this.details && { details: this.details }),
      },
      { status: this.statusCode, headers }
    );
  }

  private getShortError(): string {
    // Map codes to short human-readable errors
    const shortErrors: Record<ErrorCodeType, string> = {
      [ErrorCode.UNAUTHORIZED]: 'Unauthorized',
      [ErrorCode.INVALID_API_KEY]: 'Invalid API key',
      [ErrorCode.EXPIRED_TOKEN]: 'Token expired',
      [ErrorCode.FORBIDDEN]: 'Forbidden',
      [ErrorCode.RATE_LIMITED]: 'Rate limit exceeded',
      [ErrorCode.NOT_FOUND]: 'Not found',
      [ErrorCode.AGENT_NOT_FOUND]: 'Agent not found',
      [ErrorCode.USER_NOT_FOUND]: 'User not found',
      [ErrorCode.TASK_NOT_FOUND]: 'Task not found',
      [ErrorCode.PAYMENT_NOT_FOUND]: 'Payment not found',
      [ErrorCode.ALREADY_EXISTS]: 'Already exists',
      [ErrorCode.HANDLE_TAKEN]: 'Handle already taken',
      [ErrorCode.VALIDATION_ERROR]: 'Validation error',
      [ErrorCode.INVALID_HANDLE]: 'Invalid handle',
      [ErrorCode.INVALID_INPUT]: 'Invalid input',
      [ErrorCode.MISSING_REQUIRED]: 'Missing required fields',
      [ErrorCode.INVALID_AMOUNT]: 'Invalid amount',
      [ErrorCode.PAYMENT_REQUIRED]: 'Payment required',
      [ErrorCode.PAYMENT_FAILED]: 'Payment failed',
      [ErrorCode.PAYMENT_NOT_SETUP]: 'Payments not configured',
      [ErrorCode.INSUFFICIENT_FUNDS]: 'Insufficient funds',
      [ErrorCode.INTERNAL_ERROR]: 'Internal server error',
      [ErrorCode.DATABASE_ERROR]: 'Database error',
      [ErrorCode.EXTERNAL_SERVICE_ERROR]: 'External service error',
      [ErrorCode.SERVICE_UNAVAILABLE]: 'Service unavailable',
    };
    return shortErrors[this.code] || 'Error';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Specialized Error Classes
// ─────────────────────────────────────────────────────────────────────────────

export class ValidationError extends ApiError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(ErrorCode.VALIDATION_ERROR, message, details);
    this.name = 'ValidationError';
  }
}

export class AuthError extends ApiError {
  constructor(
    message: string = 'Authentication required. Provide a valid API key in the Authorization header.',
    code: ErrorCodeType = ErrorCode.UNAUTHORIZED
  ) {
    super(code, message);
    this.name = 'AuthError';
  }
}

export class NotFoundError extends ApiError {
  constructor(
    resource: string = 'Resource',
    identifier?: string,
    code: ErrorCodeType = ErrorCode.NOT_FOUND
  ) {
    const message = identifier
      ? `${resource} '${identifier}' not found. Check the identifier and try again.`
      : `${resource} not found.`;
    super(code, message);
    this.name = 'NotFoundError';
  }
}

export class RateLimitError extends ApiError {
  constructor(retryAfter: number) {
    super(
      ErrorCode.RATE_LIMITED,
      `Too many requests. Please wait ${retryAfter} seconds before trying again.`,
      { retryAfter }
    );
    this.name = 'RateLimitError';
  }
}

export class PaymentError extends ApiError {
  constructor(
    message: string,
    code: ErrorCodeType = ErrorCode.PAYMENT_FAILED,
    details?: Record<string, unknown>
  ) {
    super(code, message, details);
    this.name = 'PaymentError';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a standardized error response
 */
export function errorResponse(
  code: ErrorCodeType,
  message: string,
  details?: Record<string, unknown>,
  headers?: HeadersInit
): NextResponse<ApiErrorResponse> {
  return new ApiError(code, message, details).toResponse(headers);
}

/**
 * Create common error responses with helpful messages
 */
export const errors = {
  unauthorized: (hint?: string) =>
    errorResponse(
      ErrorCode.UNAUTHORIZED,
      hint || 'Authentication required. Include your API key in the Authorization header as: Bearer clawdnet_xxx'
    ),

  invalidApiKey: () =>
    errorResponse(
      ErrorCode.INVALID_API_KEY,
      'Invalid API key. Ensure your key starts with "clawdnet_" and matches the agent.'
    ),

  forbidden: (reason?: string) =>
    errorResponse(
      ErrorCode.FORBIDDEN,
      reason || 'You do not have permission to access this resource.'
    ),

  rateLimited: (retryAfter: number) =>
    errorResponse(
      ErrorCode.RATE_LIMITED,
      `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
      { retryAfter },
      { 'Retry-After': retryAfter.toString() }
    ),

  notFound: (resource: string, identifier?: string) =>
    errorResponse(
      ErrorCode.NOT_FOUND,
      identifier
        ? `${resource} '${identifier}' not found. Verify the identifier is correct.`
        : `${resource} not found.`
    ),

  agentNotFound: (handle?: string) =>
    errorResponse(
      ErrorCode.AGENT_NOT_FOUND,
      handle
        ? `Agent '@${handle}' not found. Check the handle spelling or register at clawdnet.xyz/register`
        : 'Agent not found.'
    ),

  handleTaken: (handle: string) =>
    errorResponse(
      ErrorCode.HANDLE_TAKEN,
      `Handle '@${handle}' is already registered. Try a different handle or claim it at clawdnet.xyz/claim if you own it.`
    ),

  invalidHandle: (reason: string) =>
    errorResponse(
      ErrorCode.INVALID_HANDLE,
      `Invalid handle: ${reason}. Handles must be 3-32 characters, alphanumeric with underscores only.`
    ),

  missingRequired: (fields: string[]) =>
    errorResponse(
      ErrorCode.MISSING_REQUIRED,
      `Missing required fields: ${fields.join(', ')}. Please provide all required fields.`,
      { requiredFields: fields }
    ),

  invalidAmount: (reason?: string) =>
    errorResponse(
      ErrorCode.INVALID_AMOUNT,
      reason || 'Invalid amount. Amount must be a positive number.'
    ),

  paymentNotSetup: (agentHandle?: string) =>
    errorResponse(
      ErrorCode.PAYMENT_NOT_SETUP,
      agentHandle
        ? `Agent '@${agentHandle}' has not configured payments yet. Contact the agent owner or try again later.`
        : 'Payments not configured for this agent.'
    ),

  internalError: (context?: string) =>
    errorResponse(
      ErrorCode.INTERNAL_ERROR,
      context
        ? `An unexpected error occurred while ${context}. Please try again or contact support if the issue persists.`
        : 'An unexpected error occurred. Please try again.'
    ),

  databaseError: () =>
    errorResponse(
      ErrorCode.DATABASE_ERROR,
      'A database error occurred. Please try again in a moment.'
    ),
};

/**
 * Wrap an async handler with standardized error handling
 */
export function withErrorHandling<T>(
  handler: () => Promise<NextResponse<T>>,
  context?: string
): Promise<NextResponse<T | ApiErrorResponse>> {
  return handler().catch((error: unknown) => {
    // Already an ApiError - return its response
    if (error instanceof ApiError) {
      return error.toResponse();
    }

    // Log unexpected errors
    console.error(`Error${context ? ` in ${context}` : ''}:`, error);

    // Return generic error
    return errors.internalError(context);
  });
}

/**
 * Type guard to check if an error is an ApiError
 */
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}
