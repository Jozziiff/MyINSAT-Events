/**
 * Authentication Constants
 * 
 * Centralized configuration for auth-related settings
 */

/**
 * Public API endpoints that don't require authentication
 * These endpoints will skip token attachment and refresh attempts
 */
export const PUBLIC_ENDPOINTS = [
  '/auth/login',
  '/auth/register',
  '/auth/refresh',
  '/auth/verify-email',
  '/auth/forgot-password',
  '/auth/reset-password',
] as const;

/**
 * Check if a URL matches any public endpoint
 */
export function isPublicEndpoint(url: string): boolean {
  return PUBLIC_ENDPOINTS.some(endpoint => {
    try {
      const parsedUrl = new URL(url, window.location.origin);
      return parsedUrl.pathname === endpoint || parsedUrl.pathname.endsWith(endpoint);
    } catch {
      // Fallback for relative URLs
      return url === endpoint || url.endsWith(endpoint);
    }
  });
}
