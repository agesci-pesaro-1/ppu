export type ErrorCode =
  | 'unauthenticated'
  | 'domain_not_allowed'
  | 'excluded'
  | 'not_beta_tester'
  | 'forbidden'
  | 'not_found'
  | 'bad_request'
  | 'configuration';

const HTTP_STATUS: Record<ErrorCode, number> = {
  unauthenticated: 401,
  domain_not_allowed: 403,
  excluded: 403,
  not_beta_tester: 403,
  forbidden: 403,
  not_found: 404,
  bad_request: 400,
  configuration: 500,
};

/**
 * Domain error. The message is shown to the user, so it is written in Italian
 * like the rest of the UI; the code is for clients.
 */
export class AppError extends Error {
  readonly code: ErrorCode;
  constructor(code: ErrorCode, message: string) {
    super(message);
    this.code = code;
  }
  get httpStatus(): number {
    return HTTP_STATUS[this.code];
  }
}
