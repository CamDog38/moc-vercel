/**
 * Helper functions for handling public context in API requests
 */

import { NextApiRequest } from 'next';

/**
 * Sets the public context header on a request
 * This is used to indicate that a request is coming from a public form
 * and should bypass authentication checks
 */
export function setPublicContext(req: NextApiRequest): void {
  req.headers['x-public-context'] = 'true';
}

/**
 * Checks if a request has the public context header set
 */
export function isPublicContext(req: NextApiRequest): boolean {
  return req.headers['x-public-context'] === 'true';
}

/**
 * Checks if a request is coming from a public form based on the referer
 */
export function isPublicFormReferer(req: NextApiRequest): boolean {
  const referer = req.headers.referer || '';
  return referer.includes('/forms/') || referer.includes('/leads/');
}

/**
 * Determines if a request should be treated as public context
 * based on headers and referer
 */
export function shouldTreatAsPublicContext(req: NextApiRequest): boolean {
  return isPublicContext(req) || isPublicFormReferer(req);
}